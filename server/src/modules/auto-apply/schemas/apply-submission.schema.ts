import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ApplySubmissionDocument = ApplySubmission & Document;

export interface ApplyField {
  fieldName: string;
  fieldValue: string;
  autoFilled: boolean;
  editable: boolean;
}

export interface ActivityLogEntry {
  action: string;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class ApplySubmission {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'JobListing' })
  jobListingId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  resumeId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CoverLetter' })
  coverLetterId?: Types.ObjectId;

  @Prop({ required: true, enum: [
    'approved', 'filling', 'ready_for_review', 'submitted', 'failed',
  ], default: 'approved' })
  status!: string;

  @Prop({ required: true })
  atsPlatform!: string;

  @Prop({ required: true })
  applicationUrl!: string;

  @Prop({ type: [{ fieldName: String, fieldValue: String, autoFilled: Boolean, editable: Boolean }], default: [] })
  filledFields?: ApplyField[];

  @Prop()
  failureReason?: string;

  @Prop()
  submittedAt?: Date;

  @Prop({ default: 0 })
  retryCount!: number;

  @Prop({ type: [{ action: String, timestamp: Date }], default: [] })
  activityLog!: ActivityLogEntry[];
}

export const ApplySubmissionSchema = SchemaFactory.createForClass(ApplySubmission);

ApplySubmissionSchema.index({ userId: 1, status: 1 });
ApplySubmissionSchema.index({ userId: 1, jobListingId: 1 }, { unique: true });
