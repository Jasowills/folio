import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type InterviewProctoringDocument = InterviewProctoring & Document

export interface ProctoringEvent {
  timestamp: number
  type: 'gaze_offscreen' | 'multiple_faces' | 'tab_switch' | 'window_blur' | 'long_silence' | 'second_voice' | 'large_paste' | 'fast_typing_burst'
  severity: 'low' | 'medium' | 'high'
  duration: number | null
  metadata?: Record<string, unknown>
}

@Schema({ timestamps: true })
export class InterviewProctoring {
  @Prop({ required: true, type: Types.ObjectId, ref: 'InterviewSession' })
  sessionId!: Types.ObjectId

  @Prop({ type: [{ type: Object }] })
  events!: ProctoringEvent[]

  @Prop({ default: 100 })
  integrityScore?: number

  @Prop()
  summary?: string
}

export const InterviewProctoringSchema = SchemaFactory.createForClass(InterviewProctoring)
