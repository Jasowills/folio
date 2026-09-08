import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewsGateway } from './interviews.gateway';
import { DeepgramService } from './deepgram.service';
import { CompanyResearchService } from './company-research.service';
import { PistonService } from './piston.service';
import {
  InterviewSession,
  InterviewSessionSchema,
} from './schemas/interview-session.schema';
import {
  InterviewTranscript,
  InterviewTranscriptSchema,
} from './schemas/interview-transcript.schema';
import {
  InterviewProctoring,
  InterviewProctoringSchema,
} from './schemas/interview-proctoring.schema';
import {
  InterviewResult,
  InterviewResultSchema,
} from './schemas/interview-result.schema';
import { FollowUp, FollowUpSchema } from './schemas/follow-up.schema';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { Resume, ResumeSchema } from '../resumes/schemas/resume.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: InterviewTranscript.name, schema: InterviewTranscriptSchema },
      { name: InterviewProctoring.name, schema: InterviewProctoringSchema },
      { name: InterviewResult.name, schema: InterviewResultSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: Resume.name, schema: ResumeSchema },
    ]),
    AiModule,
    ResumesModule,
  ],
  controllers: [InterviewsController, FollowUpController],
  providers: [
    InterviewsService,
    InterviewsGateway,
    DeepgramService,
    CompanyResearchService,
    PistonService,
    FollowUpService,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
