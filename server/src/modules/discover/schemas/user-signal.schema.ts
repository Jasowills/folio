import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type UserSignalDocument = UserSignal & Document;

export type DismissReason =
  | 'bad_seniority'
  | 'wrong_domain'
  | 'wrong_location'
  | 'not_interested'
  | 'salary_too_low'
  | 'other';

@Schema({ timestamps: true })
export class UserSignal {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'JobListing' })
  jobListingId!: Types.ObjectId;

  @Prop({ required: true, enum: [
    'bad_seniority', 'wrong_domain', 'wrong_location',
    'not_interested', 'salary_too_low', 'other',
  ]})
  dismissReason!: DismissReason;

  @Prop({ default: 1.0 })
  weight!: number;

  @Prop()
  dismissedAt?: Date;
}

export const UserSignalSchema = SchemaFactory.createForClass(UserSignal);

UserSignalSchema.index({ userId: 1 });
UserSignalSchema.index({ userId: 1, dismissReason: 1 });
