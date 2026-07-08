import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AtsScoreDocument = AtsScore & Document;

interface KeywordEntry {
  keyword: string;
  category: 'technical' | 'domain' | 'tool' | 'soft_skill' | 'certification';
  importance: 'critical' | 'important' | 'bonus';
}

interface RoleContext {
  detectedRole: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

@Schema({ timestamps: true })
export class AtsScore {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  resumeId!: Types.ObjectId;

  @Prop()
  jobTitle?: string;

  @Prop()
  companyName?: string;

  @Prop()
  jobDescription?: string;

  @Prop()
  jobUrl?: string;

  @Prop({ required: true })
  score!: number;

  @Prop({ type: [{ type: Object }] })
  matchedKeywords?: KeywordEntry[];

  @Prop({ type: [{ type: Object }] })
  missingKeywords?: KeywordEntry[];

  @Prop({ type: Object })
  sectionScores?: Record<string, number>;

  @Prop({ type: [String] })
  suggestions?: string[];

  @Prop()
  seniorityMatch?: string;

  @Prop({ type: Object })
  roleContext?: RoleContext;

  @Prop({ type: Object })
  resumeQuality?: {
    overallQuality: number;
    professionalismScore: number;
    readabilityScore: number;
  };
}

export const AtsScoreSchema = SchemaFactory.createForClass(AtsScore);
