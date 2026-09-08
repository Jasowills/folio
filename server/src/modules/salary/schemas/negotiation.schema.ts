import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type NegotiationDocument = Negotiation & Document;

@Schema({ timestamps: true })
export class Negotiation {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Offer' })
  offerId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ default: 'drafting' })
  stage!: 'drafting' | 'ready' | 'sent' | 'countered' | 'resolved';

  @Prop()
  strategy?: string;

  @Prop()
  script?: string;

  @Prop()
  fallbackScript?: string;

  @Prop({ type: Object })
  benchmarkData?: {
    roleTitle: string;
    location: string;
    baseSalaryP10?: number;
    baseSalaryP25?: number;
    baseSalaryP50?: number;
    baseSalaryP75?: number;
    baseSalaryP90?: number;
    equityRange?: string;
    sources?: string[];
  };

  @Prop()
  pitchPoints?: string;

  @Prop()
  confidence?: 'low' | 'medium' | 'high';

  @Prop()
  sentAt?: Date;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  outcome?: string;
}

export const NegotiationSchema = SchemaFactory.createForClass(Negotiation);

NegotiationSchema.index({ offerId: 1 }, { unique: true });
