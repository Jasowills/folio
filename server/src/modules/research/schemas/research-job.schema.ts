import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ResearchJobDocument = ResearchJob & Document;

@Schema({ timestamps: true })
export class ResearchJob {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  companyName!: string;

  @Prop()
  companyUrl?: string;

  @Prop({ type: Object })
  roleContext?: {
    roleTitle: string;
    resumeId?: string;
  };

  @Prop({ default: 'queued', enum: ['queued', 'crawling', 'analysing', 'completed', 'failed'] })
  status!: string;

  @Prop({ type: Object })
  crawlData?: {
    pagesVisited: Array<{ url: string; title: string; text: string; crawledAt: Date }>;
    pageCount: number;
    currentlyCrawling?: Array<{ url: string; title: string; startedAt: Date }>;
  };

  @Prop({ type: Object })
  brief?: {
    atAGlance: string;
    foundedYear: string | null;
    fundingStage: string | null;
    teamSizeEstimate: string | null;
    headquarters: string | null;
    industry: string | null;
    companySizeSignal: string | null;
    mission: string | null;
    values: string[] | null;
    whatTheyBuild: string;
    roleConnection: string | null;
    recentNews: Array<{ headline: string; date: string; sourceUrl: string }>;
    interviewStyle: {
      summary: string;
      confidenceSource: 'careers_page' | 'inferred';
    };
    questionsToAsk: Array<{ question: string; rationale: string }>;
    redFlags: Array<{ flag: string; source: string }> | null;
    salaryRange: { estimate: string; confidence: 'high' | 'medium' | 'low' } | null;
  };

  @Prop()
  error?: string;

  @Prop({ default: false })
  usedGeneralKnowledge?: boolean;
}

export const ResearchJobSchema = SchemaFactory.createForClass(ResearchJob);
