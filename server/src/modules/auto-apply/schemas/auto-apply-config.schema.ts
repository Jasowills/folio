import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AutoApplyConfigDocument = AutoApplyConfig & Document;

@Schema({ timestamps: true })
export class AutoApplyConfig {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  autoAttachCoverLetter!: boolean;

  @Prop({ default: 3 })
  maxConcurrentSubmissions!: number;

  @Prop({ default: true })
  requirePreviewApproval!: boolean;

  @Prop({ type: Object, default: {} })
  defaultAnswers?: Record<string, string>;

  // Personalization
  @Prop()
  applicationStyle?: 'professional' | 'enthusiastic' | 'concise' | 'detailed' | 'technical';

  @Prop()
  availableFrom?: string;

  @Prop()
  needsVisaSponsorship?: boolean;

  @Prop()
  salaryExpectations?: string;

  @Prop()
  preferredLocation?: string;

  @Prop()
  willingToRelocate?: boolean;

  @Prop()
  willingToTravel?: boolean;

  @Prop()
  personalSummary?: string;

  @Prop()
  linkedInUrl?: string;

  @Prop()
  portfolioUrl?: string;

  @Prop()
  githubUrl?: string;

  @Prop()
  websiteUrl?: string;
}

export const AutoApplyConfigSchema = SchemaFactory.createForClass(AutoApplyConfig);
