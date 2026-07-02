import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobListing, JobListingDocument } from './schemas/job-listing.schema';
import { JobMatch, JobMatchDocument } from './schemas/job-match.schema';
import { JobApplication, JobApplicationDocument } from './schemas/job-application.schema';
import { CrawlMeta, CrawlMetaDocument } from './schemas/crawl-meta.schema';
import { DiscoverPreferences, DiscoverPreferencesDocument } from './schemas/discover-preferences.schema';
import { BaseCrawler, RawJob } from './crawlers/base.crawler';
import { RemoteOkCrawler } from './crawlers/remoteok.crawler';
import { WeWorkRemotelyCrawler } from './crawlers/weworkremotely.crawler';
import { GreenhouseCrawler } from './crawlers/greenhouse.crawler';
import { LeverCrawler } from './crawlers/lever.crawler';
import { WorkdayCrawler } from './crawlers/workday.crawler';
import { OttaCrawler } from './crawlers/otta.crawler';
import { HNCrawler } from './crawlers/hn.crawler';
import { YCombinatorCrawler } from './crawlers/ycombinator.crawler';
import { TwitterCrawler } from './crawlers/twitter.crawler';
import { LinkedInCrawler } from './crawlers/linkedin.crawler';
import { CryptoJobsListCrawler, BitcoinerJobsCrawler } from './crawlers/crypto.crawler';
import { RemotiveCrawler } from './crawlers/remotive.crawler';
import { ArcCrawler } from './crawlers/arc.crawler';
import { WellfoundCrawler } from './crawlers/wellfound.crawler';
import { BuiltInCrawler } from './crawlers/builtin.crawler';
import { AtsService } from '../ats/ats.service';
import { normalizeCompanyName, cleanCompanyName, cleanLocation, decodeHtmlEntities, normalizePostedDate, parseSalary, detectExperienceLevel, extractLocation, extractLanguages } from './extractors/job-extractor';

@Injectable()
export class DiscoverCrawlService {
  private readonly logger = new Logger(DiscoverCrawlService.name);
  private crawling = false;
  private crawlTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectModel(JobListing.name) private jobListingModel: Model<JobListingDocument>,
    @InjectModel(JobMatch.name) private jobMatchModel: Model<JobMatchDocument>,
    @InjectModel(JobApplication.name) private jobAppModel: Model<JobApplicationDocument>,
    @InjectModel(CrawlMeta.name) private crawlMetaModel: Model<CrawlMetaDocument>,
    @InjectModel(DiscoverPreferences.name) private prefsModel: Model<DiscoverPreferencesDocument>,
    private remoteOkCrawler: RemoteOkCrawler,
    private weWorkRemotelyCrawler: WeWorkRemotelyCrawler,
    private greenhouseCrawler: GreenhouseCrawler,
    private leverCrawler: LeverCrawler,
    private workdayCrawler: WorkdayCrawler,
    private ottaCrawler: OttaCrawler,
    private hnCrawler: HNCrawler,
    private yCombinatorCrawler: YCombinatorCrawler,
    private twitterCrawler: TwitterCrawler,
    private linkedInCrawler: LinkedInCrawler,
    private cryptoJobsListCrawler: CryptoJobsListCrawler,
    private bitcoinerJobsCrawler: BitcoinerJobsCrawler,
    private remotiveCrawler: RemotiveCrawler,
    private arcCrawler: ArcCrawler,
    private wellfoundCrawler: WellfoundCrawler,
    private builtInCrawler: BuiltInCrawler,
    private atsService: AtsService,
  ) {}

  startScheduledCrawl(): void {
    if (this.crawlTimer) return;
    this.logger.log('Starting scheduled crawl (every 6 hours)');
    this.runCrawlCycle();
    this.crawlTimer = setInterval(() => this.runCrawlCycle(), 6 * 60 * 60 * 1000);
  }

  stopScheduledCrawl(): void {
    if (this.crawlTimer) {
      clearInterval(this.crawlTimer);
      this.crawlTimer = null;
    }
  }

  async runCrawlCycle(): Promise<void> {
    if (this.crawling) {
      this.logger.warn('Crawl already in progress — skipping');
      return;
    }
    this.crawling = true;
    this.logger.log('Starting crawl cycle...');

    const crawlers: BaseCrawler[] = [
      this.remoteOkCrawler,
      this.weWorkRemotelyCrawler,
      this.greenhouseCrawler,
      this.leverCrawler,
      this.workdayCrawler,
      this.ottaCrawler,
      this.hnCrawler,
      this.yCombinatorCrawler,
      this.linkedInCrawler,
      this.twitterCrawler,
      this.cryptoJobsListCrawler,
      this.bitcoinerJobsCrawler,
      this.remotiveCrawler,
      this.arcCrawler,
      this.wellfoundCrawler,
      this.builtInCrawler,
    ];

    const sourceStatus: Record<string, any> = {};

    for (const crawler of crawlers) {
      try {
        const rawJobs = await crawler.crawl();
        sourceStatus[crawler.source] = { status: 'ok', jobsFound: rawJobs.length };
        this.logger.log(`${crawler.source}: ${rawJobs.length} jobs found`);
        await this.processRawJobs(rawJobs, crawler.source);
      } catch (err) {
        this.logger.error(`${crawler.source} crawl failed:`, err);
        sourceStatus[crawler.source] = { status: 'error', error: (err as Error).message };
      }
    }

    const now = new Date();
    await this.crawlMetaModel.updateOne(
      { key: 'singleton' },
      { $set: { lastCrawledAt: now, sourceStatus }, $setOnInsert: { key: 'singleton' } },
      { upsert: true },
    ).exec();

    this.crawling = false;
    this.logger.log('Crawl cycle complete');

    await this.runScoringBatch().catch((err) =>
      this.logger.error('Scoring batch failed:', err),
    );

    this.sendDigests().catch((err) =>
      this.logger.error('Email digest sending failed:', err),
    );
  }

  async crawlSingleJob(url: string): Promise<JobListingDocument | null> {
    const crawler = this.detectCrawlerForUrl(url);
    if (!crawler) return null;

    const rawJobs = await crawler.crawl();
    if (rawJobs.length === 0) return null;

    const rawJob = rawJobs[0];
    const existing = await this.jobListingModel.findOne({ sourceId: rawJob.sourceId }).exec();
    if (existing) return existing;

    return this.insertJob(rawJob);
  }

  private detectCrawlerForUrl(url: string): BaseCrawler | null {
    if (url.includes('boards.greenhouse.io')) return this.greenhouseCrawler;
    if (url.includes('jobs.lever.co')) return this.leverCrawler;
    if (url.includes('myworkdayjobs.com')) return this.workdayCrawler;
    if (url.includes('remoteok.com')) return this.remoteOkCrawler;
    if (url.includes('weworkremotely.com')) return this.weWorkRemotelyCrawler;
    if (url.includes('otta.com')) return this.ottaCrawler;
    if (url.includes('linkedin.com')) return this.linkedInCrawler;
    return null;
  }

  private async processRawJobs(rawJobs: RawJob[], source: string): Promise<void> {
    let newCount = 0;
    for (const raw of rawJobs) {
      const existing = await this.jobListingModel.findOne({ sourceId: raw.sourceId }).exec();
      if (existing) continue;
      await this.insertJob(raw);
      newCount++;
    }
    if (newCount > 0) {
      this.logger.log(`${source}: ${newCount} new jobs inserted`);
    }
  }

  private async insertJob(raw: RawJob): Promise<JobListingDocument> {
    const companyName = cleanCompanyName(decodeHtmlEntities(normalizeCompanyName(raw.companyName)));
    const roleTitle = decodeHtmlEntities(raw.roleTitle);
    const rawDescription = decodeHtmlEntities(raw.descriptionRaw);
    const locationRaw = cleanLocation(decodeHtmlEntities(raw.location || ''));

    const postedAt = raw.postedAt || new Date();
    const expiresAt = new Date(postedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { location: extractedLocation, isRemote } = extractLocation(locationRaw);
    const salary = parseSalary(rawDescription);
    const experienceLevel = detectExperienceLevel(roleTitle, rawDescription) ?? undefined;

    return this.jobListingModel.create({
      source: raw.source,
      sourceId: raw.sourceId,
      companyName,
      roleTitle,
      location: extractedLocation ?? undefined,
      isRemote: raw.isRemote || isRemote,
      postedAt,
      expiresAt,
      applicationUrl: raw.applicationUrl ?? undefined,
      descriptionRaw: rawDescription,
      extractedFields: {
        experienceLevel,
        salaryMin: salary.min ?? undefined,
        salaryMax: salary.max ?? undefined,
        salaryCurrency: salary.currency ?? undefined,
        languages: extractLanguages(rawDescription),
      },
      isVerified: raw.isVerified,
      crawledAt: new Date(),
    });
  }

  async scoreJobsForUser(userId: string, resumeId: string): Promise<void> {
    const newJobs = await this.jobListingModel.find({
      _id: { $nin: await this.getScoredJobIds(userId) },
      isExpired: { $ne: true },
    }).sort({ postedAt: -1 }).limit(50).exec();

    if (newJobs.length === 0) {
      this.logger.log(`No unscored jobs for user ${userId}`);
      return;
    }

    this.logger.log(`Scoring ${newJobs.length} jobs for user ${userId}`);
    for (const job of newJobs) {
      try {
        const atsResult = await this.atsService.score(
          userId,
          resumeId,
          job.descriptionRaw || '',
          undefined,
          job.roleTitle,
          job.companyName,
        );

        const matched = (atsResult.matchedKeywords || []).map((k: any) => k.keyword || k);
        const missing = (atsResult.missingKeywords || []).map((k: any) => k.keyword || k);

        const line = this.generateIntelligenceLine(atsResult.score, matched, missing);

        await this.jobMatchModel.create({
          userId: new Types.ObjectId(userId),
          jobListingId: job._id as Types.ObjectId,
          resumeId: new Types.ObjectId(resumeId),
          atsScore: atsResult.score,
          matchedKeywords: matched,
          missingKeywords: missing,
          sectionScores: atsResult.sectionScores || {},
          matchIntelligenceLine: line,
          scoredAt: new Date(),
        });
      } catch (err) {
        this.logger.error(`Scoring failed for job ${job._id}:`, err);
      }
    }
  }

  private async runScoringBatch(): Promise<void> {
    const prefs = await this.prefsModel.find({}).populate('resumeId').exec();
    for (const pref of prefs) {
      if (!pref.resumeId) continue;
      const userId = (pref.userId as Types.ObjectId).toString();
      const resumeId = (pref.resumeId as Types.ObjectId).toString();
      await this.scoreJobsForUser(userId, resumeId);
    }
  }

  private async getScoredJobIds(userId: string): Promise<Types.ObjectId[]> {
    const matches = await this.jobMatchModel.find({ userId: new Types.ObjectId(userId) }).select('jobListingId').exec();
    return matches.map((m) => m.jobListingId);
  }

  private generateIntelligenceLine(score: number, matched: string[], missing: string[]): string {
    if (score >= 75) {
      if (missing.length === 0) return 'Your resume is an excellent match for this role.';
      return `Strong match — your resume matches ${matched.length} of ${matched.length + missing.length} key requirements.`;
    }
    if (score >= 50) {
      if (missing.length > 0) {
        const top = missing.slice(0, 3).join(', ');
        return `Your resume matches ${matched.length} of ${matched.length + missing.length} requirements. Missing: ${top}.`;
      }
      return 'Your resume partially aligns with this role. Consider tailoring before applying.';
    }
    if (missing.length > 0) {
      const top = missing.slice(0, 3).join(', ');
      return `Your skills section is missing ${missing.length} must-have requirements for this role. Missing: ${top}.`;
    }
    return 'This role requires different qualifications than what your resume shows.';
  }

  // ─── Email Digest ───

  startAutoGhosting(): void {
    setInterval(() => this.runAutoGhosting(), 60 * 60 * 1000);
    this.runAutoGhosting();
  }

  private async runAutoGhosting(): Promise<void> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    try {
      const stale = await this.jobAppModel.find({
        stage: 'applied',
        lastActivityAt: { $lt: fourteenDaysAgo },
        isDeleted: { $ne: true },
      }).populate('jobListingId', 'roleTitle companyName').exec();

      for (const app of stale) {
        const job = app.jobListingId as any;
        const jobLabel = job?.roleTitle ? `${job.roleTitle} at ${job.companyName}` : String(app.jobListingId);
        app.stage = 'ghosted';
        app.lastActivityAt = new Date();
        app.activityLog.push({
          action: `${jobLabel} hasn't responded in 2 weeks. Auto-moved to ghosted.`,
          timestamp: new Date(),
        });
        await app.save();
        this.logger.log(`Auto-ghosted application ${app._id}`);
      }

      if (stale.length > 0) {
        this.logger.log(`Auto-ghosting: moved ${stale.length} applications to ghosted`);
      }
    } catch (err) {
      this.logger.error('Auto-ghosting check failed:', err);
    }
  }

  private async sendDigests(): Promise<void> {
    const prefs = await this.prefsModel.find({ emailAlertsEnabled: true }).exec();
    for (const pref of prefs) {
      try {
        await this.sendDigest((pref.userId as Types.ObjectId).toString());
      } catch (err) {
        this.logger.error(`Digest failed for user ${pref.userId}:`, err);
      }
    }
  }

  async sendDigest(userId: string): Promise<void> {
    const prefs = await this.prefsModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!prefs || !prefs.emailAlertsEnabled) return;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newJobs = await this.jobListingModel.find({
      postedAt: { $gte: twentyFourHoursAgo },
      isExpired: { $ne: true },
    }).sort({ postedAt: -1 }).limit(5).lean().exec();

    if (newJobs.length === 0) return;

    const jobIds = newJobs.map((j) => j._id);
    const matches = await this.jobMatchModel.find({
      userId: new Types.ObjectId(userId),
      jobListingId: { $in: jobIds },
    }).lean().exec();

    const aboveThreshold = matches.filter((m) => m.atsScore >= (prefs.minimumMatchScore || 60));
    if (aboveThreshold.length === 0) return;

    const avgScore = Math.round(matches.reduce((sum, m) => sum + m.atsScore, 0) / matches.length);

    const subject = `${aboveThreshold.length} new role${aboveThreshold.length > 1 ? 's' : ''} match your resume this morning`;
    let body = `<p>Good morning! Here are the latest roles that match your resume:</p>`;
    body += `<table cellpadding="0" cellspacing="0" style="width:100%;max-width:480px">`;
    for (const match of aboveThreshold) {
      const job = newJobs.find((j) => j._id.toString() === match.jobListingId.toString());
      if (!job) continue;
      body += `<tr><td style="padding:12px 0;border-bottom:1px solid #eee;">`;
      body += `<p style="margin:0 0 2px;font-size:13px;color:#333;"><strong>${job.roleTitle}</strong> at ${job.companyName}</p>`;
      body += `<p style="margin:0 0 4px;font-size:12px;color:#666;">Match: ${match.atsScore}% · ${job.isRemote ? 'Remote' : job.location || 'Unknown'} · ${this.formatDate(job.postedAt)}</p>`;
      const trackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/discover/feed?job=${job._id}`;
      body += `<a href="${trackUrl}" style="display:inline-block;padding:6px 14px;font-size:12px;color:#fff;background:#0F6E56;border-radius:6px;text-decoration:none;">Track this</a>`;
      body += `</td></tr>`;
    }
    body += `</table>`;
    body += `<p style="font-size:12px;color:#999;margin-top:16px;">Your resume scored an average of ${avgScore}% against today's new listings.</p>`;

    this.logger.log(`[Email Digest] To user ${userId}: ${subject}`);
    this.logger.log(`[Email Digest] Body: ${body}`);
    this.logger.log(`[Email Digest] Email would be sent to user ${userId}. Configure SMTP/Resend/SendGrid for production delivery.`);
  }

  private formatDate(date: Date): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
}
