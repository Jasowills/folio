import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AutoApplyProfileDocument = AutoApplyProfile & Document;

class LogisticsAnswers {
  @Prop({ required: true, enum: ['immediately', 'two_weeks', 'one_month', 'custom'] })
  availabilityToStart: string;

  @Prop()
  availabilityCustomNote?: string;

  @Prop({ required: true })
  visaSponsorshipNeeded: boolean;

  @Prop({ required: true })
  workAuthorizationStatus: string;

  @Prop({ required: true })
  willingToRelocate: boolean;

  @Prop()
  relocationNotes?: string;

  @Prop()
  desiredSalaryMin?: number;

  @Prop()
  desiredSalaryMax?: number;

  @Prop({ default: 'USD' })
  salaryCurrency: string;

  @Prop({ required: true, enum: ['remote_only', 'hybrid_ok', 'onsite_ok', 'flexible'] })
  remotePreference: string;

  @Prop()
  noticePeriod?: string;

  @Prop({ required: true })
  hasNonCompete: boolean;

  @Prop()
  nonCompeteNotes?: string;
}

class CustomAnswerEntry {
  @Prop({ required: true })
  questionPattern: string;

  @Prop({ required: true })
  answerTemplate: string;

  @Prop({ default: false })
  isSensitive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

class ApplicationStyle {
  @Prop({ required: true, enum: ['formal', 'professional_warm', 'concise_direct', 'enthusiastic'] })
  tone: string;

  @Prop({ required: true, enum: ['brief', 'standard', 'detailed'] })
  lengthPreference: string;

  @Prop({ default: true })
  writeInFirstPerson: boolean;

  @Prop({ type: [String], default: [] })
  avoidPhrases?: string[];

  @Prop()
  sampleAnswer?: string;
}

@Schema({ timestamps: true })
export class AutoApplyProfile {
  @Prop({ required: true, unique: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: LogisticsAnswers })
  logisticsAnswers: LogisticsAnswers;

  @Prop({ type: [CustomAnswerEntry], default: [] })
  customQA: CustomAnswerEntry[];

  @Prop({ required: true, type: ApplicationStyle })
  applicationStyle: ApplicationStyle;

  @Prop({ default: false })
  completedRequiredSetup: boolean;

  @Prop({ default: Date.now })
  lastUpdatedAt: Date;

  @Prop({ default: 0 })
  wizardStep: number;
}

export const AutoApplyProfileSchema = SchemaFactory.createForClass(AutoApplyProfile);
