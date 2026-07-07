import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

type LayoutDocument = Record<string, unknown>;

export type ResumeDocument = Resume & Document;

interface ResumeContact {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  website?: string | null;
  github?: string | null;
}

interface ResumeExperience {
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  current?: boolean;
  bullets: string[];
}

interface ResumeEducation {
  institution: string;
  degree: string;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
}

interface ResumeCertification {
  name: string;
  issuer?: string | null;
  date?: string | null;
}

interface RedFlag {
  message: string;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
  section: string;
  roleSpecific?: boolean;
}

interface ResumeQuality {
  layoutScore: number;
  linksScore: number;
  professionalismScore: number;
  readabilityScore: number;
  imagesAssessment: string;
  overallQuality: number;
  strengths: string[];
  issues: string[];
  suggestions: string[];
}

interface ResumeRoleInfo {
  role: string;
  seniority: string;
  industries: string[];
  confidence: number;
}

interface ResumeVersion {
  structured: Record<string, unknown>;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Resume {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop()
  name?: string;

  @Prop()
  title?: string;

  @Prop({ type: Object })
  contact?: ResumeContact;

  @Prop()
  summary?: string;

  @Prop({ type: [{ type: Object }] })
  experience?: ResumeExperience[];

  @Prop({ type: [{ type: Object }] })
  education?: ResumeEducation[];

  @Prop({ type: [String] })
  skills?: string[];

  @Prop({ type: [{ type: Object }] })
  certifications?: ResumeCertification[];

  @Prop({ type: [String] })
  languages?: string[];

  @Prop({ type: [{ type: Object }] })
  links?: Array<{ title: string; url: string }>;

  @Prop({ type: String, enum: ['upload', 'builder'], default: 'builder' })
  source?: string;

  @Prop({ type: Object })
  fileUrl?: string;

  @Prop()
  cloudinaryPublicId?: string;

  @Prop({ type: Object })
  rawText?: string;

  @Prop({ type: Object })
  layoutDocument?: LayoutDocument;

  @Prop({ type: Date, default: null })
  layoutDocumentUpdatedAt?: Date;

  @Prop({ type: [{ type: Object }] })
  redFlags?: RedFlag[];

  @Prop({ type: Object })
  quality?: ResumeQuality;

  @Prop({ type: Object })
  detectedRole?: ResumeRoleInfo;

  @Prop()
  score?: number;

  @Prop({ type: [{ type: Object }] })
  versions?: ResumeVersion[];

  @Prop()
  editMode?: string;

  @Prop({ type: Object })
  design?: Record<string, unknown>;

  @Prop({ type: [String] })
  sectionOrder?: string[];

  @Prop({ type: Object })
  wizardState?: {
    currentStep: number;
    completedSteps: number[];
    stepData: Record<string, unknown>;
    isComplete: boolean;
    selectedTemplate?: string;
  };
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
