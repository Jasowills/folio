import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class RemoteOkCrawler extends BaseCrawler {
  source = 'remoteok';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://remoteok.com/api', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) return jobs;
      const data = await response.json();
      if (!Array.isArray(data)) return jobs;

      for (const item of data) {
        if (!item.id || !item.position || !item.company) continue;
        const date = item.date ? new Date(item.date) : null;
        const salaryText = `${item.salary_min || ''} ${item.salary_max || ''}`.trim();
        jobs.push({
          source: 'remoteok',
          sourceId: `remoteok-${item.id}`,
          roleTitle: item.position,
          companyName: item.company,
          location: item.location || null,
          isRemote: true,
          postedAt: date,
          descriptionRaw: item.description || '',
          applicationUrl: item.url || `https://remoteok.com/remote-jobs/${item.slug}`,
          isVerified: false,
        });
      }
    } catch (err) {
      throw err;
    }
    return jobs;
  }
}
