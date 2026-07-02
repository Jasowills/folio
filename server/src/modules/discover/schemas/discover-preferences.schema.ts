import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DiscoverPreferencesDocument = DiscoverPreferences & Document;

@Schema({ timestamps: true })
export class DiscoverPreferences {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  targetRoles!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Resume' })
  resumeId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  preferredLocations!: string[];

  @Prop({ default: false })
  isRemoteOnly!: boolean;

  @Prop({ type: [String], default: [] })
  experienceLevels!: string[];

  @Prop({ default: 60 })
  minimumMatchScore!: number;

  @Prop({ default: true })
  excludeApplied!: boolean;

  @Prop({ default: false })
  excludeRejected!: boolean;

  @Prop({ default: false })
  emailAlertsEnabled!: boolean;

  @Prop({ type: [String], default: [] })
  hiddenJobIds!: string[];

  @Prop({ type: [String], default: [
    'greenhouse', 'lever', 'weworkremotely', 'remoteok',
    'hn', 'ycombinator', 'twitter',
  ]})
  enabledSources!: string[];

  @Prop()
  lastVisitedAt?: Date;
}

export const DiscoverPreferencesSchema = SchemaFactory.createForClass(DiscoverPreferences);
