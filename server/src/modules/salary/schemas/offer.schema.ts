import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type OfferDocument = Offer & Document;

@Schema({ timestamps: true })
export class Offer {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: true })
  roleTitle!: string;

  @Prop()
  location?: string;

  @Prop()
  baseSalary?: number;

  @Prop()
  equityValue?: number;

  @Prop()
  bonusPercent?: number;

  @Prop({ type: [String] })
  benefits?: string[];

  @Prop({ type: Object })
  otherTerms?: Record<string, unknown>;

  @Prop()
  deadline?: Date;

  @Prop({ default: 'pending' })
  status!: 'pending' | 'negotiating' | 'accepted' | 'declined';

  @Prop({ default: 0 })
  targetBaseSalary?: number;

  @Prop()
  notes?: string;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

OfferSchema.index({ userId: 1, status: 1 });
