import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CrawlMetaDocument = CrawlMeta & Document;

@Schema({ timestamps: true })
export class CrawlMeta {
  @Prop({ required: true, default: 'singleton' })
  key!: string;

  @Prop()
  lastCrawledAt?: Date;

  @Prop({ type: Object, default: {} })
  sourceStatus?: Record<
    string,
    {
      lastCrawledAt?: Date;
      jobsFound?: number;
      jobsNew?: number;
      status?: 'ok' | 'error';
      error?: string;
    }
  >;
}

export const CrawlMetaSchema = SchemaFactory.createForClass(CrawlMeta);
