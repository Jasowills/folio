import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutoApplyProfile, AutoApplyProfileDocument } from './auto-apply-profile.schema';
import { UpdateLogisticsDto, CreateCustomQaDto, UpdateCustomQaDto, UpdateStyleDto } from './auto-apply-profile.dto';

const REQUIRED_FIELDS: (keyof AutoApplyProfile)[] = ['logisticsAnswers', 'applicationStyle'];

const REQUIRED_LOGISTICS_FIELDS = [
  'availabilityToStart',
  'visaSponsorshipNeeded',
  'workAuthorizationStatus',
  'remotePreference',
] as const;

const REQUIRED_STYLE_FIELDS = ['tone', 'lengthPreference'] as const;

@Injectable()
export class AutoApplyProfileService {
  private readonly logger = new Logger(AutoApplyProfileService.name);

  constructor(
    @InjectModel(AutoApplyProfile.name) private profileModel: Model<AutoApplyProfileDocument>,
  ) {}

  async getProfile(userId: string): Promise<AutoApplyProfileDocument> {
    const profile = await this.profileModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();
    if (!profile) {
      return this.createDefault(userId);
    }
    return profile;
  }

  async getProfileOrThrow(userId: string): Promise<AutoApplyProfileDocument> {
    const profile = await this.profileModel.findOne({
      userId: new Types.ObjectId(userId),
    }).exec();
    if (!profile) throw new NotFoundException('Auto-apply profile not found. Complete the setup wizard first.');
    return profile;
  }

  private async createDefault(userId: string): Promise<AutoApplyProfileDocument> {
    return this.profileModel.create({
      userId: new Types.ObjectId(userId),
      logisticsAnswers: {
        availabilityToStart: 'immediately',
        visaSponsorshipNeeded: false,
        workAuthorizationStatus: '',
        willingToRelocate: false,
        remotePreference: 'flexible',
        hasNonCompete: false,
        salaryCurrency: 'USD',
      },
      applicationStyle: {
        tone: 'professional_warm',
        lengthPreference: 'standard',
        writeInFirstPerson: true,
        avoidPhrases: [],
      },
      customQA: [],
      completedRequiredSetup: false,
      lastUpdatedAt: new Date(),
    });
  }

  async updateLogistics(userId: string, dto: UpdateLogisticsDto): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    profile.logisticsAnswers = { ...dto } as any;
    profile.lastUpdatedAt = new Date();
    profile.completedRequiredSetup = this.checkCompletion(profile);
    return profile.save();
  }

  async addCustomQa(userId: string, dto: CreateCustomQaDto): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    profile.customQA.push({
      questionPattern: dto.questionPattern,
      answerTemplate: dto.answerTemplate,
      isSensitive: dto.isSensitive ?? false,
      createdAt: new Date(),
    });
    profile.lastUpdatedAt = new Date();
    return profile.save();
  }

  async updateCustomQa(userId: string, qaId: string, dto: UpdateCustomQaDto): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    const entry = (profile.customQA as any[]).find((e: any) => e._id.toString() === qaId);
    if (!entry) throw new NotFoundException('Custom QA entry not found');
    if (dto.questionPattern !== undefined) entry.questionPattern = dto.questionPattern;
    if (dto.answerTemplate !== undefined) entry.answerTemplate = dto.answerTemplate;
    if (dto.isSensitive !== undefined) entry.isSensitive = dto.isSensitive;
    profile.lastUpdatedAt = new Date();
    return profile.save();
  }

  async deleteCustomQa(userId: string, qaId: string): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    const before = profile.customQA.length;
    profile.customQA = profile.customQA.filter((e: any) => e._id.toString() !== qaId) as any;
    if (profile.customQA.length === before) throw new NotFoundException('Custom QA entry not found');
    profile.lastUpdatedAt = new Date();
    return profile.save();
  }

  async updateStyle(userId: string, dto: UpdateStyleDto): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    profile.applicationStyle = { ...dto } as any;
    profile.lastUpdatedAt = new Date();
    profile.completedRequiredSetup = this.checkCompletion(profile);
    return profile.save();
  }

  async getCompletionStatus(userId: string): Promise<{ complete: boolean; missingFields: string[] }> {
    const profile = await this.getProfile(userId);
    const missingFields = this.getMissingFields(profile);
    return { complete: missingFields.length === 0, missingFields };
  }

  async updateWizardStep(userId: string, step: number): Promise<AutoApplyProfileDocument> {
    const profile = await this.getProfile(userId);
    profile.wizardStep = step;
    profile.lastUpdatedAt = new Date();
    return profile.save();
  }

  async isSetupComplete(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    return profile.completedRequiredSetup && this.checkCompletion(profile);
  }

  private checkCompletion(profile: AutoApplyProfileDocument): boolean {
    return this.getMissingFields(profile).length === 0;
  }

  private getMissingFields(profile: AutoApplyProfileDocument): string[] {
    const missing: string[] = [];
    const l = profile.logisticsAnswers as any;
    for (const field of REQUIRED_LOGISTICS_FIELDS) {
      const val = l[field];
      if (val === undefined || val === null || val === '' || (typeof val === 'boolean' && field === 'workAuthorizationStatus')) {
        if (field === 'workAuthorizationStatus' && !val) missing.push(`logisticsAnswers.${field}`);
      } else if (val === undefined || val === null || val === '') {
        missing.push(`logisticsAnswers.${field}`);
      }
    }
    const s = profile.applicationStyle as any;
    for (const field of REQUIRED_STYLE_FIELDS) {
      if (!s[field]) missing.push(`applicationStyle.${field}`);
    }
    return missing;
  }
}
