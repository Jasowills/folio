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
  candidateName: string | null
  resumeContext: Record<string, unknown> | null
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

      let candidateName: string | null = null
      let resumeContext: Record<string, unknown> | null = null
      if (doc?.resumeId) {
        const resume = await this.interviewsService.getResumeById(doc.resumeId.toString())
        if (resume) {
          candidateName = resume.name || null
          resumeContext = {
            name: resume.name || null,
            summary: resume.summary || null,
            skills: resume.skills || [],
            experience: (resume.experience || []).map((e) => ({
              company: e.company,
              title: e.title,
              bullets: e.bullets?.slice(0, 3) || [],
            })),
            education: (resume.education || []).map((e) => ({
              institution: e.institution,
              degree: e.degree,
              field: e.field,
            })),
          }
        }
      }

      this.sessionStates.set(sessionId, {
        sessionId,
        questionIndex: 0,
        lastCandidateTranscript: '',
        isAiResponding: false,
        pausesUsed: 0,
        pauseStartTime: null,
        isPaused: false,
        candidateName,
        resumeContext,
      })
      if (doc && doc.status === 'in_progress') {
        const hasTurns = await this.interviewsService.hasTranscriptTurns(sessionId)
        if (!hasTurns) {
          isNewSession = true
        }
      }
    }

    this.logger.log(`Client ${client.id} joined session ${sessionId}`)

    this.deepgram.createSttConnection(
      client.id,
      sessionId,
      (event) => this.handleTranscript(client, sessionId, event),
      (error) => this.handleSttError(client, sessionId, error),
      () => {},
    )

    if (isNewSession) {
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      const state = this.sessionStates.get(sessionId)
      const persona = doc?.interviewerPersona as { interviewerName?: string } | undefined
      const interviewerName = persona?.interviewerName
      const greeting = this.interviewsService.buildGreeting(doc!, state?.candidateName)
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
          audioBase64 = await this.deepgram.generateTtsBase64(greeting, interviewerName)
        }
        this.server.to(sessionId).emit('interviewer_response', {
          text: greeting,
          audio: audioBase64,
          questionIndex: 0,
        })
      }
    }

    this.logger.log(`Deepgram Flux v2 STT started for client ${client.id} in session ${sessionId}`)
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
    if (!this.deepgram.isConfigured) {
      this.logger.warn(`Audio chunk received from ${client.id} but Deepgram not configured`)
      return
    }
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

      const wordCount = event.transcript.trim().split(/\s+/).length
      if (wordCount < 3) {
        this.logger.debug(`Transcript too short (${wordCount} words), continuing to listen`)
        return
      }

      this.server.to(sessionId).emit('interviewer_thinking')

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

  private buildResumeSummary(bg: Record<string, unknown> | null): string {
    if (!bg) return 'No resume provided.'
    const parts: string[] = []
    if (bg.name) parts.push(`Name: ${bg.name}`)
    if (bg.summary) parts.push(`Summary: ${bg.summary}`)
    if (Array.isArray(bg.skills) && bg.skills.length > 0) {
      parts.push(`Skills: ${(bg.skills as string[]).join(', ')}`)
    }
    if (Array.isArray(bg.experience)) {
      for (const exp of bg.experience as Array<{ title?: string; company?: string; bullets?: string[] }>) {
        if (exp.title || exp.company) {
          const bullets = exp.bullets?.slice(0, 3).join('; ') || ''
          parts.push(`- ${exp.title} at ${exp.company}${bullets ? ': ' + bullets : ''}`)
        }
      }
    }
    if (Array.isArray(bg.education)) {
      for (const edu of bg.education as Array<{ degree?: string; field?: string; institution?: string }>) {
        if (edu.degree || edu.institution) {
          parts.push(`- ${edu.degree || ''} in ${edu.field || ''} from ${edu.institution || ''}`)
        }
      }
    }
    return parts.join('\n') || 'No resume provided.'
  }

  private buildTurnInstructions(
    state: SessionState,
    turns: Array<{ speaker: string; text: string }>,
    questionPlan: InterviewQuestionPlan[] | undefined,
    remainingTimeInMinutes?: number,
    currentQuestionBudget?: number,
  ): string {
    if (state.questionIndex === 0 && turns.length === 0) {
      return 'Greet the candidate warmly by name. Ask how they are. Do NOT jump straight into interview questions yet.'
    }

    if (questionPlan && state.questionIndex >= questionPlan.length - 1) {
      return 'Thank the candidate for their time. Ask if they have any questions for you. End naturally.'
    }

    if (remainingTimeInMinutes !== undefined && remainingTimeInMinutes <= 5) {
      return 'Time is running short. Keep your response very brief (1-2 sentences) and move to the next topic quickly.'
    }

    if (currentQuestionBudget !== undefined && remainingTimeInMinutes !== undefined && remainingTimeInMinutes > 10) {
      const remainingQuestions = (questionPlan?.length || 1) - state.questionIndex - 1
      const averagePerRemaining = remainingTimeInMinutes / Math.max(remainingQuestions, 1)
      if (currentQuestionBudget > averagePerRemaining * 1.5) {
        return 'You are spending more time on this question than budget allows. Wrap up the current discussion and transition to the next question.'
      }
    }

    const lastCandidateTurn = turns.filter(t => t.speaker === 'candidate').pop()
    if (lastCandidateTurn) {
      const text = lastCandidateTurn.text || ''
      const wordCount = text.trim().split(/\s+/).length
      const hasFiller = /\b(basically|kind of|sort of|I guess|you know|like)\b/i.test(text)

      if (wordCount < 100 || hasFiller) {
        return 'Their last answer was vague. Ask a follow-up that pushes for a specific example or a measurable result before moving on. Do not proceed to the next question yet.'
      }
    }

    return 'Acknowledge their answer briefly in one sentence then transition to the next question.'
  }

  private async generateAiResponse(
    client: Socket,
    sessionId: string,
    state: SessionState,
  ) {
    let responseSent = false

    const timeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true
        state.isAiResponding = false
        this.server.to(sessionId).emit('interviewer_response', {
          text: "Could you repeat that? I didn't quite catch it.",
          audio: null,
          questionIndex: state.questionIndex,
        })
      }
    }, 15_000)

    try {
      const doc = await this.interviewsService.getSessionForAi(sessionId)
      if (!doc) {
        this.logger.warn(`Session ${sessionId} not found for AI response`)
        state.isAiResponding = false
        clearTimeout(timeout)
        return
      }

      const persona = doc.interviewerPersona as InterviewerPersona | undefined
      const questionPlan = doc.questionPlan as InterviewQuestionPlan[] | undefined
      const currentQuestion = questionPlan?.[state.questionIndex]
      const turns = await this.interviewsService.getTranscriptTurns(sessionId)

      const personaName = persona?.interviewerName || 'Interviewer'
      const candidateName = state.candidateName || 'the candidate'
      const company = (doc as any)?.company || (doc as any)?.targetCompany || 'the company'
      const role = (doc as any)?.targetRole || 'the role'
      const level = (doc as any)?.seniority || 'mid'

      const totalSeconds = (doc.plannedDuration || 30) * 60
      const elapsedSeconds = doc.startedAt ? Math.floor((Date.now() - doc.startedAt.getTime()) / 1000) : 0
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)
      const remainingTimeInMinutes = Math.ceil(remainingSeconds / 60)
      const currentQuestionBudget = currentQuestion?.estimatedMinutes || 5

      const historyLines: string[] = []
      const recent = turns.slice(-8)
      for (const turn of recent) {
        const label = turn.speaker === 'interviewer' ? personaName : candidateName
        historyLines.push(`${label}: ${turn.text.slice(0, 200)}`)
      }

      const followUpText = currentQuestion?.followUpTriggers?.length
        ? currentQuestion.followUpTriggers.map(t => `If candidate says "${t.condition}", ask: "${t.followUp}"`).join('\n')
        : 'None specified'

      const turnInstructions = this.buildTurnInstructions(state, turns, questionPlan, remainingTimeInMinutes, currentQuestionBudget)

      const systemPrompt = INTERVIEW_RESPONSE_SYSTEM
        .replace(/\{interviewerName\}/g, personaName)
        .replace(/\{interviewerTitle\}/g, persona?.interviewerTitle || 'Interviewer')
        .replace(/\{company\}/g, company)
        .replace(/\{role\}/g, role)
        .replace(/\{level\}/g, level)
        .replace(/\{candidateName\}/g, candidateName)
        .replace(/\{tone\}/g, persona?.personality?.tone || 'professional')
        .replace(/\{phase\}/g, currentQuestion?.phase || 'general')
        .replace(/\{currentQuestionNumber\}/g, String(state.questionIndex + 1))
        .replace(/\{totalQuestions\}/g, String(questionPlan?.length || 0))
        .replace(/\{resumeSummary\}/g, this.buildResumeSummary(state.resumeContext))
        .replace(/\{conversationHistory\}/g, historyLines.join('\n') || 'No conversation yet.')
        .replace(/\{currentQuestion\}/g, currentQuestion?.primaryQuestion || 'Continue the conversation naturally.')
        .replace(/\{followUpTriggers\}/g, followUpText)
        .replace(/\{remainingTimeInMinutes\}/g, String(remainingTimeInMinutes))
        .replace(/\{currentQuestionBudget\}/g, String(currentQuestionBudget))
        .replace(/\{turnInstructions\}/g, turnInstructions)

      const thinkMs = 200 + Math.floor(Math.random() * 301)
      await new Promise(r => setTimeout(r, thinkMs))
      if (responseSent) return

      const responseText = await this.aiService.chatForInterview(
        systemPrompt,
        state.lastCandidateTranscript || '',
      )
      if (responseSent) return

      await this.interviewsService.addTurn(sessionId, {
        speaker: 'interviewer',
        questionPlanRef: state.questionIndex,
        text: responseText,
        timestamp: Date.now(),
        duration: 0,
      })

      let audioBase64: string | null = null
      if (this.deepgram.isConfigured) {
        audioBase64 = await this.deepgram.generateTtsBase64(responseText, persona?.interviewerName)
      }

      clearTimeout(timeout)
      responseSent = true
      this.server.to(sessionId).emit('interviewer_response', {
        text: responseText,
        audio: audioBase64,
        questionIndex: state.questionIndex,
      })

      state.isAiResponding = false
    } catch (err) {
      if (!responseSent) {
        responseSent = true
        this.logger.error(`AI response generation failed: ${(err as Error).message}`)
        state.isAiResponding = false
        this.server.to(sessionId).emit('interviewer_response', {
          text: "Could you repeat that? I didn't quite catch it.",
          audio: null,
          questionIndex: state.questionIndex,
        })
      }
      clearTimeout(timeout)
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

  private stripJsonFromResponse(text: string): string {
    let cleaned = text.trim()

    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleaned)
        const val = parsed?.response || parsed?.text || parsed?.message || parsed?.interviewerResponse
        if (typeof val === 'string' && val.length > 0) return val.trim()
        const values = Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 20)
        if (values.length > 0) return values[0]
      } catch {}
    }

    cleaned = cleaned.replace(/\{"[^"]+":\s*"/g, '').replace(/"\s*}\s*$/g, '').replace(/"[^"]*"\s*:/g, '').replace(/["{}[\]\\]/g, '').trim()
    return cleaned
  }

  @SubscribeMessage('barge_in')
  handleBargeIn(client: Socket, sessionId: string) {
    this.logger.debug(`[${client.id}] Barge-in detected`)
    this.server.to(sessionId).emit('barge_in_detected')
  }

  @SubscribeMessage('end_session')
  async handleEndSession(client: Socket, sessionId: string) {
    this.deepgram.closeSttConnection(client.id)
    this.server.to(sessionId).emit('session_ended')
  }
}
