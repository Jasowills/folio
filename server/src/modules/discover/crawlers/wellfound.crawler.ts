import { Injectable, Logger } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class WellfoundCrawler extends BaseCrawler {
  source = 'wellfound';
  private readonly logger = new Logger(WellfoundCrawler.name);

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://api.angel.co/1/jobs', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) {
        this.logger.warn(`Wellfound/AngelList API returned ${response.status}`);
        return jobs;
      }
      const data = await response.json() as any;
      const list = data.jobs || [];
      if (!Array.isArray(list)) {
        this.logger.warn('Wellfound API returned unexpected format');
        return jobs;
      }

      for (const item of list) {
        if (!item.id || !item.title) continue;
        const date = item.created_at ? new Date(item.created_at) : null;
        jobs.push({
          source: 'wellfound',
          sourceId: `wellfound-${item.id}`,
          roleTitle: item.title,
          companyName: item.startup?.name || item.company_name || 'Unknown',
          location: item.location || null,
          isRemote: false,
          postedAt: date,
          descriptionRaw: item.description || '',
          applicationUrl: `https://wellfound.com/jobs/${item.id}`,
          isVerified: false,
        });
      }

      this.logger.log(`Fetched ${jobs.length} jobs from Wellfound/AngelList`);
    } catch (err) {
      this.logger.error(`Wellfound crawl failed:`, err);
    }
    return jobs;
  }
}
