import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { FollowUp, FollowUpDocument } from './schemas/follow-up.schema'
import { InterviewSession } from './schemas/interview-session.schema'
import { InterviewTranscript } from './schemas/interview-transcript.schema'
import { InterviewResult } from './schemas/interview-result.schema'
import { AiService } from '../ai/ai.service'

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name)
  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUpDocument>,
    @InjectModel(InterviewSession.name) private sessionModel: Model<InterviewSession>,
    @InjectModel(InterviewTranscript.name) private transcriptModel: Model<InterviewTranscript>,
    @InjectModel(InterviewResult.name) private resultModel: Model<InterviewResult>,
    private aiService: AiService,
  ) {}

  async getFollowUps(sessionId: string, userId: string): Promise<FollowUpDocument[]> {
    const session = await this.sessionModel.findOne({ _id: sessionId, userId }).exec()
    if (!session) throw new NotFoundException('Interview session not found')
    return this.followUpModel.find({ sessionId, userId }).sort({ createdAt: -1 }).exec()
  }

  async generateDraft(sessionId: string, userId: string): Promise<FollowUpDocument> {
    const session = await this.sessionModel.findOne({ _id: sessionId, userId }).exec()
    if (!session) throw new NotFoundException('Interview session not found')

    const existingDraft = await this.followUpModel
      .findOne({ sessionId, userId, status: { $in: ['draft', 'generated', 'edited'] } })
      .exec()
    if (existingDraft) return existingDraft

    const transcript = await this.transcriptModel.findOne({ sessionId }).exec()
    const result = await this.resultModel.findOne({ sessionId }).exec()

    const prompt = `Generate a thank-you follow-up email after a ${session.role} interview.

Session details:
- Role: ${session.role}
- Level: ${session.level}
- Company: ${session.company?.name || 'the company'}
- Interviewer: ${session.interviewerPersona?.interviewerName || 'the interviewer'}
- Interview type(s): ${(session.interviewTypes || []).join(', ')}

${result ? `Score: ${result.overallScore}/100. Key feedback: ${result.headline || ''}` : ''}

${transcript?.turns?.length ? `The candidate answered ${transcript.turns.filter(t => t.speaker === 'candidate').length} questions.` : ''}

Return a JSON object with:
- subject (string): email subject line
- body (string): the full email body — professional, specific to the role and company, references something mentioned in the interview
- tone (string): one of "warm", "professional", "enthusiastic"`

    const raw = await this.aiService.chat(
      `You are a career coach helping a software engineer write interview follow-up emails. Return valid JSON only.`,
      prompt,
    )

    const parsed = (typeof raw === 'object' ? raw : JSON.parse(String(raw))) as { subject: string; body: string; tone: string }

    const followUp = await this.followUpModel.create({
      sessionId,
      userId,
      recipientName: session.interviewerPersona?.interviewerName,
      companyName: session.company?.name,
      role: session.role,
      status: 'generated',
      draftContent: `Subject: ${parsed.subject}\n\n${parsed.body}`,
      generatedAt: new Date(),
    })

    this.logger.log(`generateDraft: created follow-up ${followUp._id} for session ${sessionId}`)
    return followUp
  }

  async updateFollowUp(
    id: string,
    userId: string,
    body: { draftContent?: string; status?: string; sentContent?: string },
  ): Promise<FollowUpDocument> {
    const update: Record<string, unknown> = {}
    if (body.draftContent !== undefined) {
      update.draftContent = body.draftContent
      update.status = 'edited'
    }
    if (body.status === 'sent') {
      update.status = 'sent'
      update.sentContent = body.sentContent || update.draftContent
      update.sentAt = new Date()
    }
    const followUp = await this.followUpModel
      .findOneAndUpdate({ _id: id, userId }, { $set: update }, { new: true })
      .exec()
    if (!followUp) throw new NotFoundException('Follow-up not found')
    return followUp
  }
}
