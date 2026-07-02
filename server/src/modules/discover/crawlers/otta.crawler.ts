import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class OttaCrawler extends BaseCrawler {
  source = 'otta';
  private readonly logger = new Logger(OttaCrawler.name);

  async crawl(targetRole?: string): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const roleSlug = this.mapRoleToSlug(targetRole || '');
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3,avi,webm}', (route) => route.abort());

      const url = roleSlug
        ? `https://app.otta.com/jobs?role=${encodeURIComponent(roleSlug)}`
        : 'https://app.otta.com/jobs';
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      const jobCards = await page.$$('[class*="job"], [data-testid*="job"], [class*="JobCard"]');
      const seen = new Set<string>();

      for (const card of jobCards.slice(0, 50)) {
        try {
          const text = await card.innerText();
          const link = await card.$('a');
          const href = link ? await link.getAttribute('href') : null;
          const lines = text.split('\n').filter((l) => l.trim());
          const title = lines[0] || '';
          const company = lines[1] || '';
          if (!title || !company) continue;
          const key = `${company}|${title}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const isRemote = text.toLowerCase().includes('remote');
          const location = lines.find((l) => l.includes(',') || l.match(/[A-Z]{2}/)) || null;

          jobs.push({
            source: 'otta',
            sourceId: `otta-${Buffer.from(key).toString('base64').slice(0, 40)}`,
            roleTitle: title,
            companyName: company,
            location,
            isRemote,
            postedAt: new Date(),
            descriptionRaw: text,
            applicationUrl: href || null,
            isVerified: false,
          });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      this.logger.warn('Otta crawl failed:', err);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }

  private mapRoleToSlug(role: string): string {
    const lower = role.toLowerCase();
    if (lower.includes('engineer') || lower.includes('developer') || lower.includes('backend') || lower.includes('frontend') || lower.includes('fullstack') || lower.includes('infrastructure') || lower.includes('devops') || lower.includes('sre'))
      return 'engineering';
    if (lower.includes('design') || lower.includes('ux') || lower.includes('ui') || lower.includes('product design'))
      return 'design';
    if (lower.includes('product'))
      return 'product';
    if (lower.includes('data') || lower.includes('analyst') || lower.includes('science'))
      return 'data-analytics';
    if (lower.includes('market') || lower.includes('growth'))
      return 'marketing';
    if (lower.includes('sales') || lower.includes('account executive'))
      return 'sales';
    if (lower.includes('people') || lower.includes('hr') || lower.includes('recruit'))
      return 'people-hr';
    if (lower.includes('finance') || lower.includes('account'))
      return 'finance';
    if (lower.includes('oper'))
      return 'operations';
    if (lower.includes('legal'))
      return 'legal';
    return 'engineering';
  }
}
