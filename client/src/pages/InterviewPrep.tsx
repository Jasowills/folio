import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlayerPlay, IconAlertTriangle } from '@tabler/icons-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useSession, useStartSession } from '../lib/queries'
import { setPreConnectedSocket } from '../lib/socket-store'
import { Button } from '../components/ui/button'
import { showToast } from '../components/ui/toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080'

export default function InterviewPrep() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sessionId = params.get('sessionId')
  const { data: session, isLoading } = useSession(sessionId || undefined)
  const startSession = useStartSession()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionId) navigate('/interview/new', { replace: true })
  }, [sessionId, navigate])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      if (sessionId) navigate(`/interview/${sessionId}/live`)
      return
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, sessionId, navigate])

  const handleStart = async () => {
    if (!sessionId) return
    try {
      await startSession.mutateAsync(sessionId)

      const socket = io(`${SOCKET_URL}/interview`, {
        transports: ['websocket', 'polling'],
      })
      socket.on('connect', () => {
        console.log(`[Prep] Pre-connected socket ${socket.id}, joining ${sessionId}`)
        socket.emit('join', { sessionId })
      })
      socket.on('connect_error', (err) => {
        console.error(`[Prep] Pre-connect error: ${err.message}`)
      })
      setPreConnectedSocket(socket)

      setCountdown(3)
    } catch {
      showToast('error', 'Failed to start session')
    }
  }

  if (isLoading || !session) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <span className="font-display text-teal text-4xl animate-pulse">&amp;</span>
      </div>
    )
  }

  const persona = session.interviewerPersona as {
    interviewerName?: string
    interviewerTitle?: string
    personality?: { tone?: string; followUpStyle?: string; pacePreference?: string }
    evaluationPriorities?: string[]
    companyContext?: { mission?: string; values?: string[]; productFocus?: string }
  } | undefined

  return (
    <>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <div className="page-header">
            <h1 className="page-title">Your Interviewer</h1>
            <p className="page-subtitle">Meet your AI interviewer before you begin</p>
          </div>

          {persona && (
            <>
              <div className="bg-paper-dark rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-emerald-600 flex items-center justify-center">
                    <span className="text-xl font-semibold text-white">
                      {persona.interviewerName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'AI'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-ink">{persona.interviewerName}</h2>
                    <p className="text-sm text-muted">{persona.interviewerTitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {persona.personality?.tone && (
                    <span className="text-xs bg-teal-light/20 text-teal px-2 py-1 rounded capitalize">{persona.personality.tone} tone</span>
                  )}
                  {persona.personality?.followUpStyle && (
                    <span className="text-xs bg-teal-light/20 text-teal px-2 py-1 rounded capitalize">{persona.personality.followUpStyle} follow-ups</span>
                  )}
                  {persona.personality?.pacePreference && (
                    <span className="text-xs bg-teal-light/20 text-teal px-2 py-1 rounded capitalize">{persona.personality.pacePreference} pace</span>
                  )}
                </div>

                {persona.companyContext?.mission && (
                  <p className="text-sm text-muted italic">"{persona.companyContext.mission}"</p>
                )}

                {persona.evaluationPriorities && persona.evaluationPriorities.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2">Evaluation priorities:</p>
                    <ul className="list-disc list-inside text-sm text-ink space-y-1">
                      {persona.evaluationPriorities.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <IconAlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 space-y-1">
                  <p className="font-medium">Before you start:</p>
                  <ul className="list-disc list-inside">
                    <li>Find a quiet space with good lighting</li>
                    <li>Use headphones for better audio quality</li>
                    <li>You can pause up to 2 times (2 min total)</li>
                    <li>Your camera feed is processed locally — no data is sent to a server</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-center pt-4">
            <Button size="lg" onClick={handleStart} loading={startSession.isPending}>
              <IconPlayerPlay className="w-5 h-5 mr-2" />
              Start Interview
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink flex items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <p className="text-white/60 text-sm mb-2 font-medium tracking-widest uppercase">Get ready</p>
              <span className="font-display text-white text-8xl font-bold tabular-nums">{countdown}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
