import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GuestResultDocument = GuestResult & Document;

@Schema({ timestamps: true })
export class GuestResult {
  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Prop({ type: Object, required: true })
  data!: Record<string, unknown>;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const GuestResultSchema = SchemaFactory.createForClass(GuestResult);
GuestResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
