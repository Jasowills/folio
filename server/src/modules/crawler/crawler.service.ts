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

  async startAnalysis(userId: string, url: string): Promise<string> {
    const job = await this.crawlJobModel.create({
      userId,
      url,
      status: 'pending',
    });

    this.runCrawler(job._id.toString(), url).catch((err) =>
      console.error(`Crawler job ${job._id} failed:`, err),
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

  private async runCrawler(jobId: string, url: string): Promise<void> {
    let browser;
    try {
      await this.crawlJobModel
        .findByIdAndUpdate(jobId, { status: 'running' })
        .exec();

      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const pageText = await page.innerText('body');
      const pageTitle = await page.title();

      const { publicId, url: screenshotUrl } = await this.storage.upload(
        screenshotBuffer,
        {
          folder: 'folio-crawler',
          publicId: `${jobId}/screenshot.png`,
          resourceType: 'image',
        },
      );

      const resumeDoc = pageText.slice(0, 8000);
      const analysis = await this.aiService.chat(
        PORTFOLIO_ANALYSIS_SYSTEM,
        `Portfolio URL: ${url}\n\nPage Content:\n${resumeDoc}\n\nCandidate Resume:\nNo resume provided for this automated crawl.`,
      );

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
    } catch (err) {
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
