import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconPlayerStop, IconEye, IconEyeOff, IconAlertTriangle,
  IconCameraOff, IconTerminal,
} from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession, useEndSession } from '../lib/queries'
import { useInterviewSocket } from '../hooks/useInterviewSocket'
import { useProctoring } from '../hooks/useProctoring'
import { useCameraProctoring } from '../hooks/useCameraProctoring'
import { CodingPhase } from '../components/interview/CodingPhase'
import { Button } from '../components/ui/button'
import { showToast } from '../components/ui/toast'
import InterviewerAvatar from '../components/interview/InterviewerAvatar'
import AudioWaveform from '../components/interview/AudioWaveform'

export default function InterviewLive() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data: session, isLoading } = useSession(sessionId)
  const endSession = useEndSession()
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const {
    isConnected, isRecording, transcripts, currentInterim,
    interviewerResponse, codeResult, isCodeRunning,
    error, isAvatarSpeaking, audioStream, startMicrophone,
    endSession: wsEndSession, submitCode, sendProctoringEvent,
  } = useInterviewSocket(sessionId)

  const [elapsed, setElapsed] = useState(0)
  const [codingOpen, setCodingOpen] = useState(false)
  const [proctoringEnabled, setProctoringEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const hasAutoOpenedEditor = useRef(false)

  const [selfViewStream, setSelfViewStream] = useState<MediaStream | null>(null)
  const selfViewRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const persona = session?.interviewerPersona as {
    interviewerName?: string
    interviewerTitle?: string
  } | undefined

  const questionPlan = session?.questionPlan as Array<{ primaryQuestion?: string; phase?: string; topic?: string }> | undefined

  // Page + paste proctoring
  useProctoring({
    enabled: proctoringEnabled && isRecording,
    onEvent: sendProctoringEvent,
  })

  // Camera proctoring
  const { faceDetectorReady, numFaces, videoRef } = useCameraProctoring({
    enabled: cameraEnabled && proctoringEnabled && isRecording,
    onEvent: sendProctoringEvent,
  })

  const handleCodeSubmit = useCallback((code: string, language: string) => {
    submitCode(language, code)
    showToast('info', 'Code submitted for execution')
  }, [submitCode])

  // Auto-start mic + camera when connected and session is ready
  useEffect(() => {
    if (!isConnected || !session || session.status !== 'in_progress') return
    startMicrophone()
    setCameraEnabled(true)
  }, [isConnected, session, startMicrophone])

  // Camera self-view (independent of proctoring)
  useEffect(() => {
    if (!cameraEnabled) {
      if (selfViewStream) {
        selfViewStream.getTracks().forEach((t) => t.stop())
        setSelfViewStream(null)
      }
      return
    }

    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setSelfViewStream(stream)
        if (selfViewRef.current) {
          selfViewRef.current.srcObject = stream
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [cameraEnabled])

  // Auto-open code editor when interview starts
  useEffect(() => {
    if (session?.includesCoding && isRecording && !hasAutoOpenedEditor.current) {
      setCodingOpen(true)
      hasAutoOpenedEditor.current = true
    }
  }, [isRecording, session?.includesCoding])

  useEffect(() => {
    if (!sessionId) navigate('/interview/new', { replace: true })
  }, [sessionId, navigate])

  useEffect(() => {
    if (session?.status === 'completed') {
      navigate(`/interview/${sessionId}/results`, { replace: true })
    }
  }, [session?.status, sessionId, navigate])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts, currentInterim, codeResult])

  const handleEnd = async () => {
    if (!sessionId) return
    wsEndSession()
    try {
      await endSession.mutateAsync(sessionId)
      navigate(`/interview/${sessionId}/results`)
    } catch {
      showToast('error', 'Failed to end session')
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  if (isLoading || !session) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <span className="font-display text-teal text-4xl animate-pulse">&amp;</span>
      </div>
    )
  }

  const totalSeconds = (session.plannedDuration || 30) * 60
  const progressPct = Math.min(100, (elapsed / totalSeconds) * 100)
  const questionIndex = transcripts.filter((t) => t.speaker === 'interviewer').length
  const totalQuestions = questionPlan?.length || 0

  return (
    <div className="h-screen flex flex-col bg-paper">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-display text-teal text-lg font-bold tracking-tight shrink-0">&amp;</span>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-ink truncate">{session.role}</span>
          {totalQuestions > 0 && (
            <span className="text-xs text-muted whitespace-nowrap">
              {questionIndex} of {totalQuestions} questions
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-lg font-mono font-semibold text-ink tabular-nums">{formatTime(elapsed)}</div>
            <div className="h-2 w-32 bg-paper-dark rounded-full overflow-hidden hidden sm:block">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-[11px] text-muted hidden sm:inline">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — Interviewer */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              <InterviewerAvatar
                name={persona?.interviewerName || 'Interviewer'}
                title={persona?.interviewerTitle || session.role}
                isSpeaking={isAvatarSpeaking}
                isListening={isRecording && !isAvatarSpeaking}
                isPaused={false}
              />
            </div>

            {/* Current question */}
            {transcripts.filter((t) => t.speaker === 'interviewer').length > 0 && (
              <div className="bg-paper-dark/60 rounded-xl px-5 py-3 border border-border/50">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Current question
                </p>
                <p className="text-sm text-ink leading-relaxed">
                  {transcripts.filter((t) => t.speaker === 'interviewer').pop()?.text}
                </p>
              </div>
            )}

            {/* Chat transcript */}
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {transcripts.map((t, i) => (
                  <motion.div
                    key={`${t.speaker}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${t.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      t.speaker === 'interviewer'
                        ? 'bg-paper-dark text-ink'
                        : 'bg-teal text-white'
                    }`}>
                      {t.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {currentInterim && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-teal/60 text-white/90 italic">
                    {currentInterim}
                  </div>
                </div>
              )}

              {codeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-paper-dark rounded-xl p-4 text-xs font-mono space-y-1.5 border border-border/50"
                >
                  <p className="text-teal font-semibold flex items-center gap-1.5">
                    <IconTerminal className="w-3 h-3" />
                    Exit code: {codeResult.run.code}
                  </p>
                  {codeResult.run.stdout && (
                    <pre className="text-green-700 whitespace-pre-wrap">{codeResult.run.stdout.slice(0, 500)}</pre>
                  )}
                  {codeResult.run.stderr && (
                    <pre className="text-red-600 whitespace-pre-wrap">{codeResult.run.stderr.slice(0, 500)}</pre>
                  )}
                </motion.div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>

        {/* Right panel — Candidate */}
        <div className="w-72 lg:w-80 shrink-0 flex flex-col bg-paper/50">
          <div className="flex-1 flex flex-col overflow-hidden px-4 py-6 space-y-4">
            {/* Camera feed */}
            <div className={`rounded-xl overflow-hidden bg-ink/5 border border-border ${cameraEnabled && selfViewStream ? '' : 'flex items-center justify-center h-44'}`}>
              {cameraEnabled && selfViewStream ? (
                <div className="relative">
                  <video
                    ref={selfViewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full aspect-[4/3] object-cover scale-x-[-1]"
                  />
                  {proctoringEnabled && faceDetectorReady && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${numFaces > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-[10px] text-white font-medium">{numFaces}</span>
                    </div>
                  )}
                  {isRecording && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/80 rounded-full px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] text-white font-medium">REC</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-44 flex flex-col items-center justify-center gap-2 text-muted">
                  <IconCameraOff className="w-6 h-6" />
                  <span className="text-xs">Camera unavailable</span>
                </div>
              )}
            </div>

            {/* Audio waveform */}
            <div className="h-10">
              <AudioWaveform stream={audioStream} isActive={isRecording} />
            </div>

            {/* Recording status */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              {isRecording ? (
                <span className="flex items-center gap-1.5 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Recording
                </span>
              ) : (
                <span className="text-muted">Mic off</span>
              )}
              {faceDetectorReady && (
                <span className="text-muted">·</span>
              )}
              {faceDetectorReady && (
                <span className="text-muted">Face tracking ready</span>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-xs text-danger flex items-center gap-1.5"
                >
                  <IconAlertTriangle className="w-3 h-3 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 border-t border-border bg-paper/80 backdrop-blur-sm">
        <Button
          size="sm"
          variant={proctoringEnabled ? 'default' : 'ghost'}
          onClick={() => setProctoringEnabled((p) => !p)}
          className="gap-1.5"
        >
          {proctoringEnabled ? (
            <><IconEye className="w-4 h-4" /> Proctoring</>
          ) : (
            <><IconEyeOff className="w-4 h-4" /> Proctoring</>
          )}
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {session.includesCoding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCodingOpen(true)}
            loading={isCodeRunning}
            className="gap-1.5"
          >
            <IconTerminal className="w-4 h-4" />
            Editor
          </Button>
        )}

        <Button
          size="sm"
          variant="danger"
          onClick={handleEnd}
          loading={endSession.isPending}
          className="gap-1.5"
        >
          <IconPlayerStop className="w-4 h-4" />
          End
        </Button>
      </div>

      {/* Auto-open editor when interview starts and includes coding */}
      {session.includesCoding && (
        <CodingPhase
          isOpen={codingOpen}
          onOpenChange={setCodingOpen}
          onCodeSubmit={handleCodeSubmit}
        />
      )}
    </div>
  )
}
