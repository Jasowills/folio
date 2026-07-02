import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class CryptoJobsListCrawler extends BaseCrawler {
  source = 'cryptojobslist';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://cryptojobslist.com/feed.rss', {
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
          source: 'cryptojobslist',
          sourceId: `crypto-${item.link}`,
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

  private parseRSS(xml: string): Array<{ title?: string; link?: string; description?: string; pubDate?: string }> {
    const items: Array<{ title?: string; link?: string; description?: string; pubDate?: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const gt = (tag: string) => { const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block); return m ? m[1].trim() : undefined; };
      items.push({ title: gt('title'), link: gt('link'), description: gt('description'), pubDate: gt('pubDate') });
    }
    return items;
  }

  private parseTitle(title: string): { roleTitle?: string; companyName?: string } {
    const match = title.match(/^(.+?)\s+(?:at|@|—|-)\s+(.+)$/);
    if (match) return { roleTitle: match[1].trim(), companyName: match[2].trim() };
    const m2 = title.match(/^([^:]+):\s*(.+)$/);
    if (m2) return { companyName: m2[1].trim(), roleTitle: m2[2].trim() };
    return {};
  }
}

@Injectable()
export class BitcoinerJobsCrawler extends BaseCrawler {
  source = 'bitcoinerjobs';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://bitcoinerjobs.com/feed.rss', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) return jobs;
      const xml = await response.text();
      const items = this.parseRSS(xml);
      for (const item of items) {
        if (!item.title || !item.link) continue;
        const date = item.pubDate ? new Date(item.pubDate) : null;
        const parsed = this.parseTitle(item.title);
        jobs.push({
          source: 'bitcoinerjobs',
          sourceId: `bitcoiner-${item.link}`,
          roleTitle: parsed.roleTitle || item.title,
          companyName: parsed.companyName || 'Bitcoiner Jobs',
          location: 'Remote',
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

  private parseRSS(xml: string): Array<{ title?: string; link?: string; description?: string; pubDate?: string }> {
    const items: Array<{ title?: string; link?: string; description?: string; pubDate?: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const gt = (tag: string) => { const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block); return m ? m[1].trim() : undefined; };
      items.push({ title: gt('title'), link: gt('link'), description: gt('description'), pubDate: gt('pubDate') });
    }
    return items;
  }

  private parseTitle(title: string): { roleTitle?: string; companyName?: string } {
    const match = title.match(/^(.+?)\s+(?:at|@|—|-)\s+(.+)$/);
    if (match) return { roleTitle: match[1].trim(), companyName: match[2].trim() };
    const m2 = title.match(/^([^:]+):\s*(.+)$/);
    if (m2) return { companyName: m2[1].trim(), roleTitle: m2[2].trim() };
    const m3 = title.match(/^(.+?)\s+is\s+hiring\s+(.+)$/i);
    if (m3) return { companyName: m3[1].trim(), roleTitle: m3[2].trim() };
    return {};
  }
}
