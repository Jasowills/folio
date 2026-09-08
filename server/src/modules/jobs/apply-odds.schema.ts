import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ApplyOddsAssessmentDocument = ApplyOddsAssessment & Document;

@Schema({ timestamps: true })
export class ApplyOddsAssessment {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'JobListing',
  })
  jobId!: Types.ObjectId;

  @Prop({ type: Number, required: false })
  atsScore?: number;

  @Prop({ type: Number, required: false })
  listingAgeDays?: number;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'unknown'],
    default: 'unknown',
  })
  estimatedCompetitionLevel!: string;

  @Prop({
    type: String,
    enum: ['strong_apply', 'apply', 'long_shot', 'skip'],
    required: true,
  })
  recommendation!: string;

  @Prop({ type: [String], default: [] })
  reasoningNotes!: string[];

  @Prop()
  generatedAt!: Date;
}

export const ApplyOddsAssessmentSchema =
  SchemaFactory.createForClass(ApplyOddsAssessment);

ApplyOddsAssessmentSchema.index({ userId: 1, jobId: 1 }, { unique: true });
