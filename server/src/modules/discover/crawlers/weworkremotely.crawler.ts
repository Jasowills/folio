import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
}

@Injectable()
export class WeWorkRemotelyCrawler extends BaseCrawler {
  source = 'weworkremotely';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://weworkremotely.com/remote-jobs.rss', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) return jobs;
      const xml = await response.text();
      const items = this.parseRSS(xml);
      for (const item of items) {
        if (!item.title || !item.link) continue;
        const parsed = this.parseTitle(item.title);
        const date = item.pubDate ? new Date(item.pubDate) : null;
        jobs.push({
          source: 'weworkremotely',
          sourceId: `wwr-${item.link}`,
          roleTitle: parsed.roleTitle || item.title,
          companyName: parsed.companyName || 'Unknown',
          location: null,
          isRemote: true,
          postedAt: date,
          descriptionRaw: item.description || '',
          applicationUrl: item.link,
          isVerified: false,
        });
      }
    } catch (err) {
      throw err;
    }
    return jobs;
  }

  private parseRSS(xml: string): RSSItem[] {
    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const getTag = (tag: string) => {
        const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
        return m ? m[1].trim() : undefined;
      };
      const getCategory = () => {
        const cats: string[] = [];
        const catRegex = /<category[^>]*>([\s\S]*?)<\/category>/gi;
        let cm: RegExpExecArray | null;
        while ((cm = catRegex.exec(block)) !== null) cats.push(cm[1].trim());
        return cats.length === 1 ? cats[0] : cats.length > 1 ? cats : undefined;
      };
      items.push({
        title: getTag('title'),
        link: getTag('link'),
        description: getTag('description'),
        pubDate: getTag('pubDate'),
        category: getCategory(),
      });
    }
    return items;
  }

  private parseTitle(title: string): { roleTitle?: string; companyName?: string } {
    const match = title.match(/^(.+?)\s+(?:-|at|—)\s+(.+)$/);
    if (match) {
      return { roleTitle: match[1].trim(), companyName: match[2].trim() };
    }
    const colonMatch = title.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      return { companyName: colonMatch[1].trim(), roleTitle: colonMatch[2].trim() };
    }
    return {};
  }
}
