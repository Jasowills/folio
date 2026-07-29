import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, Schema as MongooseSchema } from 'mongoose'

export type ReferralRequestDocument = ReferralRequest & Document

@Schema({ timestamps: true })
export class ReferralRequest {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Connection' })
  connectionId!: Types.ObjectId

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'JobListing' })
  jobListingId!: Types.ObjectId

  @Prop()
  draftMessage?: string

  @Prop()
  sentMessage?: string

  @Prop({ default: 'draft' })
  status!: 'draft' | 'sent' | 'replied' | 'declined'

  @Prop()
  sentAt?: Date

  @Prop()
  repliedAt?: Date

  @Prop()
  notes?: string
}

export const ReferralRequestSchema = SchemaFactory.createForClass(ReferralRequest)

ReferralRequestSchema.index({ userId: 1, status: 1 })
ReferralRequestSchema.index({ userId: 1, connectionId: 1, jobListingId: 1 }, { unique: true })
