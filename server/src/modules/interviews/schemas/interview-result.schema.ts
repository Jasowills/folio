import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type InterviewResultDocument = InterviewResult & Document

export interface DimensionScore {
  name: string
  score: number
}

export interface PerQuestionScore {
  questionPlanRef: number
  score: number
  feedback: string
  modelAnswer: string
}

@Schema({ timestamps: true })
export class InterviewResult {
  @Prop({ required: true, type: Types.ObjectId, ref: 'InterviewSession' })
  sessionId!: Types.ObjectId

  @Prop({ required: true })
  overallScore!: number

  @Prop()
  headline?: string

  @Prop({ type: [{ type: Object }] })
  dimensionScores?: DimensionScore[]

  @Prop()
  confidenceLevel?: string

  @Prop({ type: [{ type: Object }] })
  perQuestionScores?: PerQuestionScore[]

  @Prop({ type: [String] })
  nextSteps?: string[]
}

export const InterviewResultSchema = SchemaFactory.createForClass(InterviewResult)
