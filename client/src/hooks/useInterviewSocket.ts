import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080'

export interface TranscriptEvent {
  speaker: 'candidate' | 'interviewer'
  text: string
  isFinal?: boolean
  confidence?: number
}

export interface InterviewerResponse {
  text: string
  audio: string | null
  questionIndex: number
}

export interface CodeResult {
  language: string
  version: string
  run: { stdout: string; stderr: string; code: number; signal: string | null; output: string }
  compile?: { stdout: string; stderr: string; code: number; signal: string | null; output: string }
}

export function useInterviewSocket(sessionId: string | undefined) {
  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([])
  const [currentInterim, setCurrentInterim] = useState('')
  const [interviewerResponse, setInterviewerResponse] = useState<InterviewerResponse | null>(null)
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null)
  const [isCodeRunning, setIsCodeRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Connect to WebSocket
  useEffect(() => {
    if (!sessionId) return

    const socket = io(`${SOCKET_URL}/interview`, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join', { sessionId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('transcript', (event: TranscriptEvent) => {
      if (event.isFinal) {
        setTranscripts((prev) => [...prev, event])
        setCurrentInterim('')
      } else {
        setCurrentInterim(event.text)
      }
    })

    socket.on('interviewer_response', (response: InterviewerResponse) => {
      setInterviewerResponse(response)
      setTranscripts((prev) => [
        ...prev,
        { speaker: 'interviewer', text: response.text },
      ])

      // Play audio if available
      if (response.audio) {
        playAudio(response.audio)
      }
    })

    socket.on('code_running', () => {
      setIsCodeRunning(true)
      setCodeResult(null)
    })

    socket.on('code_result', (res: { result: CodeResult }) => {
      setIsCodeRunning(false)
      setCodeResult(res.result)
    })

    socket.on('pause_denied', (res: { reason: string }) => {
      setError(res.reason)
    })

    socket.on('stt_error', (err: { message: string }) => {
      setError(err.message)
    })

    socket.on('paused', () => {
      stopMicrophone()
    })

    socket.on('resumed', () => {
      // Reconnect mic handled by startMicrophone
    })

    return () => {
      socket.emit('leave', sessionId)
      socket.disconnect()
      stopMicrophone()
    }
  }, [sessionId])

  const playAudio = useCallback((base64Audio: string) => {
    try {
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {
        // Autoplay blocked — user needs to interact first
      })
    } catch {
      // Audio playback failed
    }
  }, [])

  const startMicrophone = useCallback(async () => {
    if (!socketRef.current?.connected) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.connected) {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            socketRef.current?.emit('audio_chunk', {
              sessionId,
              audio: base64,
            })
          }
          reader.readAsDataURL(event.data)
        }
      }

      mediaRecorder.start(100) // Send chunks every 100ms
      setIsRecording(true)
      socketRef.current.emit('mic_enabled', { enabled: true })
    } catch (err) {
      setError('Microphone access denied')
    }
  }, [sessionId])

  const stopMicrophone = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    socketRef.current?.emit('mic_enabled', { enabled: false })
  }, [])

  const pause = useCallback(() => {
    socketRef.current?.emit('pause', sessionId)
  }, [sessionId])

  const resume = useCallback(() => {
    socketRef.current?.emit('resume', { sessionId })
    startMicrophone()
  }, [sessionId, startMicrophone])

  const endSession = useCallback(() => {
    socketRef.current?.emit('end_session', sessionId)
    stopMicrophone()
  }, [sessionId, stopMicrophone])

  const nextQuestion = useCallback(() => {
    socketRef.current?.emit('next_question', sessionId)
  }, [sessionId])

  const submitCode = useCallback(
    (language: string, code: string, stdin?: string) => {
      socketRef.current?.emit('code_submit', { sessionId, language, code, stdin })
    },
    [sessionId],
  )

  const sendProctoringEvent = useCallback(
    (event: { type: string; severity: string; duration: number | null; metadata?: Record<string, unknown> }) => {
      socketRef.current?.emit('proctoring_event', { sessionId, event })
    },
    [sessionId],
  )

  return {
    isConnected,
    isRecording,
    transcripts,
    currentInterim,
    interviewerResponse,
    codeResult,
    isCodeRunning,
    error,
    startMicrophone,
    stopMicrophone,
    pause,
    resume,
    endSession,
    nextQuestion,
    submitCode,
    sendProctoringEvent,
  }
}
