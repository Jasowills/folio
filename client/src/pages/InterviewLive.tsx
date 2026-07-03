import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  IconPlayerPause, IconPlayerPlay, IconSettings, IconPlayerStop,
  IconMicrophone, IconMicrophoneOff, IconX, IconCode,
} from '@tabler/icons-react'
import { useSession, useEndSession } from '../lib/queries'
import { useInterviewSocket } from '../hooks/useInterviewSocket'
import { useProctoring } from '../hooks/useProctoring'
import { useCameraProctoring } from '../hooks/useCameraProctoring'
import { showToast } from '../components/ui/toast'
import InterviewerAvatar from '../components/interview/InterviewerAvatar'
import AudioWaveform from '../components/interview/AudioWaveform'
import DebugPanel from '../components/interview/DebugPanel'

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'cpp', label: 'C++' },
]

const DEFAULT_CODE = `// Write your solution here
function solution(input) {
  // TODO: implement
  return input;
}
`

const PAUSE_MAX_DURATION = 120

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function InterviewLive() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data: session, isLoading } = useSession(sessionId)
  const endSession = useEndSession()

  const {
    isConnected, isRecording, transcripts, currentInterim,
    interviewerResponse, codeResult, isCodeRunning,
    error, isAvatarSpeaking, isThinking, isPaused, greetingDone, bargeInIndicator,
    aiResponseTime,
    audioStream, startMicrophone, stopMicrophone,
    pause: wsPause, resume: wsResume,
    endSession: wsEndSession, submitCode, sendProctoringEvent,
  } = useInterviewSocket(sessionId)

  const [opening, setOpening] = useState(true)
  const [closing, setClosing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [isEnding, setIsEnding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'video'>('audio')
  const [pausesUsed, setPausesUsed] = useState(0)
  const [pauseTimer, setPauseTimer] = useState(0)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const proctoringEnabled = true

  const [isCodingMode, setIsCodingMode] = useState(false)
  const [code, setCode] = useState(DEFAULT_CODE)
  const [codeLanguage, setCodeLanguage] = useState('javascript')
  const [showTestCases, setShowTestCases] = useState(false)

  const [selfViewStream, setSelfViewStream] = useState<MediaStream | null>(null)
  const selfViewRef = useRef<HTMLVideoElement>(null)
  const selfViewStreamRef = useRef<MediaStream | null>(null)
  const [displayedChars, setDisplayedChars] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const pauseTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const hasAutoResumedRef = useRef(false)
  const hasAutoOpenedRef = useRef(false)

  const persona = session?.interviewerPersona as {
    interviewerName?: string
    interviewerTitle?: string
  } | undefined

  const questionPlan = session?.questionPlan as Array<{
    primaryQuestion?: string
    phase?: string
    topic?: string
  }> | undefined

  const interviewerName = persona?.interviewerName || 'Interviewer'
  const interviewerTitle = persona?.interviewerTitle || session?.role || ''
  const totalQuestions = questionPlan?.length || 0
  const totalSeconds = (session?.plannedDuration || 30) * 60
  const progressPct = Math.min(100, (elapsed / totalSeconds) * 100)
  const currentQuestionIdx = interviewerResponse?.questionIndex ?? 0
  const qPerPhase = questionPlan?.[currentQuestionIdx]

  const pausesRemaining = Math.max(0, 2 - pausesUsed)

  const avatarState = isAvatarSpeaking ? 'speaking' : isThinking ? 'thinking' : isRecording ? 'listening' : 'idle'

  useProctoring({
    enabled: proctoringEnabled && isRecording,
    onEvent: sendProctoringEvent,
  })

  const { faceDetectorReady, numFaces } = useCameraProctoring({
    enabled: cameraEnabled && proctoringEnabled && isRecording,
    onEvent: sendProctoringEvent,
  })

  const proctoringStatus = !faceDetectorReady ? 'off' : numFaces > 0 ? 'good' : 'away'

  // Fullscreen request on mount
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  // Typewriter effect for AI response text
  useEffect(() => {
    if (!isAvatarSpeaking || !interviewerResponse?.text) return
    const text = interviewerResponse.text
    setDisplayedChars(0)
    const speed = 20
    const timer = setInterval(() => {
      setDisplayedChars(prev => {
        if (prev >= text.length) {
          clearInterval(timer)
          return text.length
        }
        return prev + 1
      })
    }, speed)
    return () => clearInterval(timer)
  }, [interviewerResponse?.text, isAvatarSpeaking])

  // Start mic + camera after AI greeting finishes
  useEffect(() => {
    if (!isConnected || !session || session.status !== 'in_progress') return
    if (!greetingDone) return
    startMicrophone()
    setCameraEnabled(true)
  }, [isConnected, session, greetingDone, startMicrophone])

  // Camera self-view
  useEffect(() => {
    if (!cameraEnabled) {
      if (selfViewStreamRef.current) {
        selfViewStreamRef.current.getTracks().forEach((t) => t.stop())
        selfViewStreamRef.current = null
        setSelfViewStream(null)
      }
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        selfViewStreamRef.current = stream
        setSelfViewStream(stream)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (selfViewStreamRef.current) {
        selfViewStreamRef.current.getTracks().forEach((t) => t.stop())
        selfViewStreamRef.current = null
      }
    }
  }, [cameraEnabled])

  // Sync camera stream to video element (renders after state update)
  useEffect(() => {
    if (selfViewRef.current && selfViewStream) {
      selfViewRef.current.srcObject = selfViewStream
    }
  }, [selfViewStream])

  // Opening sequence timeout
  useEffect(() => {
    if (!opening) return
    const t = setTimeout(() => setOpening(false), 3000)
    return () => clearTimeout(t)
  }, [opening])

  // Watch for coding phase in question plan
  useEffect(() => {
    if (!questionPlan || !isConnected) return
    if (qPerPhase?.phase === 'coding') {
      setIsCodingMode(true)
      hasAutoOpenedRef.current = true
    }
  }, [currentQuestionIdx, questionPlan, qPerPhase?.phase, isConnected])

  // Set closing state when session completes
  useEffect(() => {
    if (session?.status === 'completed') {
      setClosing(true)
    }
  }, [session?.status])

  // Navigate to results after delay once closing
  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => {
      navigate(`/interview/${sessionId}/results`, { replace: true })
    }, 6000)
    return () => clearTimeout(t)
  }, [closing, sessionId, navigate])

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording, isPaused])

  // Pause timer
  useEffect(() => {
    if (isPaused) {
      hasAutoResumedRef.current = false
      pauseTimerRef.current = setInterval(() => {
        setPauseTimer((t) => {
          if (t + 1 >= PAUSE_MAX_DURATION) {
            if (!hasAutoResumedRef.current) {
              hasAutoResumedRef.current = true
              wsResume()
            }
            return t + 1
          }
          return t + 1
        })
      }, 1000)
    } else {
      clearInterval(pauseTimerRef.current)
      setPauseTimer(0)
      hasAutoResumedRef.current = false
    }
    return () => clearInterval(pauseTimerRef.current)
  }, [isPaused, wsResume])

  // Stop all media streams on unmount
  useEffect(() => {
    return () => {
      stopMicrophone()
      if (selfViewStreamRef.current) {
        selfViewStreamRef.current.getTracks().forEach((t) => t.stop())
        setSelfViewStream(null)
      }
    }
  }, [stopMicrophone])

  // Stop all media on beforeunload (refresh, closing tab, back button)
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopMicrophone()
      if (selfViewStreamRef.current) {
        selfViewStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [stopMicrophone])

  // Routing
  useEffect(() => {
    if (!sessionId) navigate('/interview/new', { replace: true })
  }, [sessionId, navigate])

  // Code result display
  const handleCodeSubmit = useCallback(() => {
    submitCode(codeLanguage, code)
    showToast('info', 'Code submitted for execution')
  }, [submitCode, codeLanguage, code])

  const handleEnd = async () => {
    if (!sessionId || isEnding) return
    setIsEnding(true)
    setCameraEnabled(false)
    wsEndSession()
    try {
      await endSession.mutateAsync(sessionId)
      navigate(`/interview/${sessionId}/results`, { replace: true })
    } catch {
      showToast('error', 'Failed to end session')
      setIsEnding(false)
    }
  }

  const handlePause = () => {
    if (pausesUsed >= 2) {
      showToast('info', 'Maximum 2 pauses per session')
      return
    }
    wsPause()
    setPausesUsed((p) => p + 1)
  }

  const handleResume = () => {
    wsResume()
  }

  const handleEndClick = () => {
    handleEnd()
  }

  // Turn state determination
  const turnState = isAvatarSpeaking ? 'interviewer' : isThinking ? 'processing' : isRecording ? 'candidate' : 'idle'

  const interviewerCaption = isAvatarSpeaking && interviewerResponse
    ? interviewerResponse.text
    : ''

  const captionText = isAvatarSpeaking
    ? interviewerCaption.slice(0, displayedChars)
    : currentInterim || ''

  const captionParagraphs = captionText.split('\n').filter(Boolean)

  if (isLoading || !session) {
    return (
      <div className="h-screen bg-[#1C1C1A] flex items-center justify-center">
        <span className="font-display text-teal text-4xl animate-pulse">&amp;</span>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#1C1C1A] flex flex-col overflow-hidden select-none">

      {/* ── Opening overlay ── */}
      <AnimatePresence>
        {opening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 bg-[#1C1C1A] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <InterviewerAvatar
                  name={interviewerName}
                  title={interviewerTitle}
                  state="idle"
                  size="large"
                />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-sm text-white/40 font-body"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Preparing your interview...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Closing overlay ── */}
      <AnimatePresence>
        {closing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-50 bg-[#1C1C1A] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="font-display text-white text-2xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Interview complete.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-sm text-white/40"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Your results are being prepared.
              </motion.p>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ delay: 1.8, duration: 1.5, repeat: Infinity }}
                className="text-teal text-2xl font-display mt-2"
              >
                &amp;
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ending overlay ── */}
      <AnimatePresence>
        {isEnding && !closing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#1C1C1A] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-white/40" style={{ fontFamily: 'Inter, sans-serif' }}>
                Ending interview...
              </p>
              <span className="text-teal text-2xl font-display animate-pulse">&amp;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pause overlay ── */}
      <AnimatePresence>
        {isPaused && !closing && !opening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="bg-[#252522]/90 rounded-2xl p-10 flex flex-col items-center gap-5 border border-white/5 max-w-sm w-full mx-4">
              <div className="scale-75 origin-center">
                <InterviewerAvatar
                  name=""
                  title=""
                  state="idle"
                  size="large"
                />
              </div>
              <h2
                className="text-white text-xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Paused
              </h2>
              <p className="text-sm text-white/40 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                {pausesRemaining} of 2 pauses remaining &middot; Max 2 minutes each
              </p>
              <div className="text-lg text-white/70 font-mono tabular-nums" style={{ fontFamily: 'Inter, sans-serif' }}>
                {formatTime(pauseTimer)} / 02:00
              </div>
              <button
                onClick={handleResume}
                className="px-6 py-2.5 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal-dark transition-colors cursor-pointer"
              >
                Resume interview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="fixed top-10 right-20 z-30 bg-[#252522] border border-white/10 rounded-xl p-4 w-64 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-white/30 hover:text-white/60 cursor-pointer">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSettingsTab('audio')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  settingsTab === 'audio' ? 'bg-teal text-white' : 'bg-white/5 text-white/50 hover:text-white/70'
                }`}
              >
                Audio
              </button>
              <button
                onClick={() => setSettingsTab('video')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  settingsTab === 'video' ? 'bg-teal text-white' : 'bg-white/5 text-white/50 hover:text-white/70'
                }`}
              >
                Video
              </button>
            </div>
            {settingsTab === 'audio' ? (
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-white/50">
                  Microphone
                  <span className="text-white/30">{isRecording ? 'Active' : 'Off'}</span>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-white/50">
                  Camera
                  <span className="text-white/30">{cameraEnabled ? 'On' : 'Off'}</span>
                </label>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Top Bar (32px) */}
        <div className="shrink-0 h-8 flex items-center justify-between px-4 relative z-10">
          <span className="text-[11px] text-white/20 tracking-wider font-body uppercase select-none" style={{ fontFamily: 'Inter, sans-serif' }}>
            Folio &amp;
          </span>

          <span className="text-[13px] text-white/40 font-mono tabular-nums" style={{ fontFamily: 'Inter, sans-serif' }}>
            {formatTime(elapsed)}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePause}
              disabled={pausesUsed >= 2 || isPaused}
              className="p-1.5 rounded text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
              title="Pause"
            >
              <IconPlayerPause className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="p-1.5 rounded text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
              title="Settings"
            >
              <IconSettings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEndClick}
              disabled={isEnding}
              className={`p-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                isEnding ? 'bg-danger/20' : 'text-danger/60 hover:text-danger hover:bg-danger/10'
              }`}
              title="End session"
            >
              {isEnding ? (
                <span className="w-3.5 h-3.5 rounded-full border border-danger border-t-transparent animate-spin block" />
              ) : (
                <IconPlayerStop className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Question counter */}
        {totalQuestions > 0 && (
          <div className="absolute top-8 right-4 z-10">
            <span className="text-[10px] uppercase text-white/20 tracking-widest font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              Question {currentQuestionIdx + 1} of {totalQuestions}
            </span>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 flex min-h-0">
          {/* Conversation Mode */}
          {!isCodingMode && (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="flex flex-col items-center">
                <InterviewerAvatar
                  name={interviewerName}
                  title={interviewerTitle}
                  state={avatarState}
                  size="large"
                />

                {/* Captions */}
                <div className="min-h-16 mt-6 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {captionText && (
                      <motion.div
                        key={isAvatarSpeaking ? interviewerResponse?.text?.slice(0, 80) : 'interim'}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.3 }}
                        className="text-center text-[#E8E4DC] text-base leading-relaxed max-w-xl px-8 overflow-y-auto max-h-32"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {captionParagraphs.map((p, i) => (
                          <p key={i} className={i > 0 ? 'mt-3' : ''}>
                            {p}
                          </p>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Candidate PiP */}
              <div className="absolute bottom-20 right-5 z-20">
                <div className="relative rounded-[10px] overflow-hidden border border-white/10"
                  style={{ width: 260, height: 146 }}
                >
                  {cameraEnabled && selfViewStream ? (
                    <video
                      ref={selfViewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <IconMicrophoneOff className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                  {/* Proctoring dot */}
                  {proctoringEnabled && faceDetectorReady && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        proctoringStatus === 'good' ? 'bg-green-500' : proctoringStatus === 'away' ? 'bg-amber-400' : 'bg-red-500'
                      }`} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Coding Mode ── */}
          {isCodingMode && (
            <div className="flex-1 flex min-h-0 gap-0 transition-all duration-400">
              {/* Left: Interviewer (small) + Candidate PiP */}
              <div className="w-40 shrink-0 flex flex-col items-center pt-6 relative">
                <InterviewerAvatar
                  name={interviewerName}
                  title={interviewerTitle}
                  state={avatarState}
                  size="small"
                />
                {/* Candidate PiP bottom-left */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                  <div className="relative rounded-[10px] overflow-hidden border border-white/10"
                    style={{ width: 200, height: 113 }}
                  >
                    {cameraEnabled && selfViewStream ? (
                      <video
                        ref={selfViewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <IconMicrophoneOff className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                    {proctoringEnabled && faceDetectorReady && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full block ${
                          proctoringStatus === 'good' ? 'bg-green-500' : proctoringStatus === 'away' ? 'bg-amber-400' : 'bg-red-500'
                        }`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Code Editor */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#141414] rounded-tl-xl overflow-hidden">
                {/* Editor toolbar */}
                <div className="shrink-0 h-10 flex items-center justify-between px-3 bg-[#1E1E1E] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <IconCode className="w-4 h-4 text-teal" />
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="bg-transparent text-[11px] text-white/60 border border-white/10 rounded px-2 py-1 outline-none cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id} className="bg-[#1E1E1E]">{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTestCases((s) => !s)}
                      className={`text-[11px] px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        showTestCases ? 'bg-teal/20 text-teal' : 'text-white/40 hover:text-white/60'
                      }`}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Test Cases
                    </button>
                    <button
                      onClick={handleCodeSubmit}
                      disabled={isCodeRunning}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50 cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {isCodeRunning ? (
                        <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                      ) : (
                        <IconPlayerPlay className="w-3 h-3" />
                      )}
                      Run
                    </button>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={codeLanguage}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      padding: { top: 12 },
                    }}
                  />
                </div>

                {/* Test Cases panel */}
                <AnimatePresence>
                  {showTestCases && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="shrink-0 bg-[#1E1E1E] border-t border-white/5 overflow-hidden"
                    >
                      <div className="p-3">
                        <p className="text-[11px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Test cases will appear here during the interview.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Code result */}
                <AnimatePresence>
                  {codeResult && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="shrink-0 bg-[#1E1E1E] border-t border-white/5 overflow-hidden"
                    >
                      <div className="p-3 font-mono text-xs space-y-1">
                        <p className="text-teal flex items-center gap-1.5">
                          <IconCode className="w-3 h-3" />
                          Exit code: {codeResult.run.code}
                        </p>
                        {codeResult.run.stdout && (
                          <pre className="text-green-400/70 whitespace-pre-wrap">{codeResult.run.stdout.slice(0, 500)}</pre>
                        )}
                        {codeResult.run.stderr && (
                          <pre className="text-red-400/70 whitespace-pre-wrap">{codeResult.run.stderr.slice(0, 500)}</pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              {/* Captions overlay at bottom of editor */}
              <AnimatePresence>
                {captionText && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="text-[#E8E4DC] text-sm leading-relaxed text-center max-w-lg px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm overflow-y-auto max-h-32"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {captionParagraphs.map((p, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                          {p}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Barge-in indicator ── */}
      <AnimatePresence>
        {bargeInIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-500/20 text-amber-300 text-[11px] px-3 py-1.5 rounded-full border border-amber-500/30 font-medium"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Interrupted
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-30 bg-danger/90 text-white text-xs px-4 py-2 rounded-lg"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Debug Panel (Ctrl+Shift+D) ── */}
      <DebugPanel
        isConnected={isConnected}
        isRecording={isRecording}
        transcripts={transcripts}
        currentInterim={currentInterim}
        interviewerResponse={interviewerResponse}
        codeResult={codeResult}
        isCodeRunning={isCodeRunning}
        error={error}
        isAvatarSpeaking={isAvatarSpeaking}
        isThinking={isThinking}
        isPaused={isPaused}
        greetingDone={greetingDone}
        bargeInIndicator={bargeInIndicator}
        turnState={turnState}
        aiResponseTime={aiResponseTime}
        elapsed={elapsed}
        pausesUsed={pausesUsed}
        pauseTimer={pauseTimer}
        cameraEnabled={cameraEnabled}
        sessionId={sessionId}
        session={session}
      />

      {/* ── Bottom Bar (56px) ── */}
      <div className="shrink-0 h-14 bg-[#252522] flex items-center px-5 gap-4 border-t border-white/5 relative z-10">
        {/* Left: Mic status */}
        <div className="w-fit shrink-0 flex items-center gap-3">
          <div className="flex items-center gap-2">
            {audioStream && <AudioWaveform stream={audioStream} isActive={isRecording} />}
            <span className="text-[11px] text-white/30 flex items-center gap-1.5">
              <IconMicrophone className={`w-3 h-3 ${isRecording ? 'text-teal' : ''}`} />
              {isRecording ? 'Listening' : 'Mic off'}
            </span>
          </div>
        </div>

        {/* Center: Turn state pill */}
        <div className="flex-1 flex justify-center">
          <motion.div
            key={turnState}
            initial={turnState === 'candidate' ? { scale: 0.95, opacity: 0 } : undefined}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${
              turnState === 'candidate'
                ? 'bg-[#E8E4DC] text-[#1A1A1A]'
                : turnState === 'processing'
                ? 'bg-white/5 text-white/50'
                : 'bg-white/5 text-white/50'
            }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {turnState === 'interviewer' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                Interviewer is speaking
              </>
            )}
            {turnState === 'candidate' && (
              <>Your turn to respond</>
            )}
            {turnState === 'processing' && (
              <>
                <span className="text-teal text-xs font-semibold">&amp;</span>
                Processing your response...
              </>
            )}
            {turnState === 'idle' && (
              <>Awaiting connection</>
            )}
          </motion.div>
        </div>

        {/* Right: Question progress */}
        <div className="w-32 shrink-0 flex justify-end">
          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal/60 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
