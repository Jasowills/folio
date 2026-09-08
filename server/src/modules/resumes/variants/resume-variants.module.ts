import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeVariant, ResumeVariantSchema } from './resume-variant.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import {
  JobApplication,
  JobApplicationSchema,
} from '../../discover/schemas/job-application.schema';
import { ResumeVariantService } from './resume-variant.service';
import { ResumeVariantController } from './resume-variant.controller';
import { ResumeDiffService } from './resume-diff.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResumeVariant.name, schema: ResumeVariantSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
    ]),
  ],
  controllers: [ResumeVariantController],
  providers: [ResumeVariantService, ResumeDiffService],
  exports: [ResumeVariantService, ResumeDiffService],
})
export class ResumeVariantsModule {}
