import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class YCombinatorCrawler extends BaseCrawler {
  source = 'ycombinator';
  private readonly logger = new Logger(YCombinatorCrawler.name);

  async crawl(targetRole?: string): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const roleCategory = this.mapRoleToCategory(targetRole || '');
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const url = roleCategory
        ? `https://workatastartup.com/jobs?category=${encodeURIComponent(roleCategory)}`
        : 'https://workatastartup.com/jobs';
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      const jobCards = await page.$$(
        '[class*="job"], [class*="JobCard"], [class*="posting"]',
      );
      const seen = new Set<string>();

      for (const card of jobCards.slice(0, 50)) {
        try {
          const text = await card.innerText();
          const link = await card.$('a');
          const href = link ? await link.getAttribute('href') : null;

          const lines = text.split('\n').filter((l) => l.trim());
          const title = lines[0] || '';
          const company = lines[1] || '';
          const location =
            lines.find(
              (l) =>
                l.includes(',') ||
                l.match(
                  /\b(Remote|CA|NY|TX|WA|IL|FL|MA|OR|CO|GA|NC|MI|PA|OH|MN|UT|AZ|TN|MD|WI|VA|WA|DC|IN|MO|CT|SC)\b/,
                ),
            ) || null;
          const isRemote = text.toLowerCase().includes('remote');

          if (!title || !company) continue;
          const key = `${company}|${title}`;
          if (seen.has(key)) continue;
          seen.add(key);

          jobs.push({
            source: 'ycombinator',
            sourceId: `yc-${Buffer.from(key).toString('base64').slice(0, 40)}`,
            roleTitle: title,
            companyName: company,
            location,
            isRemote,
            postedAt: new Date(),
            descriptionRaw: text,
            applicationUrl: href ? `https://workatastartup.com${href}` : null,
            isVerified: true,
          });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      this.logger.error('YC crawl failed:', err);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }

  private mapRoleToCategory(role: string): string {
    const lower = role.toLowerCase();
    if (
      lower.includes('engineer') ||
      lower.includes('developer') ||
      lower.includes('backend') ||
      lower.includes('frontend') ||
      lower.includes('fullstack') ||
      lower.includes('infrastructure') ||
      lower.includes('devops')
    )
      return 'engineering';
    if (
      lower.includes('design') ||
      lower.includes('ux') ||
      lower.includes('ui')
    )
      return 'design';
    if (lower.includes('product') && lower.includes('manage')) return 'product';
    if (
      lower.includes('data') ||
      lower.includes('ml') ||
      lower.includes('machine learning') ||
      lower.includes('ai')
    )
      return 'data';
    if (
      lower.includes('market') ||
      lower.includes('growth') ||
      lower.includes('sales')
    )
      return 'marketing';
    if (
      lower.includes('oper') ||
      lower.includes('finance') ||
      lower.includes('hr')
    )
      return 'operations';
    return '';
  }
}
