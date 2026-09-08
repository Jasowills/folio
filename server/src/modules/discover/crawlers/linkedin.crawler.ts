import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class LinkedInCrawler extends BaseCrawler {
  source = 'linkedin';
  private readonly logger = new Logger(LinkedInCrawler.name);

  async crawl(targetRole?: string): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const proxyUrl = process.env.LINKEDIN_PROXY_URL;
    const roleQuery = targetRole || 'software engineer';
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(roleQuery)}&f_TPR=r86400`;

    if (!proxyUrl) {
      this.logger.warn('LINKEDIN_PROXY_URL not set — skipping LinkedIn crawl');
      return jobs;
    }

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        proxy: { server: proxyUrl },
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      const jobCards = await page.$$(
        '[class*="job-card"], [data-job-id], [class*="occludable-update"]',
      );
      const seen = new Set<string>();

      for (const card of jobCards.slice(0, 25)) {
        try {
          const text = await card.innerText();
          const link = await card.$('a');
          const href = link ? await link.getAttribute('href') : null;

          const lines = text.split('\n').filter((l) => l.trim());
          const title = lines[0] || '';
          const company = lines[1] || '';
          const locationLine =
            lines.find(
              (l) =>
                l.includes(',') ||
                l.match(
                  /\b(Remote|United States|United Kingdom|Canada|Germany|France|Australia|India|Singapore|Japan|Netherlands|Ireland|Sweden|Denmark|Norway|Finland|Spain|Italy|Switzerland|Brazil|Mexico)\b/,
                ),
            ) || null;
          const isRemote = text.toLowerCase().includes('remote');

          if (!title || !company) continue;
          const key = `${company}|${title}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const postedMatch = text.match(
            /(\d+)\s+(hour|day|week|minute|month)s?\s+ago/i,
          );
          const postedAt = postedMatch
            ? this.parseRelativeTime(parseInt(postedMatch[1]), postedMatch[2])
            : new Date();

          jobs.push({
            source: 'linkedin',
            sourceId: `linkedin-${Buffer.from(key).toString('base64').slice(0, 40)}`,
            roleTitle: title,
            companyName: company,
            location: locationLine,
            isRemote,
            postedAt,
            descriptionRaw: text,
            applicationUrl: href?.startsWith('http') ? href : null,
            isVerified: false,
          });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      this.logger.warn('LinkedIn crawl failed (may be blocked):', err);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }

  private parseRelativeTime(amount: number, unit: string): Date {
    const now = Date.now();
    switch (unit.toLowerCase()) {
      case 'minute':
      case 'minutes':
        return new Date(now - amount * 60000);
      case 'hour':
      case 'hours':
        return new Date(now - amount * 3600000);
      case 'day':
      case 'days':
        return new Date(now - amount * 86400000);
      case 'week':
      case 'weeks':
        return new Date(now - amount * 604800000);
      default:
        return new Date();
    }
  }
}
