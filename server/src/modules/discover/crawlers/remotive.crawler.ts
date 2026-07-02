import { Injectable, Logger } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class RemotiveCrawler extends BaseCrawler {
  source = 'remotive';
  private readonly logger = new Logger(RemotiveCrawler.name);

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://remotive.com/api/remote-jobs', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) {
        this.logger.warn(`Remotive API returned ${response.status}`);
        return jobs;
      }
      const data = await response.json() as any;
      const list = data.jobs;
      if (!Array.isArray(list)) {
        this.logger.warn('Remotive API returned unexpected format');
        return jobs;
      }

      for (const item of list) {
        if (!item.id || !item.title || !item.company_name) continue;
        const date = item.publication_date ? new Date(item.publication_date) : null;
        jobs.push({
          source: 'remotive',
          sourceId: `remotive-${item.id}`,
          roleTitle: item.title,
          companyName: item.company_name,
          location: item.candidate_required_location || null,
          isRemote: true,
          postedAt: date,
          descriptionRaw: item.description || '',
          applicationUrl: item.url || null,
          isVerified: false,
        });
      }

      this.logger.log(`Fetched ${jobs.length} jobs from Remotive`);
    } catch (err) {
      this.logger.error(`Remotive crawl failed:`, err);
    }
    return jobs;
  }
}
