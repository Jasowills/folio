import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { InterviewSession, InterviewSessionDocument, InterviewerPersona } from './schemas/interview-session.schema'
import { InterviewTranscript, InterviewTranscriptDocument, TranscriptTurn } from './schemas/interview-transcript.schema'
import { InterviewProctoring, InterviewProctoringDocument, ProctoringEvent } from './schemas/interview-proctoring.schema'
import { InterviewResult, InterviewResultDocument } from './schemas/interview-result.schema'
import { AiService } from '../ai/ai.service'
import { ResumeParserService } from '../resumes/resume-parser.service'
import { CompanyResearchService } from './company-research.service'
import { PERSONA_GENERATION_SYSTEM, INTERVIEW_SCORING_SYSTEM } from '../ai/prompts'

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name)

  constructor(
    @InjectModel(InterviewSession.name) private sessionModel: Model<InterviewSessionDocument>,
    @InjectModel(InterviewTranscript.name) private transcriptModel: Model<InterviewTranscriptDocument>,
    @InjectModel(InterviewProctoring.name) private proctoringModel: Model<InterviewProctoringDocument>,
    @InjectModel(InterviewResult.name) private resultModel: Model<InterviewResultDocument>,
    private aiService: AiService,
    private resumeParser: ResumeParserService,
    private companyResearch: CompanyResearchService,
  ) {}

  async createSession(
    userId: string,
    data: {
      resumeId: string
      role: string
      level: string
      interviewTypes: string[]
      company?: { name: string; url?: string }
      techStack?: string[]
      includesCoding?: boolean
      difficulty?: string
      plannedDuration: number
    },
  ): Promise<InterviewSessionDocument> {
    const session = await this.sessionModel.create({
      userId,
      resumeId: data.resumeId,
      role: data.role,
      level: data.level,
      company: data.company,
      interviewTypes: data.interviewTypes,
      techStack: data.techStack,
      includesCoding: data.includesCoding,
      difficulty: data.difficulty,
      plannedDuration: data.plannedDuration,
      pausesRemaining: 2,
      pauseSecondsRemaining: 120,
    })

    if (data.company?.url) {
      this.companyResearch.research(data.company.url).then((researchData) => {
        this.sessionModel.findByIdAndUpdate(session._id, {
          'company.researchData': researchData,
        }).exec().catch((err) => this.logger.error(`Failed to save company research: ${err.message}`))
      }).catch((err) => this.logger.warn(`Company research failed (non-blocking): ${err.message}`))
    }

    this.logger.log(`createSession: created session ${session._id} for role="${data.role}" level="${data.level}"`)
    return session
  }

  async getSession(sessionId: string, userId: string): Promise<InterviewSessionDocument> {
    const session = await this.sessionModel.findOne({ _id: sessionId, userId }).exec()
    if (!session) throw new NotFoundException('Interview session not found')
    return session
  }

  async getSessionForAi(sessionId: string): Promise<InterviewSessionDocument | null> {
    return this.sessionModel.findById(sessionId).exec()
  }

  async generatePersona(sessionId: string, userId: string): Promise<InterviewerPersona> {
    const session = await this.getSession(sessionId, userId)
    if (session.interviewerPersona) {
      this.logger.log(`generatePersona: returning cached persona for session ${sessionId}`)
      return session.interviewerPersona
    }

    this.logger.log(`generatePersona: generating persona for session ${sessionId}`)
    const persona = await this.aiService.chat(
      PERSONA_GENERATION_SYSTEM,
      JSON.stringify({
        role: session.role,
        level: session.level,
        interviewTypes: session.interviewTypes,
        company: session.company,
        techStack: session.techStack,
        includesCoding: session.includesCoding,
        difficulty: session.difficulty,
        plannedDuration: session.plannedDuration,
      }),
    )

    const personaData = persona as unknown as InterviewerPersona
    if (!personaData.interviewerName || !personaData.questionPlan) {
      throw new BadRequestException('Persona generation returned incomplete data')
    }

    session.interviewerPersona = personaData
    session.questionPlan = personaData.questionPlan
    await session.save()

    this.logger.log(`generatePersona: persona "${personaData.interviewerName}" generated with ${personaData.questionPlan.length} questions`)
    return personaData
  }

  async startSession(sessionId: string, userId: string): Promise<InterviewSessionDocument> {
    const session = await this.getSession(sessionId, userId)
    session.status = 'in_progress'
    session.startedAt = new Date()
    await session.save()

    await this.transcriptModel.create({ sessionId: session._id, turns: [] })
    await this.proctoringModel.create({ sessionId: session._id, events: [] })

    return session
  }

  async addTurn(sessionId: string, turn: TranscriptTurn): Promise<void> {
    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    if (!transcript) throw new NotFoundException('Transcript not found')
    transcript.turns.push(turn)
    await transcript.save()
  }

  async addProctoringEvent(sessionId: string, event: ProctoringEvent): Promise<void> {
    const proctoring = await this.proctoringModel.findOne({ sessionId }).exec()
    if (!proctoring) {
      await this.proctoringModel.create({ sessionId, events: [event] })
      return
    }
    proctoring.events.push(event)
    await proctoring.save()
  }

  async endSession(sessionId: string, userId: string): Promise<InterviewSessionDocument> {
    const session = await this.getSession(sessionId, userId)
    session.status = 'completed'
    session.endedAt = new Date()
    if (session.startedAt) {
      session.actualDuration = Math.round((Date.now() - session.startedAt.getTime()) / 1000)
    }
    await session.save()

    // Score proctoring
    await this.calculateProctoringScore(sessionId)
    // Generate results
    await this.generateResults(sessionId, userId)

    return session
  }

  private async calculateProctoringScore(sessionId: string): Promise<void> {
    const proctoring = await this.proctoringModel.findOne({ sessionId }).exec()
    if (!proctoring) return

    const severityWeights: Record<string, number> = { high: 15, medium: 5, low: 1 }
    let penalty = 0
    for (const event of proctoring.events) {
      penalty += severityWeights[event.severity] || 0
    }

    proctoring.integrityScore = Math.max(0, 100 - penalty)

    const eventCounts: Record<string, number> = {}
    for (const event of proctoring.events) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
    }
    const summaries: string[] = []
    for (const [type, count] of Object.entries(eventCounts)) {
      summaries.push(`${count} ${type.replace(/_/g, ' ')} event(s)`)
    }
    proctoring.summary = summaries.length > 0
      ? `Detected: ${summaries.join(', ')}. This is within normal range for a practice setting.`
      : 'No proctoring events detected.'

    await proctoring.save()
  }

  private async generateResults(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId)
    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    const proctoring = await this.proctoringModel.findOne({ sessionId }).exec()

    const scoringInput = {
      role: session.role,
      level: session.level,
      interviewTypes: session.interviewTypes,
      persona: session.interviewerPersona,
      questionPlan: session.questionPlan,
      transcript: transcript?.turns || [],
      proctoring: {
        events: proctoring?.events || [],
        integrityScore: proctoring?.integrityScore,
      },
    }

    try {
      const result = await this.aiService.chat(
        INTERVIEW_SCORING_SYSTEM,
        JSON.stringify(scoringInput),
      )

      await this.resultModel.create({
        sessionId,
        overallScore: (result as any)?.overallScore ?? 0,
        headline: (result as any)?.headline || '',
        dimensionScores: (result as any)?.dimensionScores || [],
        confidenceLevel: (result as any)?.confidenceLevel || 'developing',
        perQuestionScores: (result as any)?.perQuestionScores || [],
        nextSteps: (result as any)?.nextSteps || [],
      })
    } catch (err) {
      this.logger.error(`generateResults: AI scoring failed — ${(err as Error).message}`)
      await this.resultModel.create({
        sessionId,
        overallScore: 0,
        headline: 'Scoring failed. Please try again.',
        nextSteps: ['Re-run the interview scoring'],
      })
    }
  }

  async getResults(sessionId: string, userId: string): Promise<{
    session: InterviewSessionDocument
    transcript: InterviewTranscriptDocument | null
    proctoring: InterviewProctoringDocument | null
    results: InterviewResultDocument | null
  }> {
    const session = await this.getSession(sessionId, userId)
    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    const proctoring = await this.proctoringModel.findOne({ sessionId }).exec()
    const results = await this.resultModel.findOne({ sessionId }).exec()
    return { session, transcript, proctoring, results }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId)
    await Promise.all([
      this.sessionModel.deleteOne({ _id: sessionId }),
      this.transcriptModel.deleteOne({ sessionId }),
      this.proctoringModel.deleteOne({ sessionId }),
      this.resultModel.deleteOne({ sessionId }),
    ])
  }
}
