import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoApplyController } from './auto-apply.controller';
import { ApplyFlowService } from './apply-flow.service';
import { AtsRouterService } from './ats-router.service';
import { FieldMappingService } from './field-mapping.service';
import { SubmitWorkerService } from './submit-worker.service';
import { GreenhouseAdapter } from './ats-adapters/greenhouse.adapter';
import { LeverAdapter } from './ats-adapters/lever.adapter';
import { WorkdayAdapter } from './ats-adapters/workday.adapter';
import { ICIMSAdapter } from './ats-adapters/icims.adapter';
import { AshbyAdapter } from './ats-adapters/ashby.adapter';
import { SmartRecruitersAdapter } from './ats-adapters/smartrecruiters.adapter';
import { ApplySubmission, ApplySubmissionSchema } from './schemas/apply-submission.schema';
import { AnswersBankEntry, AnswersBankSchema } from './schemas/answers-bank.schema';
import { AutoApplyConfig, AutoApplyConfigSchema } from './schemas/auto-apply-config.schema';
import { JobListing, JobListingSchema } from '../discover/schemas/job-listing.schema';
import { JobApplication, JobApplicationSchema } from '../discover/schemas/job-application.schema';
import { CoverLettersModule } from '../cover-letters/cover-letters.module';
import { ResumesModule } from '../resumes/resumes.module';
import { AiModule } from '../ai/ai.module';
import { AutoApplyProfileModule } from '../auto-apply-profile/auto-apply-profile.module';
import { ScreeningQuestionAgent } from './screening-question-agent.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApplySubmission.name, schema: ApplySubmissionSchema },
      { name: AnswersBankEntry.name, schema: AnswersBankSchema },
      { name: AutoApplyConfig.name, schema: AutoApplyConfigSchema },
    ]),
    MongooseModule.forFeature([
      { name: JobListing.name, schema: JobListingSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
    ]),
    CoverLettersModule,
    ResumesModule,
    AiModule,
    AutoApplyProfileModule,
  ],
  controllers: [AutoApplyController],
  providers: [
    ApplyFlowService,
    AtsRouterService,
    FieldMappingService,
    SubmitWorkerService,
    GreenhouseAdapter,
    LeverAdapter,
    WorkdayAdapter,
    ICIMSAdapter,
    AshbyAdapter,
    SmartRecruitersAdapter,
    ScreeningQuestionAgent,
  ],
})
export class AutoApplyModule {}
