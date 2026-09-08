import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ConnectionDocument = Connection & Document;

@Schema({ timestamps: true })
export class Connection {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  firstName!: string;

  @Prop()
  lastName?: string;

  @Prop()
  email?: string;

  @Prop()
  companyName?: string;

  @Prop()
  position?: string;

  @Prop()
  connectedOn?: Date;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ default: 'imported' })
  status!: 'active' | 'contacted' | 'not_interested';
}

export const ConnectionSchema = SchemaFactory.createForClass(Connection);

ConnectionSchema.index({ userId: 1, companyName: 1 });
ConnectionSchema.index({ userId: 1, status: 1 });
