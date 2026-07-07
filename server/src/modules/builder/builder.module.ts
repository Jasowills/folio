import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '../resumes/schemas/resume.schema';
import { AiModule } from '../ai/ai.module';
import { BuilderController } from './builder.controller';
import { BuilderService } from './builder.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
    AiModule,
  ],
  controllers: [BuilderController],
  providers: [BuilderService],
})
export class BuilderModule {}
