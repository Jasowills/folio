import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrawlJob, CrawlJobSchema } from './schemas/crawl-job.schema';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrawlJob.name, schema: CrawlJobSchema },
    ]),
    AiModule,
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService],
})
export class CrawlerModule {}
