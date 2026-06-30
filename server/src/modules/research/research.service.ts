import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { chromium } from 'playwright';
import { ResearchJob, ResearchJobDocument } from './schemas/research-job.schema';
import { AiService } from '../ai/ai.service';
import { COMPANY_RESEARCH_SYSTEM } from '../ai/prompts';

const MAX_PAGES = 30;
const SOCIAL_DOMAINS = ['linkedin.com', 'twitter.com', 'x.com', 'crunchbase.com', 'glassdoor.com', 'github.io'];
const PAGE_TIMEOUT = 30000;

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    @InjectModel(ResearchJob.name) private researchJobModel: Model<ResearchJobDocument>,
    private aiService: AiService,
  ) {}

  async startJob(
    userId: string,
    companyName: string,
    companyUrl?: string,
    roleContext?: { roleTitle: string; resumeId?: string },
  ): Promise<string> {
    const doc = await this.researchJobModel.create({
      userId,
      companyName,
      companyUrl,
      roleContext,
      status: 'queued',
    });

    const jobId = (doc._id as Types.ObjectId).toString();
    this.runResearch(jobId).catch((err) =>
      this.logger.error(`Research job ${jobId} failed:`, err),
    );

    return jobId;
  }

  async getJob(jobId: string): Promise<ResearchJobDocument | null> {
    return this.researchJobModel.findById(jobId).exec();
  }

  async getUserJobs(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ jobs: ResearchJobDocument[]; total: number }> {
    const [jobs, total] = await Promise.all([
      this.researchJobModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.researchJobModel.countDocuments({ userId }),
    ]);
    return { jobs, total };
  }

  async deleteJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.researchJobModel.findOne({ _id: jobId, userId }).exec();
    if (!job) return false;
    await this.researchJobModel.deleteOne({ _id: jobId }).exec();
    return true;
  }

  private async runResearch(jobId: string): Promise<void> {
    const job = await this.researchJobModel.findById(jobId).exec();
    if (!job) return;

    let crawledContent = '';
    let usedGeneralKnowledge = false;

    if (job.companyUrl) {
      await this.researchJobModel
        .findByIdAndUpdate(jobId, { status: 'crawling' })
        .exec();

      const pages = await this.crawl(job.companyUrl, jobId);
      if (pages.length > 0) {
        crawledContent = pages
          .map((p) => `--- Page: ${p.title} (${p.url}) ---\n${p.text.slice(0, 4000)}`)
          .join('\n\n');
        await this.researchJobModel
          .findByIdAndUpdate(jobId, {
            $set: { 'crawlData.pageCount': pages.length },
          })
          .exec();
      } else {
        usedGeneralKnowledge = true;
      }
    } else {
      usedGeneralKnowledge = true;
    }

    await this.researchJobModel
      .findByIdAndUpdate(jobId, { status: 'analysing' })
      .exec();

    const roleSection = job.roleContext
      ? `\nRole context:\n- Role title: ${job.roleContext.roleTitle}\n- Resume ID: ${job.roleContext.resumeId || 'Not provided'}`
      : '';

    const sourceTag = usedGeneralKnowledge
      ? 'General knowledge only'
      : 'with URL content';

    const prompt = `Company name: ${job.companyName}${job.companyUrl ? `\nCompany URL: ${job.companyUrl}` : ''}${roleSection}\n\nPage content:\n${crawledContent || 'No crawled content available.'}\n\nSource: ${sourceTag}`;

    try {
      const raw = await this.aiService.chat(COMPANY_RESEARCH_SYSTEM, prompt);
      const brief = this.parseBrief(raw);

      await this.researchJobModel
        .findByIdAndUpdate(jobId, {
          status: 'completed',
          brief,
          usedGeneralKnowledge,
        })
        .exec();
    } catch (err) {
      this.logger.error(`Research synthesis failed for ${jobId}:`, err);
      await this.researchJobModel
        .findByIdAndUpdate(jobId, {
          status: 'failed',
          error: (err as Error).message,
        })
        .exec();
    }
  }

  private async crawl(baseUrl: string, jobId?: string): Promise<Array<{ url: string; title: string; text: string }>> {
    const pages: Array<{ url: string; title: string; text: string }> = [];
    const visited = new Set<string>();
    const domain = new URL(baseUrl).hostname.replace(/^www\./, '');
    const seenSocials = new Set<string>();

    this.logger.log(`Starting crawl of domain: ${domain} (base: ${baseUrl})`);

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3,avi,webm}', (route) => route.abort());

      const queue: string[] = [baseUrl];
      let skipped = 0;

      while (queue.length > 0 && pages.length < MAX_PAGES) {
        const url = queue.shift()!;
        const normalized = url.replace(/\/$/, '').split('#')[0];

        if (visited.has(normalized)) {
          skipped++;
          continue;
        }
        if (normalized.includes('mailto:') || normalized.includes('tel:')) {
          skipped++;
          continue;
        }

        visited.add(normalized);

        const isSocial = SOCIAL_DOMAINS.some((sd) => normalized.includes(sd));
        if (!isSocial && !normalized.includes(domain)) {
          this.logger.log(`  ↪ skipping off-domain: ${normalized}`);
          skipped++;
          continue;
        }

        this.logger.log(`[${pages.length + 1}/${MAX_PAGES}] Crawling: ${normalized}${isSocial ? ' (social)' : ''}`);

        try {
          const start = Date.now();
          await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
          await page.waitForTimeout(2000);
          const loadTime = ((Date.now() - start) / 1000).toFixed(1);

          visited.add(page.url().replace(/\/$/, '').split('#')[0]);

          const title = await page.title();
          const text = await page.innerText('body');
          this.logger.log(`  ✓ ${loadTime}s — ${title} (${text.length} chars)`);

          const pageData = { url: page.url(), title, text: text.slice(0, 4000) };
          pages.push({ url: page.url(), title, text });

          // Save incrementally so the client sees live progress
          if (jobId) {
            await this.researchJobModel
              .findByIdAndUpdate(jobId, {
                $push: { 'crawlData.pagesVisited': { ...pageData, crawledAt: new Date() } },
                $inc: { 'crawlData.pageCount': 1 },
              })
              .exec();
          }

          if (!isSocial && pages.length < MAX_PAGES) {
            const links: string[] = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('a[href]'))
                .map((a) => (a as HTMLAnchorElement).href)
                .filter((h) => h && !h.startsWith('javascript:') && !h.startsWith('mailto:'));
            });

            this.logger.log(`  → ${links.length} links found on page`);

            for (const href of links) {
              if (pages.length + queue.length >= MAX_PAGES * 2) break;
              const clean = href.replace(/\/$/, '').split('#')[0];

              if (visited.has(clean)) continue;
              if (queue.includes(clean)) continue;

              const host = new URL(href).hostname.replace(/^www\./, '');

              if (host === domain) {
                queue.push(clean);
              }

              const socialDomain = SOCIAL_DOMAINS.find((sd) => href.includes(sd));
              if (socialDomain && !seenSocials.has(socialDomain)) {
                seenSocials.add(socialDomain);
                this.logger.log(`  📱 found social: ${clean}`);
                queue.push(clean);
              }
            }

            this.logger.log(`  📊 queue: ${queue.length} remaining, ${pages.length} pages collected`);
          }
        } catch (err) {
          this.logger.warn(`  ✗ failed to load: ${normalized} — ${(err as Error).message}`);
        }
      }

      this.logger.log(`Crawl complete: ${pages.length} pages from ${domain} (${skipped} skipped, ${visited.size} visited)`);
      return pages;
    } catch (err) {
      this.logger.error(`Crawl failed for ${baseUrl}:`, err);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  private parseBrief(raw: Record<string, unknown>): ResearchJob['brief'] {
    return {
      atAGlance: String(raw.atAGlance || ''),
      foundedYear: raw.foundedYear ? String(raw.foundedYear) : null,
      fundingStage: raw.fundingStage ? String(raw.fundingStage) : null,
      teamSizeEstimate: raw.teamSizeEstimate ? String(raw.teamSizeEstimate) : null,
      headquarters: raw.headquarters ? String(raw.headquarters) : null,
      industry: raw.industry ? String(raw.industry) : null,
      companySizeSignal: raw.companySizeSignal ? String(raw.companySizeSignal) : null,
      mission: raw.mission ? String(raw.mission) : null,
      values: Array.isArray(raw.values) ? (raw.values as string[]) : null,
      whatTheyBuild: String(raw.whatTheyBuild || ''),
      roleConnection: raw.roleConnection ? String(raw.roleConnection) : null,
      recentNews: Array.isArray(raw.recentNews)
        ? (raw.recentNews as Array<{ headline: string; date: string; sourceUrl: string }>)
        : [],
      interviewStyle: {
        summary: String((raw.interviewStyle as Record<string, unknown>)?.summary || ''),
        confidenceSource: ((raw.interviewStyle as Record<string, unknown>)?.confidenceSource === 'careers_page'
          ? 'careers_page'
          : 'inferred') as 'careers_page' | 'inferred',
      },
      questionsToAsk: Array.isArray(raw.questionsToAsk)
        ? (raw.questionsToAsk as Array<{ question: string; rationale: string }>)
        : [],
      redFlags: Array.isArray(raw.redFlags)
        ? (raw.redFlags as Array<{ flag: string; source: string }>)
        : null,
    };
  }
}
