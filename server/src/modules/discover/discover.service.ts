import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobListing, JobListingDocument } from './schemas/job-listing.schema';
import { JobMatch, JobMatchDocument } from './schemas/job-match.schema';
import {
  JobApplication,
  JobApplicationDocument,
  ActivityLogEntry,
  ChecklistState,
} from './schemas/job-application.schema';
import {
  DiscoverPreferences,
  DiscoverPreferencesDocument,
} from './schemas/discover-preferences.schema';
import { CrawlMeta, CrawlMetaDocument } from './schemas/crawl-meta.schema';
import { UserSignal, UserSignalDocument } from './schemas/user-signal.schema';
import { DiscoverCrawlService } from './discover-crawl.service';
import {
  FeedQueryDto,
  UpsertPreferencesDto,
  TrackJobDto,
  UpdateTrackerJobDto,
  DismissJobDto,
} from './dto';
import {
  normalizeCompanyName,
  cleanCompanyName,
  cleanLocation,
  decodeHtmlEntities,
  fixMojibake,
} from './extractors/job-extractor';
import { ResumesService } from '../resumes/resumes.service';

const COUNTRY_NAMES = [
  'nigeria',
  'ghana',
  'kenya',
  'south africa',
  'egypt',
  'morocco',
  'ethiopia',
  'united states',
  'usa',
  'united kingdom',
  'uk',
  'canada',
  'australia',
  'germany',
  'france',
  'spain',
  'italy',
  'netherlands',
  'sweden',
  'norway',
  'denmark',
  'finland',
  'switzerland',
  'austria',
  'belgium',
  'ireland',
  'portugal',
  'poland',
  'czech republic',
  'india',
  'china',
  'japan',
  'south korea',
  'singapore',
  'brazil',
  'mexico',
  'argentina',
  'chile',
];

function inferLocationTerms(raw: string): string[] {
  const lower = raw.toLowerCase().replace(/[,.]/g, '').trim();
  const parts = lower.split(/\s+/).filter(Boolean);

  // If the location contains a known country, return that country
  const matchedCountry = COUNTRY_NAMES.find((c) => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(lower);
  });
  if (matchedCountry) return [matchedCountry];

  // Otherwise return all meaningful parts (city names, regions)
  const filtered = parts.filter(
    (p) =>
      p.length > 2 &&
      ![
        'san',
        'los',
        'las',
        'de',
        'del',
        'el',
        'la',
        'le',
        'du',
        'des',
      ].includes(p),
  );
  return filtered.length > 0 ? filtered : [];
}

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);

  constructor(
    @InjectModel(JobListing.name)
    private jobListingModel: Model<JobListingDocument>,
    @InjectModel(JobMatch.name) private jobMatchModel: Model<JobMatchDocument>,
    @InjectModel(JobApplication.name)
    private jobAppModel: Model<JobApplicationDocument>,
    @InjectModel(DiscoverPreferences.name)
    private prefsModel: Model<DiscoverPreferencesDocument>,
    @InjectModel(CrawlMeta.name)
    private crawlMetaModel: Model<CrawlMetaDocument>,
    @InjectModel(UserSignal.name)
    private userSignalModel: Model<UserSignalDocument>,
    private crawlService: DiscoverCrawlService,
    private resumesService: ResumesService,
  ) {}

  // ─── Preferences ───

  async getPreferences(
    userId: string,
  ): Promise<DiscoverPreferencesDocument | null> {
    return this.prefsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async upsertPreferences(
    userId: string,
    dto: UpsertPreferencesDto,
  ): Promise<DiscoverPreferencesDocument> {
    const update: any = {};
    let resumeChanged = false;
    if (dto.targetRoles !== undefined) update.targetRoles = dto.targetRoles;
    if (dto.resumeId !== undefined) {
      if (dto.resumeId !== '') {
        update.resumeId = new Types.ObjectId(dto.resumeId);
        resumeChanged = true;
      } else {
        update.resumeId = null;
      }
    }
    if (dto.preferredLocations !== undefined)
      update.preferredLocations = dto.preferredLocations;
    if (dto.isRemoteOnly !== undefined) update.isRemoteOnly = dto.isRemoteOnly;
    if (dto.experienceLevels !== undefined)
      update.experienceLevels = dto.experienceLevels;
    if (dto.excludedRoleFamilies !== undefined)
      update.excludedRoleFamilies = dto.excludedRoleFamilies;
    if (dto.excludedSeniorities !== undefined)
      update.excludedSeniorities = dto.excludedSeniorities;
    if (dto.minimumMatchScore !== undefined)
      update.minimumMatchScore = dto.minimumMatchScore;
    if (dto.excludeApplied !== undefined)
      update.excludeApplied = dto.excludeApplied;
    if (dto.excludeRejected !== undefined)
      update.excludeRejected = dto.excludeRejected;
    if (dto.emailAlertsEnabled !== undefined)
      update.emailAlertsEnabled = dto.emailAlertsEnabled;
    if (dto.enabledSources !== undefined)
      update.enabledSources = dto.enabledSources;

    const prefs = await this.prefsModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: update },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    if (resumeChanged && prefs.resumeId) {
      const rid = prefs.resumeId.toString();
      this.crawlService
        .scoreJobsForUser(userId, rid)
        .catch((err) =>
          this.logger.error(
            `On-demand scoring failed for user ${userId}:`,
            err,
          ),
        );
    }

    return prefs;
  }

  // ─── Feed ───

  async getFeed(userId: string, query: FeedQueryDto) {
    const prefs = await this.prefsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    const filter: any = {
      isExpired: { $ne: true },
    };

    // Default: exclude non-tech unless user explicitly opts in
    if (query.techRelevance === 'all') {
      // show everything
    } else if (query.techRelevance === 'non-tech') {
      filter.techRelevance = 'non-tech';
    } else {
      filter.techRelevance = { $ne: 'non-tech' };
    }

    if (query.sources && query.sources.length > 0) {
      filter.source = { $in: query.sources };
    } else if (prefs?.enabledSources && prefs.enabledSources.length > 0) {
      filter.source = { $in: prefs.enabledSources };
    }

    // Hard filters: exclude by role family
    const excludedFamilies = query.excludedRoleFamilies?.length
      ? query.excludedRoleFamilies
      : prefs?.excludedRoleFamilies || [];
    if (excludedFamilies.length > 0) {
      filter['extractedFields.roleFamily'] = { $nin: excludedFamilies };
    }

    // Hard filters: exclude by seniority level
    const excludedSeniorities = query.excludedSeniorities?.length
      ? query.excludedSeniorities
      : prefs?.excludedSeniorities || [];
    if (excludedSeniorities.length > 0) {
      filter['extractedFields.seniorityLevel'] = { $nin: excludedSeniorities };
    }

    if (query.remoteOnly) {
      filter.isRemote = true;
    }

    if (query.postedWithin) {
      const now = new Date();
      switch (query.postedWithin) {
        case '24h':
          filter.postedAt = { $gte: new Date(now.getTime() - 86400000) };
          break;
        case '3d':
          filter.postedAt = { $gte: new Date(now.getTime() - 259200000) };
          break;
        case 'week':
          filter.postedAt = { $gte: new Date(now.getTime() - 604800000) };
          break;
      }
    }

    if (query.hasSalary) {
      filter['extractedFields.salaryMin'] = { $ne: null };
    }

    if (query.excludeApplied !== false) {
      const appliedJobIds = await this.getUserTrackedJobIds(userId, [
        'saved',
        'tailoring',
        'applied',
        'phone_screen',
        'technical',
        'final_round',
        'offer',
        'accepted',
      ]);
      if (appliedJobIds.length > 0) {
        filter._id = { $nin: appliedJobIds };
      }
    }

    if (query.excludeRejected) {
      const rejectedIds = await this.getUserTrackedJobIds(userId, ['rejected']);
      if (rejectedIds.length > 0) {
        if (filter._id) {
          filter._id = { ...filter._id, $nin: rejectedIds };
        } else {
          filter._id = { $nin: rejectedIds };
        }
      }
    }

    if (prefs) {
      if (prefs.hiddenJobIds.length > 0) {
        const hiddenObjIds = prefs.hiddenJobIds
          .map((id) => {
            try {
              return new Types.ObjectId(id);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        if (hiddenObjIds.length > 0) {
          if (filter._id) {
            filter._id = { ...filter._id, $nin: hiddenObjIds };
          } else {
            filter._id = { $nin: hiddenObjIds };
          }
        }
      }

      // Filter by preferred experience levels
      if (prefs.experienceLevels && prefs.experienceLevels.length > 0) {
        filter['extractedFields.seniorityLevel'] = {
          $in: prefs.experienceLevels,
        };
      }
    }

    const sort: any = {};
    switch (query.sort || 'relevance') {
      case 'newest':
        sort.postedAt = -1;
        break;
      case 'salary':
        sort['extractedFields.salaryMax'] = -1;
        break;
      default:
        sort.postedAt = -1;
        break;
    }
    sort._id = -1;

    const limit = Math.min(query.limit || 20, 50);
    const cursorQuery: any = { ...filter };
    if (query.cursor) {
      const cursorDoc = await this.jobListingModel
        .findById(query.cursor)
        .exec();
      if (cursorDoc) {
        const sortField = sort.postedAt
          ? 'postedAt'
          : sort['extractedFields.salaryMax']
            ? 'extractedFields.salaryMax'
            : null;
        if (sortField) {
          const sortValue = (cursorDoc as any)[sortField];
          if (sortValue === null || sortValue === undefined) {
            cursorQuery[sortField] = null;
            cursorQuery._id = { ...cursorQuery._id, $lt: cursorDoc._id };
          } else {
            cursorQuery.$or = [
              { [sortField]: { $lt: sortValue } },
              { [sortField]: sortValue, _id: { $lt: cursorDoc._id } },
            ];
          }
        } else {
          cursorQuery._id = { ...cursorQuery._id, $lt: cursorDoc._id };
        }
      }
    }

    const jobs = await this.jobListingModel
      .find(cursorQuery)
      .sort(sort)
      .limit(limit + 1)
      .lean()
      .exec();

    let hasMore = jobs.length > limit;
    if (hasMore) jobs.pop();

    const jobIds = jobs.map((j) => j._id);
    const matches = await this.jobMatchModel
      .find({
        userId: new Types.ObjectId(userId),
        jobListingId: { $in: jobIds },
      })
      .lean()
      .exec();

    const matchMap = new Map<string, any>();
    for (const m of matches) {
      matchMap.set(m.jobListingId.toString(), m);
    }

    const trackedJobIds = await this.getUserTrackedJobIds(userId);

    let jobsWithMatches = jobs.map((job) => {
      const id = job._id.toString();
      const match = matchMap.get(id);
      const isTracked = trackedJobIds.includes(id);
      const decodedTitle = decodeHtmlEntities(job.roleTitle);
      return {
        ...job,
        companyName: cleanCompanyName(
          fixMojibake(
            decodeHtmlEntities(normalizeCompanyName(job.companyName)),
          ),
        ),
        roleTitle:
          job.aiEnhancedTitle && job.aiEnhancedTitle !== decodedTitle
            ? job.aiEnhancedTitle
            : fixMojibake(decodedTitle),
        location: job.location
          ? cleanLocation(fixMojibake(decodeHtmlEntities(job.location)))
          : job.location,
        descriptionRaw: fixMojibake(decodeHtmlEntities(job.descriptionRaw)),
        match: match || null,
        isTracked,
      };
    });

    const minScore = query.minScore ?? prefs?.minimumMatchScore;
    let stage = jobsWithMatches.length;
    if (minScore !== undefined) {
      const scoredCount = jobsWithMatches.filter((j) => j.match).length;
      jobsWithMatches = jobsWithMatches.filter(
        (j) => !j.match || j.match.atsScore >= minScore,
      );
      console.log('[DiscoverService] afterScore filter', {
        before: stage,
        after: jobsWithMatches.length,
        minScore,
        scoredCount,
        passingScored: jobsWithMatches.filter((j) => j.match).length,
        exampleScores: jobsWithMatches
          .filter((j) => j.match)
          .slice(0, 3)
          .map((j) => ({ title: j.roleTitle, score: j.match.atsScore })),
      });
    }

    // Filter by target roles — match on individual tokens, not just the full phrase
    // e.g. "software engineer" matches "Backend Software Engineer" or "Full Stack Engineer"
    const targetRoles =
      prefs?.targetRoles
        ?.filter(Boolean)
        .map((r) => r.trim().toLowerCase())
        .filter((r) => r.length > 0) || [];
    if (targetRoles.length > 0) {
      stage = jobsWithMatches.length;
      const before = jobsWithMatches.length;
      const roleTokens = targetRoles.flatMap((r) => r.split(/\s+/));
      jobsWithMatches = jobsWithMatches.filter((j) => {
        const title = (j.roleTitle || '').toLowerCase();
        const aiTitle = (j.aiEnhancedTitle || '').toLowerCase();
        // Pass if whole phrase matches OR if most tokens appear in the title
        const passesExact = targetRoles.some(
          (role) => title.includes(role) || aiTitle.includes(role),
        );
        if (passesExact) return true;
        const matches = roleTokens.filter(
          (t) => title.includes(t) || aiTitle.includes(t),
        ).length;
        // Pass if at least half of the tokens appear in the title
        return roleTokens.length > 0 && matches / roleTokens.length >= 0.5;
      });
      console.log('[DiscoverService] afterRole filter', {
        before,
        after: jobsWithMatches.length,
        targetRoles,
        roleTokens,
      });
    }

    // Filter by preferred experience levels (if set)
    const expLevels = prefs?.experienceLevels?.filter(Boolean) || [];
    if (expLevels.length > 0) {
      stage = jobsWithMatches.length;
      jobsWithMatches = jobsWithMatches.filter((j) => {
        const level = j.extractedFields?.seniorityLevel;
        return level && expLevels.includes(level);
      });
      console.log('[DiscoverService] afterExpLevel filter', {
        before: stage,
        after: jobsWithMatches.length,
        expLevels,
      });
    }

    // Resume-based intelligence: skills + location from the user's resume
    let resumeLocation: string | null = null;
    let userSkills: string[] = [];

    if (prefs?.resumeId) {
      try {
        const resume = await this.resumesService.findById(
          prefs.resumeId.toString(),
          userId,
        );
        resumeLocation = resume.contact?.location?.trim() || null;
        userSkills = (resume.skills || []).map((s: string) => s.toLowerCase());
      } catch (err) {
        this.logger.debug(`Resume lookup failed: ${(err as Error).message}`);
      }
    }

    // Annotate unscored jobs with skill-match info for relevance sorting, but don't hard-filter
    if (userSkills.length > 0) {
      const beforeSkill = jobsWithMatches.length;
      const unscoredBefore = jobsWithMatches.filter((j) => !j.match).length;
      jobsWithMatches = jobsWithMatches.map((j) => {
        if (j.match) return j;
        const title = (j.roleTitle || '').toLowerCase();
        const text =
          `${title} ${j.companyName || ''} ${j.descriptionRaw || ''}`.toLowerCase();
        const matchedSkills = userSkills.filter((s: string) =>
          text.includes(s),
        );
        const titleSkills = userSkills.filter((s: string) => title.includes(s));
        return {
          ...j,
          skillMatch: matchedSkills.length,
          titleSkillMatch: titleSkills.length,
        } as any;
      });
      const unscoredAfter = jobsWithMatches.filter((j) => !j.match).length;
      console.log('[DiscoverService] afterSkill annotate', {
        before: beforeSkill,
        after: jobsWithMatches.length,
        unscoredBefore,
        unscoredAfter,
        userSkillsCount: userSkills.length,
      });
    }

    // Location filter: only use preferredLocations when user explicitly set them
    // Don't infer from resume — that overfilters (e.g. "Lagos, Nigeria" → ["nigeria"])
    const preferredLocs = prefs?.preferredLocations || [];
    if (preferredLocs.length > 0 && !query.remoteOnly) {
      const lowerLocs = preferredLocs.map((l) => l.toLowerCase());
      jobsWithMatches = jobsWithMatches.filter(
        (j) =>
          j.isRemote ||
          (j.location != null &&
            lowerLocs.some((loc: string) =>
              j.location!.toLowerCase().includes(loc),
            )),
      );
    }

    const resultJobs = jobsWithMatches.slice(0, limit);
    hasMore = hasMore || jobsWithMatches.length > limit;

    console.log(
      '[DiscoverService.getFeed] pipeline',
      JSON.stringify({
        userId,
        rawDb: jobs.length,
        hasMoreDb: hasMore,
        minScore,
        targetRoles,
        expLevels,
        userSkillsCount: userSkills.length,
        resumeLocation,
        preferredLocs,
        final: resultJobs.length,
        hasMoreFinal: hasMore || jobsWithMatches.length > limit,
      }),
    );

    const lastJob = resultJobs[resultJobs.length - 1];
    if (lastJob && !lastJob._id) {
      console.warn(
        '[DiscoverService.getFeed] lastJob missing _id:',
        JSON.stringify(lastJob, null, 2),
      );
    }
    return {
      jobs: resultJobs,
      cursor: hasMore && lastJob && lastJob._id ? lastJob._id.toString() : null,
      hasMore,
    };
  }

  async getFeedStats(userId: string) {
    const [meta, prefs] = await Promise.all([
      this.crawlMetaModel.findOne({ key: 'singleton' }).exec(),
      this.prefsModel.findOne({ userId: new Types.ObjectId(userId) }).exec(),
    ]);

    const totalJobs = await this.jobListingModel
      .countDocuments({ isExpired: { $ne: true } })
      .exec();
    let newSinceVisit = 0;
    if (prefs?.lastVisitedAt) {
      newSinceVisit = await this.jobListingModel
        .countDocuments({
          isExpired: { $ne: true },
          postedAt: { $gte: prefs.lastVisitedAt },
        })
        .exec();
    }

    return {
      totalJobs,
      newSinceVisit,
      lastCrawledAt: meta?.lastCrawledAt || null,
      sourceStatus: meta?.sourceStatus || {},
    };
  }

  async hideJob(userId: string, jobId: string): Promise<void> {
    await this.prefsModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        { $addToSet: { hiddenJobIds: jobId } },
      )
      .exec();
  }

  async dismissJob(
    userId: string,
    jobId: string,
    dto: DismissJobDto,
  ): Promise<void> {
    const now = new Date();
    await this.prefsModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        { $addToSet: { hiddenJobIds: jobId } },
      )
      .exec();

    await this.userSignalModel
      .create({
        userId: new Types.ObjectId(userId),
        jobListingId: new Types.ObjectId(jobId),
        dismissReason: dto.reason as any,
        weight: 1.0,
        dismissedAt: now,
      })
      .catch((err) =>
        this.logger.debug(
          `UserSignal save failed (duplicate?): ${(err as Error).message}`,
        ),
      );
  }

  async updateLastVisited(userId: string): Promise<void> {
    await this.prefsModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        { $set: { lastVisitedAt: new Date() } },
      )
      .exec();
  }

  // ─── Tracker ───

  async getTracker(userId: string) {
    const apps = await this.jobAppModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: { $ne: true },
      })
      .populate('jobListingId')
      .sort({ lastActivityAt: -1 })
      .lean()
      .exec();

    const jobIds = apps.map((a) => (a.jobListingId as any)._id);
    const matches = await this.jobMatchModel
      .find({
        userId: new Types.ObjectId(userId),
        jobListingId: { $in: jobIds },
      })
      .lean()
      .exec();

    const matchMap = new Map<string, any>();
    for (const m of matches) {
      matchMap.set(m.jobListingId.toString(), m);
    }

    return apps.map((app) => {
      const jobListing = app.jobListingId as any;
      const match = matchMap.get(jobListing?._id?.toString());
      if (jobListing) {
        jobListing.companyName = cleanCompanyName(
          decodeHtmlEntities(normalizeCompanyName(jobListing.companyName)),
        );
        jobListing.roleTitle = decodeHtmlEntities(jobListing.roleTitle);
        jobListing.location = jobListing.location
          ? cleanLocation(decodeHtmlEntities(jobListing.location))
          : jobListing.location;
        jobListing.descriptionRaw = decodeHtmlEntities(
          jobListing.descriptionRaw,
        );
      }
      return { ...app, jobListing, match: match || null };
    });
  }

  async trackJob(
    userId: string,
    dto: TrackJobDto,
  ): Promise<JobApplicationDocument> {
    let jobListingId: string;

    if (dto.jobListingId) {
      jobListingId = dto.jobListingId;
    } else if (dto.url) {
      const listing = await this.crawlService.crawlSingleJob(dto.url);
      if (!listing)
        throw new BadRequestException('Could not extract job from URL');
      jobListingId = listing._id.toString();
    } else if (dto.description) {
      const listing = await this.jobListingModel.create({
        source: 'manual',
        sourceId: `manual-${Date.now()}-${Buffer.from(dto.description.slice(0, 50)).toString('base64').slice(0, 20)}`,
        companyName: 'Unknown',
        roleTitle: 'Unknown',
        descriptionRaw: dto.description,
        postedAt: new Date(),
        crawledAt: new Date(),
        isVerified: false,
      });
      jobListingId = listing._id.toString();
    } else {
      throw new BadRequestException(
        'Provide jobListingId, url, or description',
      );
    }

    const prefs = await this.prefsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    const resumeId =
      prefs?.resumeId || new Types.ObjectId('000000000000000000000000');

    const existing = await this.jobAppModel
      .findOne({
        userId: new Types.ObjectId(userId),
        jobListingId: new Types.ObjectId(jobListingId),
      })
      .exec();

    if (existing) return existing;

    const now = new Date();
    return this.jobAppModel.create({
      userId: new Types.ObjectId(userId),
      jobListingId: new Types.ObjectId(jobListingId),
      resumeId,
      stage: 'saved',
      lastActivityAt: now,
      trackedAt: now,
      activityLog: [{ action: 'Tracked job', timestamp: now }],
    });
  }

  async updateTrackerJob(
    userId: string,
    appId: string,
    dto: UpdateTrackerJobDto,
  ): Promise<JobApplicationDocument> {
    const app = await this.jobAppModel
      .findOne({
        _id: new Types.ObjectId(appId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!app) throw new NotFoundException('Job application not found');

    const update: any = {};
    const now = new Date();

    if (dto.stage) {
      update.stage = dto.stage;
      if (dto.stage === 'applied' && !app.appliedAt) {
        update.appliedAt = now;
      }
      update.$push = {
        activityLog: { action: `Moved to ${dto.stage}`, timestamp: now },
      };
    }

    if (dto.notes !== undefined) {
      update.notes = dto.notes;
    }

    if (dto.checklistState) {
      for (const [key, value] of Object.entries(dto.checklistState)) {
        const field = `checklistState.${key}`;
        update[field] = value;
      }
    }

    update.lastActivityAt = now;

    return this.jobAppModel
      .findByIdAndUpdate(appId, { $set: update }, { returnDocument: 'after' })
      .exec() as Promise<JobApplicationDocument>;
  }

  async deleteTrackerJob(userId: string, appId: string): Promise<void> {
    const result = await this.jobAppModel
      .updateOne(
        { _id: new Types.ObjectId(appId), userId: new Types.ObjectId(userId) },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.matchedCount === 0)
      throw new NotFoundException('Job application not found');
  }

  async getTrackerStats(userId: string) {
    const apps = await this.jobAppModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: { $ne: true },
      })
      .lean()
      .exec();

    const totalTracked = apps.length;
    const applied = apps.filter((a) => a.stage === 'applied');
    const phoneScreenOrBeyond = apps.filter((a) =>
      [
        'phone_screen',
        'technical',
        'final_round',
        'offer',
        'accepted',
      ].includes(a.stage),
    );
    const rejected = apps.filter((a) => a.stage === 'rejected');
    const ghosted = apps.filter((a) => a.stage === 'ghosted');

    const respondedCount =
      phoneScreenOrBeyond.length + rejected.length + ghosted.length;
    const totalApplied =
      applied.length +
      phoneScreenOrBeyond.length +
      rejected.length +
      ghosted.length;
    const responseRate =
      totalApplied > 0 ? Math.round((respondedCount / totalApplied) * 100) : 0;

    const jobIds = apps.map((a) => a.jobListingId);
    const matches = await this.jobMatchModel
      .find({
        userId: new Types.ObjectId(userId),
        jobListingId: { $in: jobIds },
      })
      .lean()
      .exec();
    const avgMatchScore =
      matches.length > 0
        ? Math.round(
            matches.reduce((sum, m) => sum + m.atsScore, 0) / matches.length,
          )
        : 0;

    return {
      totalTracked,
      responseRate,
      averageMatchScore: avgMatchScore,
      ghostedCount: ghosted.length,
    };
  }

  // ─── Helpers ───

  private async getUserTrackedJobIds(
    userId: string,
    stages?: string[],
  ): Promise<string[]> {
    const filter: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };
    if (stages) filter.stage = { $in: stages };
    const apps = await this.jobAppModel
      .find(filter)
      .select('jobListingId')
      .lean()
      .exec();
    return [...new Set(apps.map((a) => a.jobListingId.toString()))];
  }
}
