import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoverLetter, CoverLetterSchema } from './schemas/cover-letter.schema';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoverLetter.name, schema: CoverLetterSchema },
    ]),
    AiModule,
    ResumesModule,
  ],
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
  exports: [CoverLettersService],
})
export class CoverLettersModule {}
