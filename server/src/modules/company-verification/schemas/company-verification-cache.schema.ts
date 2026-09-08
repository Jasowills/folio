import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyVerificationCacheDocument =
  HydratedDocument<CompanyVerificationCache>;

@Schema()
export class CompanyVerificationCache {
  @Prop({ required: true, index: true })
  companyName: string;

  @Prop({ required: true, type: Object })
  result: {
    riskLevel: string;
    flags: Array<{
      type: string;
      summary: string;
      evidence: Array<{ claim: string; source: string }>;
    }>;
    recommendation: string;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: 30 * 24 * 60 * 60 * 1000 })
  ttlMs: number;
}

export const CompanyVerificationCacheSchema = SchemaFactory.createForClass(
  CompanyVerificationCache,
);
CompanyVerificationCacheSchema.index({ companyName: 1, createdAt: -1 });
