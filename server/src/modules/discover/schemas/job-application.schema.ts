import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobApplicationDocument = JobApplication & Document;

export interface ChecklistState {
  resumeTailored: boolean;
  coverLetterGenerated: boolean;
  companyResearched: boolean;
  interviewPracticed: boolean;
  followUpSent: boolean;
}

export interface ActivityLogEntry {
  action: string;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class JobApplication {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'JobListing' })
  jobListingId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resume' })
  resumeId!: Types.ObjectId;

  @Prop({ required: true, enum: [
    'saved', 'tailoring', 'applied', 'phone_screen',
    'technical', 'final_round', 'offer', 'accepted',
    'rejected', 'ghosted',
  ], default: 'saved' })
  stage!: string;

  @Prop()
  coverLetterId?: string;

  @Prop()
  interviewSessionId?: string;

  @Prop()
  researchBriefId?: string;

  @Prop()
  appliedAt?: Date;

  @Prop()
  lastActivityAt?: Date;

  @Prop({ type: String, default: '' })
  notes!: string;

  @Prop({ type: Object, default: {
    resumeTailored: false,
    coverLetterGenerated: false,
    companyResearched: false,
    interviewPracticed: false,
    followUpSent: false,
  }})
  checklistState!: ChecklistState;

  @Prop({ type: [{ action: String, timestamp: Date }], default: [] })
  activityLog!: ActivityLogEntry[];

  @Prop()
  trackedAt?: Date;

  @Prop({ default: false })
  isDeleted?: boolean;
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);

JobApplicationSchema.index({ userId: 1, stage: 1 });
JobApplicationSchema.index({ userId: 1, jobListingId: 1 }, { unique: true });
JobApplicationSchema.index({ userId: 1, lastActivityAt: -1 });
