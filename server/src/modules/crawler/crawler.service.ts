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
  constructor(
    @InjectModel(CrawlJob.name) private crawlJobModel: Model<CrawlJobDocument>,
    private aiService: AiService,
    private storage: StorageService,
  ) {}

  async startAnalysis(userId: string, url: string, resumeId?: string): Promise<string> {
    console.log('[CrawlerService] startAnalysis', { userId, url, resumeId });
    const job = await this.crawlJobModel.create({
      userId,
      url,
      resumeId,
      status: 'pending',
    });

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
    const job = await this.crawlJobModel
      .findOne({ _id: jobId, userId })
      .exec();
    if (!job) return false;

    if (job.screenshotKey) {
      await this.storage.delete(job.screenshotKey, 'image').catch(() => {});
    }

    await this.crawlJobModel.deleteOne({ _id: jobId }).exec();
    return true;
  }

  private async runCrawler(jobId: string, url: string, resumeId?: string): Promise<void> {
    console.log('[CrawlerService] runCrawler started', { jobId, url, resumeId });
    let browser;
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
      console.log('[CrawlerService] page captured', { title: pageTitle, textLength: pageText.length });

      const { publicId, url: screenshotUrl } = await this.storage.upload(
        screenshotBuffer,
        {
          folder: 'folio-crawler',
          publicId: `${jobId}/screenshot.png`,
          resourceType: 'image',
        },
      );

      console.log('[CrawlerService] screenshot uploaded', { publicId, screenshotUrl });

      // Fetch resume text if resumeId provided
      let resumeText = 'No resume provided for this automated crawl.';
      if (resumeId) {
        try {
          const resume = await this.crawlJobModel.db.collection('resumes').findOne({ _id: resumeId as any });
          if (resume) {
            resumeText = `Resume title: ${resume.title}\nName: ${resume.name}\nSummary: ${resume.summary}\nSkills: ${(resume.skills || []).join(', ')}\nExperience: ${(resume.experience || []).map((e: any) => `${e.title} at ${e.company} (${e.date}): ${(e.details || []).join('; ')}`).join('\n')}`;
          }
        } catch (e) {
          console.error('[CrawlerService] failed to fetch resume', e);
        }
      }

      const resumeDoc = pageText.slice(0, 8000);
      console.log('[CrawlerService] calling AI analysis...');
      const rawAnalysis = await this.aiService.chat(
        PORTFOLIO_ANALYSIS_SYSTEM,
        `Portfolio URL: ${url}\n\nPage Content:\n${resumeDoc}\n\nCandidate Resume:\n${resumeText}`,
      );
      const analysis = (rawAnalysis && typeof rawAnalysis === 'object' && Object.keys(rawAnalysis).length > 0)
        ? rawAnalysis
        : { skillsConfirmed: [], skillsMissing: [], projectsFound: [], suggestions: ['AI analysis returned an unexpected format. Please try again.'], overallAlignment: 0 };
      console.log('[CrawlerService] AI analysis complete', { analysisKeys: Object.keys(analysis) });

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
