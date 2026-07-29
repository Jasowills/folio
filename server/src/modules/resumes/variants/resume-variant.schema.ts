import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ResumeVariantDocument = ResumeVariant & Document;

export interface ModifiedBullet {
  sectionId: string;
  bulletIndex: number;
  before: string;
  after: string;
}

export interface ResumeContentDiff {
  addedSections?: string[];
  removedSections?: string[];
  reorderedSections?: string[];
  modifiedBullets?: ModifiedBullet[];
  summaryChange?: { before: string; after: string };
  skillsChange?: { added: string[]; removed: string[]; reordered: boolean };
}

@Schema({ timestamps: true })
export class ResumeVariant {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  baseResumeId!: Types.ObjectId;

  @Prop({ required: true })
  templateId!: string;

  @Prop({ type: Object, required: true })
  contentDiff!: ResumeContentDiff;

  @Prop({ type: Object, required: true })
  frozenSnapshot!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'JobListing' })
  tailoredForJobId?: Types.ObjectId;

  @Prop()
  label?: string;
}

export const ResumeVariantSchema = SchemaFactory.createForClass(ResumeVariant);

ResumeVariantSchema.index({ userId: 1, baseResumeId: 1 });
ResumeVariantSchema.index({ tailoredForJobId: 1 });
