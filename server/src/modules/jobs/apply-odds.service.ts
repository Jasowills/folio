import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApplyOddsAssessment,
  ApplyOddsAssessmentDocument,
} from './apply-odds.schema';
import {
  JobListing,
  JobListingDocument,
} from '../discover/schemas/job-listing.schema';
import {
  JobMatch,
  JobMatchDocument,
} from '../discover/schemas/job-match.schema';

const PRESTIGE_COMPANIES = new Set([
  'google',
  'meta',
  'amazon',
  'apple',
  'microsoft',
  'netflix',
  'google inc',
  'meta platforms',
  'amazon.com',
  'amazon web services',
  'apple inc',
  'microsoft corporation',
  'netflix inc',
  'stripe',
  'airbnb',
  'uber',
  'lyft',
  'spotify',
  'slack',
  'twitter',
  'x corp',
  'linkedin',
  'salesforce',
  'oracle',
  'nvidia',
  'intel',
  'ibm',
  'cisco',
  'adobe',
  'vmware',
  'palantir',
  'datadog',
  'mongodb',
  'cloudflare',
  'snowflake',
  'coinbase',
  'robinhood',
  'square',
  'block',
  'shopify',
  'figma',
  'notion',
  'vercel',
  'databricks',
  'scale ai',
  'openai',
  'anthropic',
  'deepmind',
  'hugging face',
]);

@Injectable()
export class ApplyOddsService {
  private readonly logger = new Logger(ApplyOddsService.name);

  constructor(
    @InjectModel(ApplyOddsAssessment.name)
    private oddsModel: Model<ApplyOddsAssessmentDocument>,
    @InjectModel(JobListing.name)
    private jobListingModel: Model<JobListingDocument>,
    @InjectModel(JobMatch.name)
    private jobMatchModel: Model<JobMatchDocument>,
  ) {}

  async getOrCreate(
    userId: string,
    jobId: string,
  ): Promise<ApplyOddsAssessmentDocument> {
    const existing = await this.oddsModel
      .findOne({
        userId: new Types.ObjectId(userId),
        jobId: new Types.ObjectId(jobId),
      })
      .exec();

    if (existing) return existing;

    return this.create(userId, jobId);
  }

  async create(
    userId: string,
    jobId: string,
  ): Promise<ApplyOddsAssessmentDocument> {
    const [match, listing] = await Promise.all([
      this.jobMatchModel
        .findOne({
          userId: new Types.ObjectId(userId),
          jobListingId: new Types.ObjectId(jobId),
        })
        .lean()
        .exec(),
      this.jobListingModel.findById(jobId).lean().exec(),
    ]);

    const atsScore = match?.atsScore ?? null;
    const listingAgeDays = listing?.postedAt
      ? Math.floor(
          (Date.now() - new Date(listing.postedAt).getTime()) / 86400000,
        )
      : null;

    const competitionLevel = this.estimateCompetition(listing, listingAgeDays);
    const recommendation = this.getRecommendation(
      atsScore,
      listingAgeDays,
      competitionLevel,
    );
    const reasoningNotes = this.buildReasoning(
      atsScore,
      listingAgeDays,
      competitionLevel,
      recommendation,
      listing,
    );

    const assessment = await this.oddsModel.create({
      userId: new Types.ObjectId(userId),
      jobId: new Types.ObjectId(jobId),
      atsScore: atsScore ?? undefined,
      listingAgeDays: listingAgeDays ?? undefined,
      estimatedCompetitionLevel: competitionLevel,
      recommendation,
      reasoningNotes,
      generatedAt: new Date(),
    });

    return assessment;
  }

  private estimateCompetition(
    listing: any | null,
    ageDays: number | null,
  ): 'low' | 'medium' | 'high' | 'unknown' {
    if (!listing) return 'unknown';

    const companyName = (listing.companyName || '').toLowerCase().trim();
    const isPrestige = PRESTIGE_COMPANIES.has(companyName);

    if (ageDays === null) {
      return isPrestige ? 'high' : 'medium';
    }

    const isFresh = ageDays <= 7;
    const isStale = ageDays > 30;

    if (isPrestige && isFresh) return 'high';
    if (isPrestige) return 'high';
    if (isFresh) return 'medium';
    if (isStale) return 'low';
    return 'medium';
  }

  private getRecommendation(
    atsScore: number | null,
    ageDays: number | null,
    competition: string,
  ): 'strong_apply' | 'apply' | 'long_shot' | 'skip' {
    if (ageDays !== null && ageDays > 60) return 'skip';

    if (atsScore === null) return 'apply';

    if (atsScore >= 80 && competition !== 'high') return 'strong_apply';
    if (atsScore >= 80) return 'apply';

    if (atsScore >= 60 && competition !== 'high') return 'apply';
    if (atsScore >= 60) return 'apply';

    if (atsScore >= 40) return 'long_shot';
    return 'skip';
  }

  private buildReasoning(
    atsScore: number | null,
    ageDays: number | null,
    competition: string,
    recommendation: string,
    listing: any | null,
  ): string[] {
    const notes: string[] = [];

    if (atsScore !== null) {
      notes.push(
        `ATS match: ${atsScore}%${atsScore >= 80 ? ' (strong)' : atsScore >= 60 ? ' (moderate)' : atsScore >= 40 ? ' (weak)' : ' (poor)'}.`,
      );
    } else {
      notes.push(
        'ATS score not available — scored based on listing metadata only.',
      );
    }

    if (ageDays !== null) {
      const ageLabel =
        ageDays === 0
          ? 'posted today'
          : ageDays === 1
            ? 'posted yesterday'
            : `listed ${ageDays} days ago`;
      notes.push(
        `Listing ${ageLabel}${ageDays > 30 ? ' (may be stale or filled).' : '.'}`,
      );
    } else {
      notes.push('Listing age unknown.');
    }

    const companyName = listing?.companyName || 'Unknown';
    if (competition === 'high') {
      notes.push(
        `Competition estimate: high — ${companyName} typically receives many applications.`,
      );
    } else if (competition === 'medium') {
      notes.push('Competition estimate: moderate.');
    } else if (competition === 'low') {
      notes.push(
        'Competition estimate: low — older listing with likely fewer active applicants.',
      );
    } else {
      notes.push('Competition estimate: unknown.');
    }

    if (recommendation === 'strong_apply') {
      notes.push(
        'Recommendation: strong apply. Your profile is a good match for a fresh listing.',
      );
    } else if (recommendation === 'apply') {
      notes.push(
        'Recommendation: apply. Reasonable match with moderate competition.',
      );
    } else if (recommendation === 'long_shot') {
      notes.push(
        'Recommendation: long shot. Low ATS match — consider tailoring your resume before applying.',
      );
    } else if (recommendation === 'skip') {
      notes.push(
        'Recommendation: skip. Low match and stale listing — focus on better-fitting opportunities.',
      );
    }

    notes.push(
      'Competition level is a heuristic estimate, not precise market data.',
    );

    return notes;
  }
}
