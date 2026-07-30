import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type JobMatchDocument = JobMatch & Document;

@Schema({ timestamps: true })
export class JobMatch {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'JobListing' })
  jobListingId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  resumeId!: Types.ObjectId;

  @Prop({ required: true })
  atsScore!: number;

  @Prop({ type: [String], default: [] })
  matchedKeywords!: string[];

  @Prop({ type: [String], default: [] })
  missingKeywords!: string[];

  @Prop({ type: Object, default: {} })
  sectionScores?: Record<string, number>;

  @Prop()
  matchIntelligenceLine?: string;

  @Prop()
  confidenceExplanation?: string;

  @Prop()
  scoredAt?: Date;
}

export const JobMatchSchema = SchemaFactory.createForClass(JobMatch);

JobMatchSchema.index({ userId: 1, jobListingId: 1 }, { unique: true });
JobMatchSchema.index({ userId: 1, atsScore: -1 });
