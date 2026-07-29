import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MulterModule } from '@nestjs/platform-express'
import { AiModule } from '../ai/ai.module'
import { ReferralsController } from './referrals.controller'
import { ReferralsService } from './referrals.service'
import { Connection, ConnectionSchema } from './schemas/connection.schema'
import { ReferralRequest, ReferralRequestSchema } from './schemas/referral-request.schema'
import { JobListing, JobListingSchema } from '../discover/schemas/job-listing.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Connection.name, schema: ConnectionSchema },
      { name: ReferralRequest.name, schema: ReferralRequestSchema },
      { name: JobListing.name, schema: JobListingSchema },
    ]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
    AiModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
