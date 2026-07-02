import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { InterviewSession, InterviewSessionDocument, InterviewerPersona, InterviewQuestionPlan } from './schemas/interview-session.schema'
import { InterviewTranscript, InterviewTranscriptDocument, TranscriptTurn } from './schemas/interview-transcript.schema'
import { InterviewProctoring, InterviewProctoringDocument, ProctoringEvent } from './schemas/interview-proctoring.schema'
import { InterviewResult, InterviewResultDocument } from './schemas/interview-result.schema'
import { Resume, ResumeDocument } from '../resumes/schemas/resume.schema'
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
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
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

  async getResumeById(resumeId: string): Promise<ResumeDocument | null> {
    return this.resumeModel.findById(resumeId).exec()
  }

  async getTranscriptTurns(sessionId: string): Promise<TranscriptTurn[]> {
    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    return transcript?.turns || []
  }

  async generatePersona(sessionId: string, userId: string): Promise<InterviewerPersona> {
    const session = await this.getSession(sessionId, userId)
    if (session.interviewerPersona) {
      this.logger.log(`generatePersona: returning cached persona for session ${sessionId}`)
      return session.interviewerPersona
    }

    this.logger.log(`generatePersona: generating persona for session ${sessionId}`)

    // Await company research if a URL was provided
    let companyContext: Record<string, unknown> | undefined
    if (session.company?.url) {
      this.logger.log(`generatePersona: researching company at ${session.company.url}`)
      const data = await this.companyResearch.research(session.company.url)
      companyContext = data as unknown as Record<string, unknown>
      // Persist so future calls skip research
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        'company.researchData': companyContext,
      }).exec()
    }

    const resume = session.resumeId ? await this.getResumeById(session.resumeId.toString()) : null
    const resumeInfo = resume ? {
      name: resume.name || null,
      summary: resume.summary || null,
      skills: resume.skills || [],
      experience: (resume.experience || []).map((e) => ({
        company: e.company,
        title: e.title,
        years: e.endDate || e.current ? `${e.startDate || ''} – ${e.current ? 'Present' : e.endDate || ''}` : '',
        bullets: e.bullets?.slice(0, 3) || [],
      })),
      education: (resume.education || []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
      })),
    } : null

    const rawPersona = await this.aiService.chat(
      PERSONA_GENERATION_SYSTEM,
      JSON.stringify({
        role: session.role,
        level: session.level,
        interviewTypes: session.interviewTypes,
        company: session.company,
        companyContext,
        techStack: session.techStack,
        includesCoding: session.includesCoding,
        difficulty: session.difficulty,
        plannedDuration: session.plannedDuration,
        candidate: resumeInfo,
      }),
    )

    const personaData = rawPersona as Record<string, unknown>
    if (!personaData.interviewerName) {
      personaData.interviewerName = this.fallbackInterviewerName(session.role)
    }
    if (!personaData.interviewerTitle) {
      personaData.interviewerTitle = `${session.role} Interviewer`
    }
    if (!personaData.personality) {
      personaData.personality = { tone: 'warm', followUpStyle: 'supportive', pacePreference: 'measured' }
    }
    if (!personaData.evaluationPriorities) {
      personaData.evaluationPriorities = ['communication', 'problem solving', 'technical depth']
    }
    if (!personaData.openingStyle) {
      personaData.openingStyle = `Warm greeting by name, thank them for joining`
    }

    // Build companyContext from research data or defaults
    const brief = companyContext as Record<string, unknown> | undefined
    const companyCtx = {
      mission: String(brief?.mission ?? ''),
      values: Array.isArray(brief?.values) ? brief.values as string[] : [],
      recentNews: Array.isArray(brief?.recentNews) && (brief.recentNews as Array<Record<string, unknown>>).length > 0
        ? String((brief.recentNews as Array<Record<string, unknown>>)[0]?.headline ?? '')
        : null,
      productFocus: String(brief?.whatTheyBuild ?? ''),
      interviewStyleSignal: typeof brief?.interviewStyle === 'object' && brief.interviewStyle !== null
        ? String((brief.interviewStyle as Record<string, unknown>)?.summary ?? 'conversational')
        : 'conversational',
    }

    // Generate question plan server-side — the 1B model can't handle this complexity
    const questionPlan = this.generateQuestionPlan(session, personaData)

    const persona: InterviewerPersona = {
      interviewerName: String(personaData.interviewerName),
      interviewerTitle: String(personaData.interviewerTitle),
      personality: personaData.personality as InterviewerPersona['personality'],
      evaluationPriorities: personaData.evaluationPriorities as string[],
      openingStyle: String(personaData.openingStyle),
      companyContext: companyCtx,
      questionPlan,
    }

    if (!persona.interviewerName || !persona.questionPlan || persona.questionPlan.length === 0) {
      throw new BadRequestException('Persona generation returned incomplete data')
    }

    session.interviewerPersona = persona
    session.questionPlan = persona.questionPlan
    await session.save()

    this.logger.log(`generatePersona: persona "${persona.interviewerName}" generated with ${persona.questionPlan.length} questions`)
    return persona
  }

  private generateQuestionPlan(
    session: InterviewSessionDocument,
    persona: Record<string, unknown>,
  ): InterviewQuestionPlan[] {
    const name = String(persona.interviewerName || 'your interviewer')
    const plans: InterviewQuestionPlan[] = []

    // 1. Opening / Introduction
    plans.push({
      order: 1,
      phase: 'opening',
      topic: 'Introduction',
      basedOn: 'general',
      resumeReference: null,
      primaryQuestion: `Hello, I'm ${name}. Thank you for joining me today. To get started, could you please introduce yourself and walk me through your background and what led you to apply for this ${session.role} role?`,
      followUpTriggers: [{ condition: 'candidate mentions specific experience', followUp: 'That sounds interesting. Could you tell me more about what you learned from that experience?' }],
      estimatedMinutes: 3,
      evaluationCriteria: ['communication', 'self_awareness'],
    })

    // 2. Behavioural / experience question
    plans.push({
      order: 2,
      phase: 'behavioural',
      topic: 'Experience & Impact',
      basedOn: 'role',
      resumeReference: null,
      primaryQuestion: `That's great context. Could you tell me about a project or accomplishment from your ${session.level} engineering career that you're particularly proud of? What impact did it have, and what was your specific contribution?`,
      followUpTriggers: [
        { condition: 'candidate mentions team work', followUp: 'How did you collaborate with others on that project?' },
        { condition: 'candidate mentions challenges', followUp: 'What was the toughest challenge you faced there and how did you overcome it?' },
      ],
      estimatedMinutes: 5,
      evaluationCriteria: ['experience_depth', 'impact', 'leadership'],
    })

    // 3. Technical question (if tech stack available)
    const tech = session.techStack || []
    if (tech.length > 0) {
      const mainTechs = tech.slice(0, 3).join(', ')
      plans.push({
        order: 3,
        phase: 'technical',
        topic: 'Technical Problem Solving',
        basedOn: 'role',
        resumeReference: null,
        primaryQuestion: `I'd love to dive into the technical side for a moment. You've worked with ${mainTechs} — could you walk me through a particularly challenging technical problem you solved and how you approached it?`,
        followUpTriggers: [
          { condition: 'candidate describes solution', followUp: "That's a solid approach. Were there any trade-offs you had to consider?" },
          { condition: 'candidate mentions architecture', followUp: 'How did you ensure the solution was scalable and maintainable?' },
        ],
        estimatedMinutes: 5,
        evaluationCriteria: ['technical_depth', 'problem_solving', 'architectural_thinking'],
      })
    }

    // 4. Company-specific question
    const company = session.company?.name
    if (company) {
      plans.push({
        order: plans.length + 1,
        phase: plans.length < 3 ? 'technical' : 'behavioural',
        topic: `Interest in ${company}`,
        basedOn: 'company',
        resumeReference: null,
        primaryQuestion: `I'm curious — what drew you to ${company} and this particular role? What aspects of the work we're doing here excite you most?`,
        followUpTriggers: [
          { condition: 'candidate mentions company mission', followUp: 'How does your personal values align with our mission?' },
          { condition: 'candidate mentions technology', followUp: 'What kind of impact do you hope to make in this role?' },
        ],
        estimatedMinutes: 4,
        evaluationCriteria: ['cultural_fit', 'motivation', 'company_research'],
      })
    }

    // 5. Closing
    plans.push({
      order: plans.length + 1,
      phase: 'closing',
      topic: 'Next Steps',
      basedOn: 'general',
      resumeReference: null,
      primaryQuestion: `We're almost done! Is there anything else you'd like to add or any questions you have about the ${company || 'this'} role, the team, or what it's like to work here?`,
      followUpTriggers: [],
      estimatedMinutes: 2,
      evaluationCriteria: ['curiosity', 'engagement', 'preparation'],
    })

    return plans
  }

  private fallbackInterviewerName(role: string): string {
    const names = ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Sam', 'Taylor', 'Avery', 'Quinn', 'Harper']
    const seed = role.length + role.charCodeAt(0)
    return names[seed % names.length]
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
    let transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    if (!transcript) {
      transcript = await this.transcriptModel.create({ sessionId, turns: [] })
    }
    transcript.turns.push(turn)
    await transcript.save()
  }

  async hasTranscriptTurns(sessionId: string): Promise<boolean> {
    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    return transcript ? transcript.turns.length > 0 : false
  }

  buildGreeting(session: InterviewSessionDocument, candidateName?: string | null): string | null {
    const persona = session.interviewerPersona as InterviewerPersona | undefined
    if (!persona?.interviewerName) return null
    const title = persona.interviewerTitle || ''
    const role = session.role || ''
    const duration = session.plannedDuration || 30
    const name = persona.interviewerName
    const greeting = candidateName
      ? `Hi ${candidateName}, I'm ${name}${title ? `, ${title}` : ''}. Thank you for joining me today. I'll be interviewing you for the ${role} position. We'll spend about ${duration} minutes discussing your background and expertise. Feel free to take a moment to think before answering. Let's get started.`
      : `Hi, I'm ${name}${title ? `, ${title}` : ''}. I'll be interviewing you today for the ${role} position. We'll spend about ${duration} minutes discussing your experience and expertise. Feel free to take a moment to think before answering. Let's get started.`
    return greeting
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
