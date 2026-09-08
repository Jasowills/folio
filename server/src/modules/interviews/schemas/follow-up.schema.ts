import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type FollowUpDocument = FollowUp & Document;

@Schema({ timestamps: true })
export class FollowUp {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'InterviewSession',
  })
  sessionId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop()
  recipientName?: string;

  @Prop()
  recipientTitle?: string;

  @Prop()
  companyName?: string;

  @Prop()
  role?: string;

  @Prop({ default: 'draft' })
  status!: 'draft' | 'generated' | 'edited' | 'sent' | 'replied';

  @Prop()
  draftContent?: string;

  @Prop()
  sentContent?: string;

  @Prop()
  generatedAt?: Date;

  @Prop()
  sentAt?: Date;

  @Prop()
  repliedAt?: Date;

  @Prop()
  replyContent?: string;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
