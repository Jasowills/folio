import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ResumeVariant,
  ResumeVariantDocument,
  ResumeContentDiff,
} from './resume-variant.schema';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { ResumeDiffService } from './resume-diff.service';
import {
  JobApplication,
  JobApplicationDocument,
} from '../../discover/schemas/job-application.schema';

@Injectable()
export class ResumeVariantService {
  private readonly logger = new Logger(ResumeVariantService.name);

  constructor(
    @InjectModel(ResumeVariant.name)
    private variantModel: Model<ResumeVariantDocument>,
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
    @InjectModel(JobApplication.name)
    private jobAppModel: Model<JobApplicationDocument>,
    private diffService: ResumeDiffService,
  ) {}

  async create(
    userId: string,
    baseResumeId: string,
    tailoredData: Record<string, unknown>,
    templateId: string,
    options?: { tailoredForJobId?: string; label?: string },
  ): Promise<ResumeVariantDocument> {
    const base = await this.resumeModel
      .findOne({
        _id: new Types.ObjectId(baseResumeId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!base) throw new NotFoundException('Base resume not found');

    const frozenSnapshot = JSON.parse(JSON.stringify(base)) as Record<
      string,
      unknown
    >;
    delete frozenSnapshot.versions;

    const contentDiff = this.diffService.generateDiff(
      frozenSnapshot,
      tailoredData,
    );

    return this.variantModel.create({
      userId: new Types.ObjectId(userId),
      baseResumeId: new Types.ObjectId(baseResumeId),
      templateId,
      contentDiff,
      frozenSnapshot,
      tailoredForJobId: options?.tailoredForJobId
        ? new Types.ObjectId(options.tailoredForJobId)
        : undefined,
      label: options?.label,
    });
  }

  async findByBaseResume(
    userId: string,
    baseResumeId: string,
  ): Promise<ResumeVariantDocument[]> {
    return this.variantModel
      .find({
        userId: new Types.ObjectId(userId),
        baseResumeId: new Types.ObjectId(baseResumeId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(
    userId: string,
    variantId: string,
  ): Promise<ResumeVariantDocument> {
    const variant = await this.variantModel
      .findOne({
        _id: new Types.ObjectId(variantId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  async render(
    userId: string,
    variantId: string,
  ): Promise<Record<string, unknown>> {
    const variant = await this.findById(userId, variantId);

    let baseData: Record<string, unknown>;
    if (variant.frozenSnapshot) {
      baseData = variant.frozenSnapshot;
    } else {
      const base = await this.resumeModel
        .findById(variant.baseResumeId)
        .lean()
        .exec();
      if (!base) throw new NotFoundException('Base resume not found');
      baseData = base as unknown as Record<string, unknown>;
    }

    return this.diffService.resolveDiff(baseData, variant.contentDiff);
  }

  async diff(
    userId: string,
    variantId: string,
    compareToId: string,
  ): Promise<
    | ResumeContentDiff
    | {
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        diff: ResumeContentDiff;
      }
  > {
    const variant = await this.findById(userId, variantId);

    if (compareToId === 'base') {
      let baseData: Record<string, unknown>;
      if (variant.frozenSnapshot) {
        baseData = variant.frozenSnapshot;
      } else {
        const base = await this.resumeModel
          .findById(variant.baseResumeId)
          .lean()
          .exec();
        if (!base) throw new NotFoundException('Base resume not found');
        baseData = base as unknown as Record<string, unknown>;
      }

      const resolved = this.diffService.resolveDiff(
        baseData,
        variant.contentDiff,
      );
      return { before: baseData, after: resolved, diff: variant.contentDiff };
    }

    const compareVariant = await this.findById(userId, compareToId);
    const a = await this.render(userId, variantId);
    const b = await this.render(userId, compareToId);
    const diff = this.diffService.generateDiff(a, b);

    return { before: a, after: b, diff };
  }

  async getPerformance(userId: string): Promise<any[]> {
    const variants = await this.variantModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    const variantIds = variants.map((v) => v._id.toString());
    const apps = await this.jobAppModel
      .find({
        userId: new Types.ObjectId(userId),
        resumeVariantId: { $in: variantIds },
      })
      .lean()
      .exec();

    const appMap = new Map<string, any[]>();
    for (const app of apps) {
      const vid = (app as any).resumeVariantId?.toString();
      if (!vid) continue;
      const list = appMap.get(vid) || [];
      list.push(app);
      appMap.set(vid, list);
    }

    return variants.map((v) => {
      const variantApps = appMap.get(v._id.toString()) || [];
      const totalSent = variantApps.length;
      const responded = variantApps.filter(
        (a) => !['saved', 'tailoring', 'applied', 'pending'].includes(a.stage),
      );
      const interviews = variantApps.filter((a) =>
        [
          'phone_screen',
          'technical',
          'final_round',
          'offer',
          'accepted',
        ].includes(a.stage),
      );

      return {
        variantId: v._id.toString(),
        label: v.label,
        templateId: v.templateId,
        totalSent,
        responseCount: responded.length,
        interviewCount: interviews.length,
        responseRate:
          totalSent > 0 ? Math.round((responded.length / totalSent) * 100) : 0,
        sampleSizeWarning: totalSent < 5,
      };
    });
  }
}
