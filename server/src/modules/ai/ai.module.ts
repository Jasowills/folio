import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiCacheService } from './ai-cache.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiCacheService],
  exports: [AiService],
})
export class AiModule {}
