import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { chromium } from 'playwright';
import { ResearchJob, ResearchJobDocument } from './schemas/research-job.schema';
import { AiService } from '../ai/ai.service';
import { COMPANY_RESEARCH_SYSTEM } from '../ai/prompts';

const CRAWLABLE_PATHS = ['/about', '/careers', '/mission', '/values', '/about-us', '/blog', '/news', '/press'];
const MAX_PAGES = 8;
const PAGE_TIMEOUT = 15000;

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

      const pages = await this.crawl(job.companyUrl);
      if (pages.length > 0) {
        crawledContent = pages
          .map((p) => `--- Page: ${p.title} (${p.url}) ---\n${p.text.slice(0, 4000)}`)
          .join('\n\n');
        await this.researchJobModel
          .findByIdAndUpdate(jobId, {
            crawlData: {
              pagesVisited: pages.map((p) => ({
                url: p.url,
                title: p.title,
                text: p.text.slice(0, 4000),
                crawledAt: new Date(),
              })),
              pageCount: pages.length,
            },
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

  private async crawl(baseUrl: string): Promise<Array<{ url: string; title: string; text: string }>> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

      const visited = new Set<string>();
      const pages: Array<{ url: string; title: string; text: string }> = [];

      // Start with homepage
      try {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
        const title = await page.title();
        const text = await page.innerText('body');
        pages.push({ url: page.url(), title, text });
        visited.add(page.url());
      } catch {
        this.logger.warn(`Failed to load homepage: ${baseUrl}`);
        return pages;
      }

      // Try discoverable paths
      for (const path of CRAWLABLE_PATHS) {
        if (pages.length >= MAX_PAGES) break;
        const fullUrl = new URL(path, baseUrl).href;
        if (visited.has(fullUrl)) continue;

        try {
          await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
          visited.add(page.url());
          if (page.url() === fullUrl || page.url().startsWith(fullUrl)) {
            const title = await page.title();
            const text = await page.innerText('body');
            pages.push({ url: page.url(), title, text });
          }
        } catch {
          // path may not exist — skip
        }
      }

      // Try to discover product pages from nav
      if (pages.length < MAX_PAGES) {
        try {
          await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
          const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a'));
            return anchors
              .map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a as HTMLAnchorElement).innerText.trim() }))
              .filter((a) => a.href && a.text && a.href !== window.location.href)
              .slice(0, 15);
          });

          const productLinks = links.filter(
            (l) =>
              /product|platform|solution|feature|what-we-build/i.test(l.text) ||
              /product|platform|solution|feature/i.test(new URL(l.href).pathname),
          );

          for (const link of productLinks) {
            if (pages.length >= MAX_PAGES) break;
            if (visited.has(link.href)) continue;
            try {
              await page.goto(link.href, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
              visited.add(page.url());
              const title = await page.title();
              const text = await page.innerText('body');
              pages.push({ url: page.url(), title, text });
            } catch {
              // skip
            }
          }
        } catch {
          // nav discovery failed — not critical
        }
      }

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
