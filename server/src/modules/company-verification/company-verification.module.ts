import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { CompanyVerificationController } from './company-verification.controller';
import { CompanyVerificationService } from './company-verification.service';
import { CompanyVerificationAgent } from './company-verification.agent';
import {
  CompanyVerificationCache,
  CompanyVerificationCacheSchema,
} from './schemas/company-verification-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CompanyVerificationCache.name,
        schema: CompanyVerificationCacheSchema,
      },
    ]),
    AiModule,
  ],
  controllers: [CompanyVerificationController],
  providers: [CompanyVerificationService, CompanyVerificationAgent],
  exports: [CompanyVerificationService, CompanyVerificationAgent],
})
export class CompanyVerificationModule {}
