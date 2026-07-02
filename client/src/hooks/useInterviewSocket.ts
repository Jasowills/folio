import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getPreConnectedSocket, setPreConnectedSocket } from '../lib/socket-store'

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
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [bargeInIndicator, setBargeInIndicator] = useState(false)
  const isAvatarSpeakingRef = useRef(false)
  const bargeInAnalyserRef = useRef<AnalyserNode | null>(null)
  const bargeInContextRef = useRef<AudioContext | null>(null)
  const bargeInHighCountRef = useRef(0)
  const bargeInPollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const bargeInTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    isAvatarSpeakingRef.current = isAvatarSpeaking
  }, [isAvatarSpeaking])

  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      const preferred = voices.find(
        (v) => v.name.includes('Samantha') || v.name.includes('Google UK Female') || v.name.includes('Google US Female'),
      )
      if (preferred) utterance.voice = preferred
    }

    utterance.onstart = () => setIsAvatarSpeaking(true)
    utterance.onend = () => setIsAvatarSpeaking(false)
    utterance.onerror = () => {
      setIsAvatarSpeaking(false)
    }
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const speakWithAudio = useCallback((base64Audio: string) => {
    try {
      setIsAvatarSpeaking(true)
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsAvatarSpeaking(false)
      }
      audio.onerror = () => setIsAvatarSpeaking(false)
      audio.play().catch(() => {
        setIsAvatarSpeaking(false)
      })
    } catch {
      setIsAvatarSpeaking(false)
    }
  }, [])

  const speakResponse = useCallback((text: string, audio: string | null) => {
    if (audio) {
      speakWithAudio(audio)
    } else {
      speakWithBrowser(text)
    }
  }, [speakWithAudio, speakWithBrowser])

  const startMicrophone = useCallback(async () => {
    if (!socketRef.current?.connected) {
      console.warn('[Socket] Cannot start mic — socket not connected')
      return
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[Socket] Mic already recording, skipping')
      return
    }

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

      console.log('[Socket] Microphone started, creating MediaRecorder')
      streamRef.current = stream

      // Setup AnalyserNode for barge-in detection
      try {
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        bargeInContextRef.current = audioContext
        bargeInAnalyserRef.current = analyser

        bargeInPollRef.current = setInterval(() => {
          if (!isAvatarSpeakingRef.current) {
            bargeInHighCountRef.current = 0
            return
          }
          const analyserNode = bargeInAnalyserRef.current
          if (!analyserNode) return
          const data = new Uint8Array(analyserNode.frequencyBinCount)
          analyserNode.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const val = (data[i] - 128) / 128
            sum += val * val
          }
          const rms = Math.sqrt(sum / data.length)
          if (rms > 0.015) {
            bargeInHighCountRef.current++
            if (bargeInHighCountRef.current >= 4) {
              bargeInHighCountRef.current = 0
              socketRef.current?.emit('barge_in', sessionId)
            }
          } else {
            bargeInHighCountRef.current = 0
          }
        }, 100)
      } catch (err) {
        console.warn('[Socket] Barge-in setup failed:', err)
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder

      let chunkCount = 0
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.connected) {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            chunkCount++
            if (chunkCount % 50 === 0) {
              console.log(`[Socket] Sent ${chunkCount} audio chunks`)
            }
            socketRef.current?.emit('audio_chunk', {
              sessionId,
              audio: base64,
            })
          }
          reader.readAsDataURL(event.data)
        }
      }

      mediaRecorder.start(2000)
      setIsRecording(true)
      socketRef.current.emit('mic_enabled', { enabled: true })
      console.log('[Socket] Mic enabled, MediaRecorder started at 2000ms intervals')
    } catch (err) {
      console.error('[Socket] Microphone access denied:', err)
      setError('Microphone access denied')
    }
  }, [sessionId])

  const stopMicrophone = useCallback(() => {
    if (bargeInPollRef.current) {
      clearInterval(bargeInPollRef.current)
      bargeInPollRef.current = undefined
    }
    if (bargeInContextRef.current) {
      bargeInContextRef.current.close().catch(() => {})
      bargeInContextRef.current = null
      bargeInAnalyserRef.current = null
    }
    bargeInHighCountRef.current = 0
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    socketRef.current?.emit('mic_enabled', { enabled: false })
  }, [])

  const setupSocketHandlers = useCallback((socket: Socket) => {
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`)
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error(`[Socket] Connection error: ${err.message}`)
    })

    socket.on('transcript', (event: TranscriptEvent) => {
      console.log(`[Socket] Transcript event: speaker=${event.speaker}, isFinal=${event.isFinal}, text="${event.text.slice(0, 60)}"`)
      if (event.isFinal) {
        setTranscripts((prev) => [...prev, event])
        setCurrentInterim('')
        if (event.speaker === 'candidate') {
          if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
          thinkingTimeoutRef.current = setTimeout(() => {
            setIsThinking(true)
          }, 800)
        }
      } else {
        if (event.speaker === 'candidate') {
          if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
          setIsThinking(false)
        }
        setCurrentInterim(event.text)
      }
    })

    socket.on('interviewer_thinking', () => {
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
      setIsThinking(true)
    })

    socket.on('interviewer_response', (response: InterviewerResponse) => {
      console.log(`[Socket] Interviewer response: text="${response.text.slice(0, 60)}", audio=${response.audio ? 'present' : 'null'}, questionIndex=${response.questionIndex}`)
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
      setIsThinking(false)
      setInterviewerResponse(response)
      setTranscripts((prev) => [
        ...prev,
        { speaker: 'interviewer', text: response.text },
      ])

      speakResponse(response.text, response.audio)
    })

    socket.on('code_running', () => {
      console.log('[Socket] Code running')
      setIsCodeRunning(true)
      setCodeResult(null)
    })

    socket.on('code_result', (res: { result: CodeResult }) => {
      console.log('[Socket] Code result received')
      setIsCodeRunning(false)
      setCodeResult(res.result)
    })

    socket.on('pause_denied', (res: { reason: string }) => {
      console.warn(`[Socket] Pause denied: ${res.reason}`)
      setError(res.reason)
    })

    socket.on('stt_error', (err: { message: string }) => {
      console.error(`[Socket] STT error: ${err.message}`)
      setError(err.message)
    })

    socket.on('paused', () => {
      setIsPaused(true)
      stopMicrophone()
    })

    socket.on('resumed', () => {
      setIsPaused(false)
      startMicrophone()
    })

    socket.on('barge_in_detected', () => {
      window.speechSynthesis?.cancel()
      setIsAvatarSpeaking(false)
      setBargeInIndicator(true)
      if (bargeInTimeoutRef.current) clearTimeout(bargeInTimeoutRef.current)
      bargeInTimeoutRef.current = setTimeout(() => setBargeInIndicator(false), 1500)
    })
  }, [speakResponse, stopMicrophone, startMicrophone])

  const cleanup = useCallback((socket: Socket) => {
    if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
    if (bargeInTimeoutRef.current) clearTimeout(bargeInTimeoutRef.current)
    socket.emit('leave', sessionId)
    socket.disconnect()
    stopMicrophone()
  }, [sessionId, stopMicrophone])

  useEffect(() => {
    if (!sessionId) return

    const existing = getPreConnectedSocket()
    if (existing) {
      console.log(`[Socket] Reusing pre-connected socket ${existing.id} for session ${sessionId}`)
      socketRef.current = existing
      setIsConnected(existing.connected)
      if (!existing.connected) {
        existing.on('connect', () => {
          console.log(`[Socket] Pre-connected socket now connected with id ${existing.id}`)
          setIsConnected(true)
        })
      }
      setPreConnectedSocket(null)
      setupSocketHandlers(existing)
      return () => cleanup(existing)
    }

    const socket = io(`${SOCKET_URL}/interview`, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log(`[Socket] Connected to ${SOCKET_URL}/interview with id ${socket.id}`)
      setIsConnected(true)
      socket.emit('join', { sessionId })
      console.log(`[Socket] Emitted join for session ${sessionId}`)
    })

    setupSocketHandlers(socket)

    return () => cleanup(socket)
  }, [sessionId])

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

  const replayResponse = useCallback(() => {
    if (interviewerResponse) {
      speakResponse(interviewerResponse.text, interviewerResponse.audio)
    }
  }, [interviewerResponse, speakResponse])

  const flushBuffer = useCallback(() => {
    socketRef.current?.emit('flush_buffer', sessionId)
  }, [sessionId])

  return {
    isConnected,
    isRecording,
    transcripts,
    currentInterim,
    interviewerResponse,
    codeResult,
    isCodeRunning,
    error,
    isAvatarSpeaking,
    isThinking,
    isPaused,
    bargeInIndicator,
    audioStream: streamRef.current,
    startMicrophone,
    stopMicrophone,
    pause,
    resume,
    endSession,
    nextQuestion,
    submitCode,
    sendProctoringEvent,
    replayResponse,
    flushBuffer,
  }
}
