import { Injectable, Logger } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class BuiltInCrawler extends BaseCrawler {
  source = 'builtin';
  private readonly logger = new Logger(BuiltInCrawler.name);

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://builtin.com/jobs?page=1', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) {
        this.logger.warn(`BuiltIn returned ${response.status}`);
        return jobs;
      }
      const html = await response.text();

      // Match job cards in the HTML
      const cardRegex = /<div[^>]*class="[^"]*job-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;
      const titleRegex = /<h[23][^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h[23]>/i;
      const companyRegex = /<div[^>]*class="[^"]*company-name[^"]*"[^>]*>([^<]+)<\/div>/i;
      const locationRegex = /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i;
      const linkRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"/i;
      const descRegex = /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
      const dateRegex = /(\d+)\s+(hour|day|week|month|minute)s?\s+ago/i;

      let match: RegExpExecArray | null;
      let index = 0;
      while ((match = cardRegex.exec(html)) !== null) {
        const card = match[1];
        const titleMatch = card.match(titleRegex);
        const companyMatch = card.match(companyRegex);
        const locationMatch = card.match(locationRegex);
        const linkMatch = card.match(linkRegex);
        const descMatch = card.match(descRegex);
        const dateMatch = card.match(dateRegex);

        if (!titleMatch) continue;

        const title = titleMatch[1].trim();
        const company = companyMatch ? companyMatch[1].trim() : 'Unknown';
        const location = locationMatch ? locationMatch[1].trim() : null;
        const url = linkMatch ? linkMatch[1] : null;
        const description = descMatch ? descMatch[1].trim() : '';
        const isRemote = location ? /remote/i.test(location) : false;

        let postedAt: Date | null = null;
        if (dateMatch) {
          const num = parseInt(dateMatch[1]);
          const unit = dateMatch[2].toLowerCase();
          const now = Date.now();
          if (unit.startsWith('hour')) postedAt = new Date(now - num * 3600000);
          else if (unit.startsWith('day')) postedAt = new Date(now - num * 86400000);
          else if (unit.startsWith('week')) postedAt = new Date(now - num * 604800000);
          else if (unit.startsWith('month')) postedAt = new Date(now - num * 2592000000);
          else if (unit.startsWith('minute')) postedAt = new Date(now - num * 60000);
        }

        jobs.push({
          source: 'builtin',
          sourceId: `builtin-${index}-${title.slice(0, 20).replace(/\s+/g, '-')}`,
          roleTitle: title,
          companyName: company,
          location,
          isRemote,
          postedAt,
          descriptionRaw: description,
          applicationUrl: url ? `https://builtin.com${url}` : null,
          isVerified: false,
        });
        index++;
      }

      this.logger.log(`Fetched ${jobs.length} jobs from BuiltIn`);
    } catch (err) {
      this.logger.error(`BuiltIn crawl failed:`, err);
    }
    return jobs;
  }
}
