import { Injectable, Logger } from '@nestjs/common';
import { chromium, type Browser, type Page } from 'playwright';
import { AiService } from '../ai/ai.service';
import { COMPANY_VERIFICATION_SYSTEM } from '../ai/prompts';
import type { CompanyVerificationInput, CompanyVerificationResult, FlagType, RiskLevel } from './company-verification.types';

const PAGE_TIMEOUT = 15000;
const RATE_LIMIT_MS = 2000;
const MAX_SYNTHESIS_CHARS = 15000;

interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

interface SearchResult {
  url: string;
  snippet: string;
}

@Injectable()
export class CompanyVerificationAgent {
  private readonly logger = new Logger(CompanyVerificationAgent.name);
  private lastRequestTime = 0;

  constructor(private aiService: AiService) {}

  async verify(input: CompanyVerificationInput): Promise<CompanyVerificationResult> {
    const pages: CrawledPage[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });

      // Check 1: Identity consistency
      const identityQuery = this.buildIdentityQuery(input);
      const identityResults = await this.search(browser, identityQuery, 3);
      await this.rateLimit();
      for (const r of identityResults.slice(0, 2)) {
        const page = await this.crawl(browser, r.url);
        if (page) pages.push(page);
      }

      // Check 2: Scam pattern
      const scamQuery = this.buildScamQuery(input);
      const scamResults = await this.search(browser, scamQuery, 5);
      await this.rateLimit();
      for (const r of scamResults.slice(0, 2)) {
        const page = await this.crawl(browser, r.url);
        if (page) pages.push(page);
      }

      // Boilerplate question search (if email body provided)
      if (input.emailBody) {
        const questions = this.extractQuestionPhrases(input.emailBody);
        if (questions) {
          const questionsQuery = `"${questions}" interview`;
          const qResults = await this.search(browser, questionsQuery, 3);
          await this.rateLimit();
          for (const r of qResults.slice(0, 1)) {
            const page = await this.crawl(browser, r.url);
            if (page) pages.push(page);
          }
        }
      }

      // Check 3: Location/structure
      const locationQuery = this.buildLocationQuery(input);
      const locationResults = await this.search(browser, locationQuery, 3);
      await this.rateLimit();
      for (const r of locationResults.slice(0, 1)) {
        const page = await this.crawl(browser, r.url);
        if (page) pages.push(page);
      }

      // Check 4: Presence check
      const presenceQuery = `${input.companyName} website linkedin`;
      const presenceResults = await this.search(browser, presenceQuery, 3);
      for (const r of presenceResults.slice(0, 1)) {
        const page = await this.crawl(browser, r.url);
        if (page) pages.push(page);
      }
    } catch (err) {
      this.logger.error(`Search/crawl error during verification:`, err);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }

    if (pages.length === 0) {
      return {
        riskLevel: 'unknown',
        flags: [{
          type: 'other',
          summary: 'Could not find sufficient web data to verify this company.',
          evidence: [],
        }],
        recommendation: 'Proceed with caution — we could not verify the company. Check their website and LinkedIn profile manually.',
      };
    }

    let crawledContent = pages
      .map((p) => `--- ${p.title} (${p.url}) ---\n${p.text.slice(0, 3000)}`)
      .join('\n\n');

    if (crawledContent.length > MAX_SYNTHESIS_CHARS) {
      crawledContent = crawledContent.slice(0, MAX_SYNTHESIS_CHARS) + '\n\n[Content truncated]';
    }

    const emailSection = input.emailBody
      ? `\n\nRecruiter email body:\n${input.emailBody.slice(0, 4000)}`
      : '';

    const prompt = `Company name: ${input.companyName}
Role title: ${input.roleTitle}
${input.recruiterEmail ? `Recruiter email domain: ${input.recruiterEmail.split('@')[1] || input.recruiterEmail}` : ''}
${input.recruiterName ? `Recruiter name: ${input.recruiterName}` : ''}
${input.sourcePlatform ? `Source platform: ${input.sourcePlatform}` : ''}
${input.claimedLocation ? `Claimed location: ${input.claimedLocation}` : ''}
${emailSection}

Web search results:
${crawledContent}`;

    try {
      const raw = await this.aiService.chat(COMPANY_VERIFICATION_SYSTEM, prompt);
      return this.parseResult(raw as Record<string, unknown>);
    } catch (err) {
      this.logger.error(`LLM analysis failed for ${input.companyName}:`, err);
      return {
        riskLevel: 'unknown',
        flags: [{
          type: 'other',
          summary: 'The verification analysis failed due to an internal error.',
          evidence: [],
        }],
        recommendation: 'Try again later.',
      };
    }
  }

  private async search(browser: Browser, query: string, maxResults: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    let page: Page | null = null;
    try {
      page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3,avi,webm,pdf}', (route) => route.abort());

      const searchUrl = `https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      await page.waitForTimeout(1500);

      const items = await page.$$eval('.result', (els) =>
        els.slice(0, maxResults).map((el) => {
          const link = el.querySelector('.result__a') as HTMLAnchorElement;
          const snippet = el.querySelector('.result__snippet');
          return {
            url: link?.href || '',
            snippet: snippet?.textContent?.trim() || '',
          };
        })
      );

      results.push(...items.filter((r): r is SearchResult => !!r.url));
    } catch (err) {
      this.logger.warn(`Search failed for "${query.slice(0, 60)}": ${(err as Error).message}`);
    } finally {
      if (page) await page.close().catch(() => {});
    }
    return results;
  }

  private async crawl(browser: Browser, url: string): Promise<CrawledPage | null> {
    let page: Page | null = null;
    try {
      page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3,avi,webm,pdf}', (route) => route.abort());

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      await page.waitForTimeout(1000);

      const title = await page.title();
      const text = await page.innerText('body');

      return { url: page.url(), title, text: text.slice(0, 4000) };
    } catch (err) {
      this.logger.warn(`Crawl failed for ${url}: ${(err as Error).message}`);
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private buildIdentityQuery(input: CompanyVerificationInput): string {
    const parts = [`"${input.companyName}"`, input.roleTitle];
    if (input.recruiterEmail) {
      const domain = input.recruiterEmail.split('@')[1];
      if (domain) parts.push(domain.replace(/\.com$/, ''));
    }
    return parts.join(' ');
  }

  private buildScamQuery(input: CompanyVerificationInput): string {
    return `"${input.companyName}" scam OR review OR interview OR glassdoor OR indeed`;
  }

  private buildLocationQuery(input: CompanyVerificationInput): string {
    const parts = [`"${input.companyName}"`];
    if (input.claimedLocation) {
      parts.push(`"${input.claimedLocation}"`);
    }
    parts.push('headquarters OR office OR location');
    return parts.join(' ');
  }

  private extractQuestionPhrases(emailBody: string): string | null {
    const lines = emailBody.split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && l.length < 200 && (l.endsWith('?') || /^\d+[\.\)]\s/.test(l)));

    if (lines.length === 0) return null;

    return lines.slice(0, 2).join(' ');
  }

  private parseResult(raw: Record<string, unknown>): CompanyVerificationResult {
    const safeStr = (v: unknown): string => (typeof v === 'string' ? v : '');
    const safeArr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

    const flags = safeArr(raw.flags).map((f: any) => ({
      type: (['identity_mismatch', 'known_scam_pattern', 'location_mismatch', 'presence_check', 'other'].includes(f?.type)
        ? f.type
        : 'other') as FlagType,
      summary: safeStr(f?.summary),
      evidence: safeArr(f?.evidence).map((e: any) => ({
        claim: safeStr(e?.claim),
        source: safeStr(e?.source),
      })),
    }));

    const riskLevel = (['low', 'medium', 'high', 'unknown'].includes(safeStr(raw.riskLevel))
      ? safeStr(raw.riskLevel)
      : 'unknown') as RiskLevel;

    return {
      riskLevel,
      flags,
      recommendation: safeStr(raw.recommendation),
    };
  }
}
