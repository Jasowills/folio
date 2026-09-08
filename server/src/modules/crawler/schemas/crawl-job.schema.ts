import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type CrawlJobDocument = CrawlJob & Document;

@Schema({ timestamps: true })
export class CrawlJob {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  resumeId?: Types.ObjectId;

  @Prop({
    default: 'pending',
    enum: ['pending', 'running', 'completed', 'failed'],
  })
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
