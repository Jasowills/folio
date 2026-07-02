import { Injectable, Logger } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class ArcCrawler extends BaseCrawler {
  source = 'arc';
  private readonly logger = new Logger(ArcCrawler.name);

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://arc.dev/api/v1/jobs/search?q=&page=1', {
        headers: {
          'User-Agent': 'Folio/1.0',
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        this.logger.warn(`Arc API returned ${response.status}`);
        return jobs;
      }
      const data = await response.json() as any;
      const list = data.jobs || data.results || data.data || [];
      if (!Array.isArray(list)) {
        this.logger.warn('Arc API returned unexpected format');
        return jobs;
      }

      for (const item of list) {
        const id = item.id || item.slug || item.url;
        if (!id || !item.title) continue;
        const date = item.published_at || item.publication_date ? new Date(item.published_at || item.publication_date) : null;
        jobs.push({
          source: 'arc',
          sourceId: `arc-${id}`,
          roleTitle: item.title,
          companyName: item.company?.name || item.company_name || 'Unknown',
          location: item.location || item.candidate_required_location || null,
          isRemote: item.remote || item.isRemote || false,
          postedAt: date,
          descriptionRaw: item.description || '',
          applicationUrl: item.url || item.apply_url || null,
          isVerified: false,
        });
      }

      this.logger.log(`Fetched ${jobs.length} jobs from Arc`);
    } catch (err) {
      this.logger.error(`Arc crawl failed:`, err);
    }
    return jobs;
  }
}
