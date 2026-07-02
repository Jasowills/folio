import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AtsScore, AtsScoreSchema } from './schemas/ats-score.schema';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AtsScore.name, schema: AtsScoreSchema },
    ]),
    AiModule,
    ResumesModule,
  ],
  controllers: [AtsController],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}
