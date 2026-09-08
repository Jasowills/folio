import { Injectable, Logger } from '@nestjs/common';
import { AtsRouterService, ATSPlatform } from './ats-router.service';
import {
  GreenhouseAdapter,
  type FillResult,
} from './ats-adapters/greenhouse.adapter';
import { LeverAdapter } from './ats-adapters/lever.adapter';
import { WorkdayAdapter } from './ats-adapters/workday.adapter';
import { ICIMSAdapter } from './ats-adapters/icims.adapter';
import { AshbyAdapter } from './ats-adapters/ashby.adapter';
import { SmartRecruitersAdapter } from './ats-adapters/smartrecruiters.adapter';
import type { ApplyField } from './schemas/apply-submission.schema';

interface FillApplicationParams {
  applicationUrl: string;
  atsPlatform: ATSPlatform;
  resumeUrl: string;
  coverLetterContent?: string;
  userData?: {
    fullName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    website?: string;
    githubUrl?: string;
  };
}

@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);

  constructor(
    private atsRouter: AtsRouterService,
    private greenhouseAdapter: GreenhouseAdapter,
    private leverAdapter: LeverAdapter,
    private workdayAdapter: WorkdayAdapter,
    private icimsAdapter: ICIMSAdapter,
    private ashbyAdapter: AshbyAdapter,
    private smartRecruitersAdapter: SmartRecruitersAdapter,
  ) {}

  async fillApplication(params: FillApplicationParams): Promise<{
    success: boolean;
    fields: ApplyField[];
    screeningQuestions: { question: string; inputType: string }[];
    error?: string;
  }> {
    const {
      applicationUrl,
      atsPlatform,
      resumeUrl,
      coverLetterContent,
      userData,
    } = params;

    switch (atsPlatform) {
      case 'greenhouse':
        return this.greenhouseAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      case 'lever':
        return this.leverAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      case 'workday':
        return this.workdayAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      case 'icims':
        return this.icimsAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      case 'ashby':
        return this.ashbyAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      case 'smartrecruiters':
        return this.smartRecruitersAdapter.fillApplication(
          applicationUrl,
          resumeUrl,
          coverLetterContent,
          userData,
        );
      default:
        return {
          success: false,
          fields: [],
          screeningQuestions: [],
          error: `Unsupported ATS platform: ${atsPlatform}`,
        };
    }
  }

  getAdapter(platform: ATSPlatform): any {
    switch (platform) {
      case 'greenhouse':
        return this.greenhouseAdapter;
      case 'lever':
        return this.leverAdapter;
      case 'workday':
        return this.workdayAdapter;
      case 'icims':
        return this.icimsAdapter;
      case 'ashby':
        return this.ashbyAdapter;
      case 'smartrecruiters':
        return this.smartRecruitersAdapter;
      default:
        return null;
    }
  }
}
