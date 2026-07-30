import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AnswersBankDocument = AnswersBankEntry & Document;

@Schema({ timestamps: true })
export class AnswersBankEntry {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  normalizedQuestion!: string;

  @Prop({ required: true })
  originalQuestion!: string;

  @Prop({ required: true })
  answer!: string;

  @Prop({ required: true, enum: [
    'visa', 'salary', 'notice_period', 'location', 'sponsorship', 'generic',
  ]})
  category!: string;

  @Prop({ default: 1 })
  hitCount!: number;

  @Prop()
  lastUsedAt?: Date;
}

export const AnswersBankSchema = SchemaFactory.createForClass(AnswersBankEntry);

AnswersBankSchema.index({ userId: 1, normalizedQuestion: 1 }, { unique: true });
AnswersBankSchema.index({ userId: 1, category: 1 });
