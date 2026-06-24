import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiCacheService } from './ai-cache.service';

@Module({
  providers: [AiService, AiCacheService],
  exports: [AiService],
})
export class AiModule {}
