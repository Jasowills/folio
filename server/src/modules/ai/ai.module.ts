import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiCacheService } from './ai-cache.service';
import { OpencodeService } from './opencode.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiCacheService, OpencodeService],
  exports: [AiService],
})
export class AiModule {}
