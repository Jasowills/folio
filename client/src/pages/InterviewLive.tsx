import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconMicrophone, IconMicrophoneOff, IconPlayerPause, IconPlayerPlay,
  IconPlayerStop, IconCode, IconEye, IconEyeOff, IconAlertTriangle,
  IconCamera, IconTerminal,
} from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession, useEndSession } from '../lib/queries'
import { useInterviewSocket } from '../hooks/useInterviewSocket'
import { useProctoring } from '../hooks/useProctoring'
import { useCameraProctoring } from '../hooks/useCameraProctoring'
import { CodingPhase } from '../components/interview/CodingPhase'
import { Button } from '../components/ui/button'
import { showToast } from '../components/ui/toast'

export default function InterviewLive() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data: session, isLoading } = useSession(sessionId)
  const endSession = useEndSession()
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const {
    isConnected, isRecording, transcripts, currentInterim,
    interviewerResponse, codeResult, isCodeRunning,
    error, startMicrophone, stopMicrophone,
    pause, resume, endSession: wsEndSession, nextQuestion,
    submitCode, sendProctoringEvent,
  } = useInterviewSocket(sessionId)

  const [isPaused, setIsPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [codingOpen, setCodingOpen] = useState(false)
  const [proctoringEnabled, setProctoringEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout>>()

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

  // Avatar pulse when TTS audio plays
  useEffect(() => {
    if (interviewerResponse?.audio) {
      setIsAvatarSpeaking(true)
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
      const estimatedDuration = interviewerResponse.text.length * 60
      speakingTimerRef.current = setTimeout(() => setIsAvatarSpeaking(false), estimatedDuration)
    } else if (interviewerResponse && !interviewerResponse.audio) {
      setIsAvatarSpeaking(false)
    }
    return () => {
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
    }
  }, [interviewerResponse])

  useEffect(() => {
    if (!sessionId) navigate('/interview/new', { replace: true })
  }, [sessionId, navigate])

  useEffect(() => {
    if (session?.status === 'completed') {
      navigate(`/interview/${sessionId}/results`, { replace: true })
    }
  }, [session?.status, sessionId, navigate])

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording, isPaused])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts, currentInterim, codeResult])

  const handleToggleMic = async () => {
    if (isRecording) {
      stopMicrophone()
    } else {
      await startMicrophone()
    }
  }

  const handlePause = () => {
    setIsPaused(true)
    pause()
    showToast('info', 'Interview paused')
  }

  const handleResume = () => {
    setIsPaused(false)
    resume()
    showToast('info', 'Interview resumed')
  }

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

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-mono font-semibold text-ink">{formatTime(elapsed)}</div>
            <div className="h-2 w-48 bg-paper-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (elapsed / totalSeconds) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted">{session.role}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-xs text-muted mr-2">{isConnected ? 'Connected' : 'Disconnected'}</span>
            {isRecording && !isPaused && (
              <Button variant="ghost" size="sm" onClick={handlePause}>
                Pause
                <IconPlayerPause className="w-4 h-4 ml-1" />
              </Button>
            )}
            {isRecording && isPaused && (
              <Button variant="ghost" size="sm" onClick={handleResume}>
                Resume
                <IconPlayerPlay className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={handleEnd} loading={endSession.isPending}>
              End
              <IconPlayerStop className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Camera feed (small, picture-in-picture style) */}
        {cameraEnabled && (
          <div className="fixed bottom-6 left-6 z-40 w-40 rounded-lg overflow-hidden border-2 border-teal shadow-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-30 object-cover scale-x-[-1]"
            />
            <div className="absolute top-1 right-1 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${numFaces > 0 ? 'bg-green-400' : 'bg-red-400'}`}
              />
              <span className="text-[10px] text-white">{numFaces}</span>
            </div>
          </div>
        )}

        {/* Avatar + Mic */}
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br from-teal to-purple-500 flex items-center justify-center transition-all duration-700 ${
                isRecording && !isPaused ? 'scale-110 shadow-lg shadow-teal/30' : ''
              } ${isPaused ? 'opacity-60' : ''}`}
              style={{
                animation: isAvatarSpeaking
                  ? 'pulse 0.8s ease-in-out infinite'
                  : isRecording && !isPaused
                  ? 'pulse 2s ease-in-out infinite'
                  : 'none',
                transform: isAvatarSpeaking ? 'scale(1.15)' : '',
              }}
            >
              {isRecording && !isPaused ? (
                <IconMicrophone className="w-12 h-12 text-white" />
              ) : (
                <IconMicrophoneOff className="w-12 h-12 text-white/70" />
              )}
            </div>
            {isAvatarSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-teal/30 animate-ping" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={handleToggleMic}
              disabled={!isConnected}
            >
              {isRecording ? (
                <><IconMicrophoneOff className="w-5 h-5 mr-2" /> Stop Mic</>
              ) : (
                <><IconMicrophone className="w-5 h-5 mr-2" /> Start Mic</>
              )}
            </Button>

            {isRecording && (
              <span className={`flex items-center gap-2 text-sm ${isPaused ? 'text-amber-400' : 'text-green-500'}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            )}
          </div>
        </div>

        {/* Transcript area */}
        <div className="bg-paper-dark rounded-lg p-4 max-h-72 overflow-y-auto space-y-3">
          <AnimatePresence>
            {transcripts.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${t.speaker === 'interviewer' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  t.speaker === 'interviewer'
                    ? 'bg-teal-light/10 text-ink'
                    : 'bg-teal text-white'
                }`}>
                  <p className="text-xs opacity-60 mb-1">
                    {t.speaker === 'interviewer' ? 'Interviewer' : 'You'}
                  </p>
                  {t.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {currentInterim && (
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-teal/50 text-white italic">
                {currentInterim}
              </div>
            </div>
          )}

          {codeResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/5 rounded-lg p-3 text-xs font-mono space-y-1"
            >
              <p className="text-teal font-semibold flex items-center gap-1">
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

        {/* Controls footer */}
        <div className="flex justify-center gap-3 pt-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={nextQuestion} disabled={!isRecording}>
            Next Question
            <IconCode className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProctoringEnabled((p) => !p)}
            className={proctoringEnabled ? 'text-teal' : ''}
          >
            <IconEye className="w-4 h-4 mr-1" />
            {proctoringEnabled ? 'Proctoring' : 'Proctoring'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCameraEnabled((p) => !p)}
            className={cameraEnabled ? 'text-teal' : ''}
          >
            <IconCamera className="w-4 h-4 mr-1" />
            {cameraEnabled ? 'Camera' : 'Camera'}
          </Button>
          {session.includesCoding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCodingOpen(true)}
              loading={isCodeRunning}
            >
              <IconTerminal className="w-4 h-4 mr-1" />
              Editor
            </Button>
          )}
        </div>
      </motion.div>

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
