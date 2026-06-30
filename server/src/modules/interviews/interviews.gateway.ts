import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { InterviewsService } from './interviews.service'
import { DeepgramService, DeepgramTranscriptEvent } from './deepgram.service'
import { PistonService } from './piston.service'
import { AiService } from '../ai/ai.service'
import { INTERVIEW_RESPONSE_SYSTEM } from '../ai/prompts'
import type { InterviewerPersona, InterviewQuestionPlan } from './schemas/interview-session.schema'

interface SessionState {
  sessionId: string
  questionIndex: number
  lastCandidateTranscript: string
  isAiResponding: boolean
  pausesUsed: number
  pauseStartTime: number | null
  isPaused: boolean
}

@WebSocketGateway({
  namespace: '/interview',
  cors: { origin: '*' },
})
export class InterviewsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(InterviewsGateway.name)
  private activeSessions = new Map<string, Set<string>>()
  private sessionStates = new Map<string, SessionState>()
  private micEnabled = new Map<string, boolean>()

  private readonly MAX_PAUSES = 2
  private readonly MAX_PAUSE_SECONDS = 120

  constructor(
    private interviewsService: InterviewsService,
    private deepgram: DeepgramService,
    private aiService: AiService,
    private piston: PistonService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    this.deepgram.closeSttConnection(client.id)
    for (const [sessionId, clients] of this.activeSessions.entries()) {
      clients.delete(client.id)
      if (clients.size === 0) {
        this.activeSessions.delete(sessionId)
      }
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: { sessionId: string }) {
    const { sessionId } = payload
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Set())
    }
    this.activeSessions.get(sessionId)!.add(client.id)
    client.join(sessionId)

    let isNewSession = false
    if (!this.sessionStates.has(sessionId)) {
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      this.sessionStates.set(sessionId, {
        sessionId,
        questionIndex: 0,
        lastCandidateTranscript: '',
        isAiResponding: false,
        pausesUsed: 0,
        pauseStartTime: null,
        isPaused: false,
      })
      if (doc && doc.status === 'in_progress') {
        const hasTurns = await this.interviewsService.hasTranscriptTurns(sessionId)
        if (!hasTurns) {
          isNewSession = true
        }
      }
    }

    this.logger.log(`Client ${client.id} joined session ${sessionId}`)

    if (isNewSession) {
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      const greeting = this.interviewsService.buildGreeting(doc!)
      if (greeting) {
        const greetingTurn = {
          speaker: 'interviewer' as const,
          questionPlanRef: 0,
          text: greeting,
          timestamp: Date.now(),
          duration: 0,
        }
        await this.interviewsService.addTurn(sessionId, greetingTurn)
        let audioBase64: string | null = null
        if (this.deepgram.isConfigured) {
          audioBase64 = await this.deepgram.generateTtsBase64(greeting)
        }
        this.server.to(sessionId).emit('interviewer_response', {
          text: greeting,
          audio: audioBase64,
          questionIndex: 0,
        })
      }
    }

    if (this.deepgram.isConfigured) {
      const conn = await this.deepgram.createSttConnection(
        client.id,
        sessionId,
        (event) => this.handleTranscript(client, sessionId, event),
        (error) => this.handleSttError(client, sessionId, error),
        () => this.handleSttClose(client, sessionId),
      )
      if (conn) {
        this.logger.log(`Deepgram STT connection opened for client ${client.id}`)
      }
    }
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, sessionId: string) {
    client.leave(sessionId)
    this.deepgram.closeSttConnection(client.id)
    const clients = this.activeSessions.get(sessionId)
    if (clients) {
      clients.delete(client.id)
      if (clients.size === 0) {
        this.activeSessions.delete(sessionId)
        this.sessionStates.delete(sessionId)
      }
    }
  }

  @SubscribeMessage('audio_chunk')
  handleAudioChunk(client: Socket, payload: { sessionId: string; audio: string }) {
    if (!this.micEnabled.get(client.id)) return
    const state = this.sessionStates.get(payload.sessionId)
    if (state?.isPaused) return

    const buffer = Buffer.from(payload.audio, 'base64')
    this.deepgram.sendAudio(client.id, buffer)
  }

  @SubscribeMessage('mic_enabled')
  handleMicEnabled(client: Socket, payload: { enabled: boolean }) {
    this.micEnabled.set(client.id, payload.enabled)
  }

  private async handleTranscript(
    client: Socket,
    sessionId: string,
    event: DeepgramTranscriptEvent,
  ) {
    this.server.to(sessionId).emit('transcript', {
      speaker: 'candidate',
      text: event.transcript,
      isFinal: event.isFinal,
      confidence: event.confidence,
    })

    if (event.isFinal) {
      const state = this.sessionStates.get(sessionId)
      if (!state || state.isAiResponding) return

      state.lastCandidateTranscript = event.transcript
      state.isAiResponding = true

      try {
        await this.interviewsService.addTurn(sessionId, {
          speaker: 'candidate',
          questionPlanRef: state.questionIndex,
          text: event.transcript,
          timestamp: Date.now(),
          duration: 0,
        })
      } catch (err) {
        this.logger.error(`Failed to store transcript turn: ${(err as Error).message}`)
      }

      await this.generateAiResponse(client, sessionId, state)
    }
  }

  private async generateAiResponse(
    client: Socket,
    sessionId: string,
    state: SessionState,
  ) {
    try {
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      if (!doc) {
        this.logger.warn(`Session ${sessionId} not found for AI response`)
        state.isAiResponding = false
        return
      }

      const persona = doc.interviewerPersona as InterviewerPersona | undefined
      const questionPlan = doc.questionPlan as InterviewQuestionPlan[] | undefined
      const currentQuestion = questionPlan?.[state.questionIndex]

      const context = {
        personaName: persona?.interviewerName || 'Interviewer',
        personaTitle: persona?.interviewerTitle || '',
        tone: persona?.personality?.tone || 'neutral',
        followUpStyle: persona?.personality?.followUpStyle || 'probing',
        currentQuestionIndex: state.questionIndex,
        totalQuestions: questionPlan?.length || 0,
        currentQuestion: currentQuestion
          ? {
              phase: currentQuestion.phase,
              topic: currentQuestion.topic,
              question: currentQuestion.primaryQuestion,
            }
          : null,
        lastCandidateResponse: state.lastCandidateTranscript,
        questionPlan: questionPlan?.map((q) => ({
          order: q.order,
          phase: q.phase,
          topic: q.topic,
          question: q.primaryQuestion,
        })) || [],
      }

      const aiResponse = await this.aiService.chat(
        INTERVIEW_RESPONSE_SYSTEM,
        JSON.stringify(context),
      )

      const responseText = typeof aiResponse === 'string'
        ? aiResponse
        : (aiResponse as any)?.response || (aiResponse as any)?.text || JSON.stringify(aiResponse)

      await this.interviewsService.addTurn(sessionId, {
        speaker: 'interviewer',
        questionPlanRef: state.questionIndex,
        text: responseText,
        timestamp: Date.now(),
        duration: 0,
      })

      let audioBase64: string | null = null
      if (this.deepgram.isConfigured) {
        audioBase64 = await this.deepgram.generateTtsBase64(responseText)
      }

      this.server.to(sessionId).emit('interviewer_response', {
        text: responseText,
        audio: audioBase64,
        questionIndex: state.questionIndex,
      })

      state.isAiResponding = false
    } catch (err) {
      this.logger.error(`AI response generation failed: ${(err as Error).message}`)
      state.isAiResponding = false
      this.server.to(sessionId).emit('interviewer_response', {
        text: "Could you repeat that? I didn't quite catch it.",
        audio: null,
        questionIndex: state.questionIndex,
      })
    }
  }

  private handleSttError(client: Socket, sessionId: string, error: Error) {
    this.logger.error(`STT error for session ${sessionId}: ${error.message}`)
    this.server.to(sessionId).emit('stt_error', { message: error.message })
  }

  private handleSttClose(client: Socket, sessionId: string) {
    this.logger.log(`STT connection closed for session ${sessionId}`)
    if (this.deepgram.isConfigured) {
      this.deepgram.createSttConnection(
        client.id,
        sessionId,
        (event) => this.handleTranscript(client, sessionId, event),
        (error) => this.handleSttError(client, sessionId, error),
        () => this.handleSttClose(client, sessionId),
      ).then((conn) => {
        if (conn) this.logger.log(`Deepgram STT reconnected for client ${client.id}`)
      })
    }
  }

  @SubscribeMessage('proctoring_event')
  async handleProctoringEvent(client: Socket, payload: { sessionId: string; event: unknown }) {
    try {
      await this.interviewsService.addProctoringEvent(payload.sessionId, payload.event as any)
    } catch (err) {
      this.logger.error(`Failed to store proctoring event: ${(err as Error).message}`)
    }
  }

  @SubscribeMessage('pause')
  async handlePause(client: Socket, payload: { sessionId: string }) {
    const state = this.sessionStates.get(payload.sessionId)
    if (!state) return

    if (state.pausesUsed >= this.MAX_PAUSES) {
      this.server.to(payload.sessionId).emit('pause_denied', {
        reason: 'Maximum pauses reached',
      })
      return
    }

    state.pausesUsed++
    state.pauseStartTime = Date.now()
    state.isPaused = true
    this.deepgram.closeSttConnection(client.id)

    this.server.to(payload.sessionId).emit('paused', {
      pausesRemaining: this.MAX_PAUSES - state.pausesUsed,
      pauseSecondsRemaining: this.MAX_PAUSE_SECONDS,
    })
  }

  @SubscribeMessage('resume')
  async handleResume(client: Socket, payload: { sessionId: string }) {
    const state = this.sessionStates.get(payload.sessionId)
    if (!state || !state.isPaused) return

    state.isPaused = false
    state.pauseStartTime = null

    if (this.deepgram.isConfigured) {
      const conn = await this.deepgram.createSttConnection(
        client.id,
        payload.sessionId,
        (event) => this.handleTranscript(client, payload.sessionId, event),
        (error) => this.handleSttError(client, payload.sessionId, error),
        () => this.handleSttClose(client, payload.sessionId),
      )
      if (conn) this.logger.log(`Deepgram STT reconnected for client ${client.id}`)
    }

    this.server.to(payload.sessionId).emit('resumed')
  }

  @SubscribeMessage('next_question')
  async handleNextQuestion(client: Socket, sessionId: string) {
    const state = this.sessionStates.get(sessionId)
    if (state) {
      state.questionIndex++
      state.lastCandidateTranscript = ''
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      const plan = doc?.questionPlan as InterviewQuestionPlan[] | undefined
      if (plan && state.questionIndex < plan.length) {
        this.server.to(sessionId).emit('question_ready', {
          index: state.questionIndex,
          question: plan[state.questionIndex].primaryQuestion,
          phase: plan[state.questionIndex].phase,
        })
      }
    }
  }

  @SubscribeMessage('code_submit')
  async handleCodeSubmit(
    client: Socket,
    payload: { sessionId: string; language: string; code: string; stdin?: string },
  ) {
    const state = this.sessionStates.get(payload.sessionId)
    if (!state) return

    this.server.to(payload.sessionId).emit('code_running')

    const result = await this.piston.execute(payload.language, payload.code, payload.stdin)

    this.server.to(payload.sessionId).emit('code_result', {
      result,
      questionIndex: state.questionIndex,
    })
  }

  @SubscribeMessage('end_session')
  async handleEndSession(client: Socket, sessionId: string) {
    this.deepgram.closeSttConnection(client.id)
    this.server.to(sessionId).emit('session_ended')
  }
}
