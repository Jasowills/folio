import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResearchJob, ResearchJobSchema } from './schemas/research-job.schema';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResearchJob.name, schema: ResearchJobSchema },
    ]),
    AiModule,
  ],
  controllers: [ResearchController],
  providers: [ResearchService],
})
export class ResearchModule {}
