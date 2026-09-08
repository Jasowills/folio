import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type CoverLetterDocument = CoverLetter & Document;

@Schema({ timestamps: true })
export class CoverLetter {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Resume' })
  resumeId!: Types.ObjectId;

  @Prop({ required: true })
  jobTitle!: string;

  @Prop({ required: true })
  company!: string;

  @Prop()
  jobDescription?: string;

  @Prop({
    default: 'professional',
    enum: ['professional', 'confident', 'creative'],
  })
  tone!: string;

  @Prop()
  content?: string;
}

export const CoverLetterSchema = SchemaFactory.createForClass(CoverLetter);
