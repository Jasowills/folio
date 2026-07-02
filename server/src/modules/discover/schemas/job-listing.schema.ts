import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobListingDocument = JobListing & Document;

@Schema({ timestamps: true })
export class JobListing {
  @Prop({ required: true, enum: [
    'greenhouse', 'lever', 'workday', 'weworkremotely', 'remoteok',
    'otta', 'hn', 'cryptojobslist', 'bitcoinerjobs', 'ycombinator',
    'twitter', 'linkedin', 'manual',
  ]})
  source!: string;

  @Prop({ required: true })
  sourceId!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop()
  companyLogoUrl?: string;

  @Prop({ required: true })
  roleTitle!: string;

  @Prop()
  location?: string;

  @Prop({ default: false })
  isRemote!: boolean;

  @Prop({ required: true })
  postedAt!: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  applicationUrl?: string;

  @Prop({ type: String, default: '' })
  descriptionRaw!: string;

  @Prop({ type: Object })
  extractedFields?: {
    requiredSkills?: string[];
    niceToHaveSkills?: string[];
    experienceLevel?: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    languages?: string[];
  };

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop()
  crawledAt?: Date;

  @Prop({ default: false })
  isExpired?: boolean;
}

export const JobListingSchema = SchemaFactory.createForClass(JobListing);

JobListingSchema.index({ sourceId: 1 }, { unique: true });
JobListingSchema.index({ source: 1, postedAt: -1 });
JobListingSchema.index({ companyName: 1 });
JobListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
