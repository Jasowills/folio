import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ApplyOddsAssessment,
  ApplyOddsAssessmentSchema,
} from './apply-odds.schema';
import { ApplyOddsService } from './apply-odds.service';
import { ApplyOddsController } from './apply-odds.controller';
import {
  JobListing,
  JobListingSchema,
} from '../discover/schemas/job-listing.schema';
import { JobMatch, JobMatchSchema } from '../discover/schemas/job-match.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApplyOddsAssessment.name, schema: ApplyOddsAssessmentSchema },
      { name: JobListing.name, schema: JobListingSchema },
      { name: JobMatch.name, schema: JobMatchSchema },
    ]),
  ],
  controllers: [ApplyOddsController],
  providers: [ApplyOddsService],
})
export class JobsModule {}
