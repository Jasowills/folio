import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;

export interface InterviewQuestionPlan {
  order: number;
  phase:
    | 'opening'
    | 'behavioural'
    | 'technical'
    | 'system_design'
    | 'case_study'
    | 'closing';
  topic: string;
  basedOn: 'resume' | 'role' | 'company' | 'general';
  resumeReference: string | null;
  primaryQuestion: string;
  followUpTriggers: Array<{ condition: string; followUp: string }>;
  estimatedMinutes: number;
  evaluationCriteria: string[];
}

export interface InterviewerPersona {
  interviewerName: string;
  interviewerTitle: string;
  personality: {
    tone: 'warm' | 'neutral' | 'rigorous';
    followUpStyle: 'probing' | 'supportive' | 'challenging';
    pacePreference: 'fast' | 'measured';
  };
  evaluationPriorities: string[];
  openingStyle: string;
  companyContext: {
    mission: string | null;
    values: string[];
    recentNews: string | null;
    productFocus: string | null;
    interviewStyleSignal: string;
  };
  questionPlan: InterviewQuestionPlan[];
}

@Schema({ timestamps: true })
export class InterviewSession {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume', required: true })
  resumeId!: Types.ObjectId;

  @Prop({ required: true })
  role!: string;

  @Prop({ required: true })
  level!: string;

  @Prop({ type: Object })
  company?: {
    name: string;
    url?: string;
    researchData?: Record<string, unknown>;
  };

  @Prop({ type: [String], required: true })
  interviewTypes!: string[];

  @Prop({ type: [String] })
  techStack?: string[];

  @Prop({ default: false })
  includesCoding?: boolean;

  @Prop({ default: 'mixed' })
  difficulty?: string;

  @Prop({ required: true })
  plannedDuration!: number;

  @Prop({ default: 'setup' })
  status!: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned';

  @Prop({ type: Object })
  interviewerPersona?: InterviewerPersona;

  @Prop({ type: [{ type: Object }] })
  questionPlan?: InterviewQuestionPlan[];

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop()
  actualDuration?: number;

  @Prop({ default: 0 })
  pausesRemaining?: number;

  @Prop({ default: 0 })
  pauseSecondsRemaining?: number;
}

export const InterviewSessionSchema =
  SchemaFactory.createForClass(InterviewSession);
