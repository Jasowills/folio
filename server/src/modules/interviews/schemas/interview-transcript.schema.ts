import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, Schema as MongooseSchema } from 'mongoose'

export type InterviewTranscriptDocument = InterviewTranscript & Document

export interface TranscriptTurn {
  speaker: 'interviewer' | 'candidate'
  questionPlanRef: number | null
  text: string
  audioUrl?: string
  timestamp: number
  duration: number
  satisfaction?: 'satisfied' | 'partial' | 'unsatisfied'
}

export interface CodeSubmission {
  questionPlanRef: number
  language: string
  code: string
  testResults?: Record<string, unknown>
  timestamp: number
}

@Schema({ timestamps: true })
export class InterviewTranscript {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'InterviewSession' })
  sessionId!: Types.ObjectId

  @Prop({ type: [{ type: Object }] })
  turns!: TranscriptTurn[]

  @Prop({ type: [{ type: Object }] })
  codeSubmissions?: CodeSubmission[]
}

export const InterviewTranscriptSchema = SchemaFactory.createForClass(InterviewTranscript)
