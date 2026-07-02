import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { DiscoverCrawlService } from './discover-crawl.service';
import { JobListing, JobListingSchema } from './schemas/job-listing.schema';
import { JobMatch, JobMatchSchema } from './schemas/job-match.schema';
import { JobApplication, JobApplicationSchema } from './schemas/job-application.schema';
import { DiscoverPreferences, DiscoverPreferencesSchema } from './schemas/discover-preferences.schema';
import { CrawlMeta, CrawlMetaSchema } from './schemas/crawl-meta.schema';
import { RemoteOkCrawler } from './crawlers/remoteok.crawler';
import { WeWorkRemotelyCrawler } from './crawlers/weworkremotely.crawler';
import { GreenhouseCrawler } from './crawlers/greenhouse.crawler';
import { LeverCrawler } from './crawlers/lever.crawler';
import { WorkdayCrawler } from './crawlers/workday.crawler';
import { OttaCrawler } from './crawlers/otta.crawler';
import { HNCrawler } from './crawlers/hn.crawler';
import { YCombinatorCrawler } from './crawlers/ycombinator.crawler';
import { TwitterCrawler } from './crawlers/twitter.crawler';
import { LinkedInCrawler } from './crawlers/linkedin.crawler';
import { CryptoJobsListCrawler, BitcoinerJobsCrawler } from './crawlers/crypto.crawler';
import { RemotiveCrawler } from './crawlers/remotive.crawler';
import { ArcCrawler } from './crawlers/arc.crawler';
import { WellfoundCrawler } from './crawlers/wellfound.crawler';
import { BuiltInCrawler } from './crawlers/builtin.crawler';
import { AtsModule } from '../ats/ats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobListing.name, schema: JobListingSchema },
      { name: JobMatch.name, schema: JobMatchSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: DiscoverPreferences.name, schema: DiscoverPreferencesSchema },
      { name: CrawlMeta.name, schema: CrawlMetaSchema },
    ]),
    AtsModule,
  ],
  controllers: [DiscoverController],
  providers: [
    DiscoverService,
    DiscoverCrawlService,
    RemoteOkCrawler,
    WeWorkRemotelyCrawler,
    GreenhouseCrawler,
    LeverCrawler,
    WorkdayCrawler,
    OttaCrawler,
    HNCrawler,
    YCombinatorCrawler,
    TwitterCrawler,
    LinkedInCrawler,
    CryptoJobsListCrawler,
    BitcoinerJobsCrawler,
    RemotiveCrawler,
    ArcCrawler,
    WellfoundCrawler,
    BuiltInCrawler,
  ],
})
export class DiscoverModule implements OnModuleInit {
  constructor(private crawlService: DiscoverCrawlService) {}

  onModuleInit() {
    this.crawlService.startScheduledCrawl();
    this.crawlService.startAutoGhosting();
  }
}
