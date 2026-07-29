import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Offer, OfferDocument } from './schemas/offer.schema'
import { Negotiation, NegotiationDocument } from './schemas/negotiation.schema'
import { AiService } from '../ai/ai.service'

@Injectable()
export class SalaryService {
  private readonly logger = new Logger(SalaryService.name)
  constructor(
    @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
    @InjectModel(Negotiation.name) private negotiationModel: Model<NegotiationDocument>,
    private aiService: AiService,
  ) {}

  async createOffer(userId: string, data: Partial<Offer>): Promise<OfferDocument> {
    const offer = await this.offerModel.create({ userId, ...data })
    this.logger.log(`createOffer: created ${offer._id} for ${data.companyName} — ${data.roleTitle}`)
    return offer
  }

  async getOffers(userId: string): Promise<OfferDocument[]> {
    return this.offerModel.find({ userId }).sort({ createdAt: -1 }).exec()
  }

  async getOffer(offerId: string, userId: string): Promise<OfferDocument> {
    const offer = await this.offerModel.findOne({ _id: offerId, userId }).exec()
    if (!offer) throw new NotFoundException('Offer not found')
    return offer
  }

  async updateOffer(offerId: string, userId: string, data: Record<string, unknown>): Promise<OfferDocument> {
    const offer = await this.offerModel
      .findOneAndUpdate({ _id: offerId, userId }, { $set: data }, { new: true })
      .exec()
    if (!offer) throw new NotFoundException('Offer not found')
    return offer
  }

  async deleteOffer(offerId: string, userId: string) {
    const offer = await this.offerModel.findOneAndDelete({ _id: offerId, userId }).exec()
    if (!offer) throw new NotFoundException('Offer not found')
    await this.negotiationModel.deleteOne({ offerId }).exec()
  }

  async generateStrategy(userId: string, offerId: string): Promise<NegotiationDocument> {
    const offer = await this.getOffer(offerId, userId)
    const existing = await this.negotiationModel.findOne({ offerId }).exec()
    if (existing?.strategy) return existing

    const raw = await this.aiService.chat(
      `You are a senior career coach and salary negotiation expert with deep knowledge of SWE compensation at all levels. Return valid JSON only.`,
      `Generate a salary negotiation strategy for a software engineer with this offer:

Company: ${offer.companyName}
Role: ${offer.roleTitle}
Location: ${offer.location || 'remote'}
Base Salary: ${offer.baseSalary ? `$${offer.baseSalary.toLocaleString()}` : 'not disclosed'}
Equity: ${offer.equityValue ? `$${offer.equityValue.toLocaleString()}` : 'not disclosed'}
Bonus: ${offer.bonusPercent ? `${offer.bonusPercent}%` : 'not disclosed'}
Benefits: ${(offer.benefits || []).join(', ') || 'not specified'}
Decision deadline: ${offer.deadline ? new Date(offer.deadline).toLocaleDateString() : 'not specified'}
Target salary: ${offer.targetBaseSalary ? `$${offer.targetBaseSalary.toLocaleString()}` : 'not set'}

Return JSON:
- benchmarkData: object with estimated baseSalaryP10, baseSalaryP25, baseSalaryP50, baseSalaryP75, baseSalaryP90 (integers), equityRange (string)
- strategy: string (2-3 paragraph negotiation strategy: what to lead with, what to trade, timeline)
- script: string (full email script the candidate can send or say — professional, persuasive, specific to this company and role)
- fallbackScript: string (shorter message if initial ask is rejected — pivot to equity/bonus/benefits)
- pitchPoints: string (3-4 bullet points of the candidate's strongest leverage points)
- confidence: one of "low", "medium", "high" based on how strong the offer is relative to market`,
    )

    const parsed = typeof raw === 'object' ? raw : JSON.parse(String(raw))

    const negotiation = existing
      ? await this.negotiationModel
          .findByIdAndUpdate(existing._id, {
            $set: {
              strategy: parsed.strategy,
              script: parsed.script,
              fallbackScript: parsed.fallbackScript,
              benchmarkData: parsed.benchmarkData,
              pitchPoints: parsed.pitchPoints,
              confidence: parsed.confidence,
              stage: 'ready',
            },
          }, { new: true })
          .exec()
      : await this.negotiationModel.create({
          offerId,
          userId,
          strategy: parsed.strategy,
          script: parsed.script,
          fallbackScript: parsed.fallbackScript,
          benchmarkData: parsed.benchmarkData,
          pitchPoints: parsed.pitchPoints,
          confidence: parsed.confidence,
          stage: 'ready',
        })

    this.logger.log(`generateStrategy: created negotiation ${negotiation!._id} for offer ${offerId}`)
    return negotiation!
  }

  async getNegotiation(offerId: string, userId: string): Promise<NegotiationDocument | null> {
    await this.getOffer(offerId, userId)
    return this.negotiationModel.findOne({ offerId }).exec()
  }

  async updateNegotiation(
    offerId: string,
    userId: string,
    data: { script?: string; stage?: string; outcome?: string },
  ): Promise<NegotiationDocument> {
    await this.getOffer(offerId, userId)
    const update: Record<string, unknown> = {}
    if (data.script) update.script = data.script
    if (data.stage === 'sent') {
      update.stage = 'sent'
      update.sentAt = new Date()
    } else if (data.stage === 'resolved') {
      update.stage = 'resolved'
      update.resolvedAt = new Date()
    } else if (data.stage) {
      update.stage = data.stage
    }
    if (data.outcome) update.outcome = data.outcome

    const negotiation = await this.negotiationModel
      .findOneAndUpdate({ offerId, userId }, { $set: update }, { new: true })
      .exec()
    if (!negotiation) throw new NotFoundException('Negotiation not found for this offer')
    return negotiation
  }

  async getAllNegotiations(userId: string) {
    return this.negotiationModel.find({ userId }).sort({ updatedAt: -1 }).populate('offerId').exec()
  }
}
