import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CrawlJobDocument = CrawlJob & Document;

@Schema({ timestamps: true })
export class CrawlJob {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  url!: string;

  @Prop({ default: 'pending', enum: ['pending', 'running', 'completed', 'failed'] })
  status!: string;

  @Prop()
  screenshotUrl?: string;

  @Prop()
  screenshotKey?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  error?: string;
}

export const CrawlJobSchema = SchemaFactory.createForClass(CrawlJob);
