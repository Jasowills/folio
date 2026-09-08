import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { chromium } from 'playwright';
import { CrawlJob, CrawlJobDocument } from './schemas/crawl-job.schema';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { PORTFOLIO_ANALYSIS_SYSTEM } from '../ai/prompts';

@Injectable()
export class CrawlerService {
  // ADV-0008: simple in-memory idempotency for duplicate POST (double-click / retry)
  private recentJobs = new Map<string, { jobId: string; expires: number }>();
  private readonly IDEMPOTENCY_TTL_MS = 30_000;

  constructor(
    @InjectModel(CrawlJob.name) private crawlJobModel: Model<CrawlJobDocument>,
    private aiService: AiService,
    private storage: StorageService,
  ) {}

  private idempotencyKey(userId: string, url: string, resumeId?: string): string {
    return `${userId}:${url}:${resumeId || ''}`;
  }

  private getRecentJob(key: string): string | null {
    const entry = this.recentJobs.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.recentJobs.delete(key);
      return null;
    }
    return entry.jobId;
  }

  async startAnalysis(
    userId: string,
    url: string,
    resumeId?: string,
  ): Promise<string> {
    console.log('[CrawlerService] startAnalysis', { userId, url, resumeId });
    // ADV-0008: dedup concurrent duplicate POSTs within TTL
    const key = this.idempotencyKey(userId, url, resumeId);
    const existing = this.getRecentJob(key);
    if (existing) {
      console.log('[CrawlerService] idempotency hit, returning existing job', existing);
      return existing;
    }
    const job = await this.crawlJobModel.create({
      userId,
      url,
      resumeId,
      status: 'pending',
    });
    this.recentJobs.set(key, { jobId: job._id.toString(), expires: Date.now() + this.IDEMPOTENCY_TTL_MS });

    this.runCrawler(job._id.toString(), url, resumeId).catch((err) =>
      console.error(`[CrawlerService] Crawler job ${job._id} failed:`, err),
    );

    return job._id.toString();
  }

  async getJob(jobId: string): Promise<CrawlJobDocument | null> {
    return this.crawlJobModel.findById(jobId).exec();
  }

  async getUserJobs(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ jobs: CrawlJobDocument[]; total: number }> {
    const [jobs, total] = await Promise.all([
      this.crawlJobModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.crawlJobModel.countDocuments({ userId }),
    ]);
    return { jobs, total };
  }

  async deleteJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.crawlJobModel.findOne({ _id: jobId, userId }).exec();
    if (!job) return false;

    if (job.screenshotKey) {
      await this.storage.delete(job.screenshotKey, 'image').catch(() => {});
    }

    await this.crawlJobModel.deleteOne({ _id: jobId }).exec();
    return true;
  }

  private async runCrawler(
    jobId: string,
    url: string,
    resumeId?: string,
  ): Promise<void> {
    console.log('[CrawlerService] runCrawler started', {
      jobId,
      url,
      resumeId,
    });
    let browser;
    let uploadedPublicId: string | null = null;
    try {
      await this.crawlJobModel
        .findByIdAndUpdate(jobId, { status: 'running' })
        .exec();

      console.log('[CrawlerService] launching browser...');
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });

      console.log('[CrawlerService] navigating to', url);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('[CrawlerService] page loaded, taking screenshot...');
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const pageText = await page.innerText('body');
      const pageTitle = await page.title();
      console.log('[CrawlerService] page captured', {
        title: pageTitle,
        textLength: pageText.length,
      });

      const { publicId, url: screenshotUrl } = await this.storage.upload(
        screenshotBuffer,
        {
          folder: 'folio-crawler',
          publicId: `${jobId}/screenshot.png`,
          resourceType: 'image',
        },
      );
      uploadedPublicId = publicId;

      console.log('[CrawlerService] screenshot uploaded', {
        publicId,
        screenshotUrl,
      });

      // Fetch resume text if resumeId provided
      let resumeText = 'No resume provided for this automated crawl.';
      if (resumeId) {
        try {
          const resume = await this.crawlJobModel.db
            .collection('resumes')
            .findOne({ _id: resumeId as any });
          if (resume) {
            resumeText = `Resume title: ${resume.title}\nName: ${resume.name}\nSummary: ${resume.summary}\nSkills: ${(resume.skills || []).join(', ')}\nExperience: ${(resume.experience || []).map((e: any) => `${e.title} at ${e.company} (${e.date}): ${(e.details || []).join('; ')}`).join('\n')}`;
          }
        } catch (e) {
          console.error('[CrawlerService] failed to fetch resume', e);
        }
      }

      const resumeDoc = pageText.slice(0, 8000);
      console.log('[CrawlerService] calling AI analysis...');
      // ADV-0006: bounded timeout so job doesn't stay 'running' forever if AI hangs
      const CRAWLER_AI_TIMEOUT_MS = 45_000;
      const rawAnalysis = await Promise.race([
        this.aiService.chat(
          PORTFOLIO_ANALYSIS_SYSTEM,
          `Portfolio URL: ${url}\n\nPage Content:\n${resumeDoc}\n\nCandidate Resume:\n${resumeText}`,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`AI analysis timed out after ${CRAWLER_AI_TIMEOUT_MS}ms`)),
            CRAWLER_AI_TIMEOUT_MS,
          ),
        ),
      ]);
      const analysis =
        rawAnalysis &&
        typeof rawAnalysis === 'object' &&
        Object.keys(rawAnalysis).length > 0
          ? rawAnalysis
          : {
              skillsConfirmed: [],
              skillsMissing: [],
              projectsFound: [],
              suggestions: [
                'AI analysis returned an unexpected format. Please try again.',
              ],
              overallAlignment: 0,
            };
      console.log('[CrawlerService] AI analysis complete', {
        analysisKeys: Object.keys(analysis),
      });

      await this.crawlJobModel
        .findByIdAndUpdate(jobId, {
          status: 'completed',
          screenshotUrl,
          screenshotKey: publicId,
          metadata: {
            title: pageTitle,
            url: page.url(),
            analysis,
          },
        })
        .exec();
      console.log('[CrawlerService] job completed successfully');
    } catch (err) {
      console.error('[CrawlerService] runCrawler error:', err);
      // ADV-0001/0006: if screenshot was uploaded but job never completed, try to clean orphan; best-effort
      if (uploadedPublicId) {
        const job = await this.crawlJobModel.findById(jobId).exec().catch(() => null);
        if (!job?.screenshotKey) {
          await this.storage.delete(uploadedPublicId, 'image').catch(() => {});
        }
      }
      await this.crawlJobModel
        .findByIdAndUpdate(jobId, {
          status: 'failed',
          error: (err as Error).message,
        })
        .exec();
    } finally {
      if (browser) await browser.close();
    }
  }
}
