import { Injectable } from '@nestjs/common';

export type ATSPlatform =
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'icims'
  | 'ashby'
  | 'smartrecruiters'
  | 'unknown';

@Injectable()
export class AtsRouterService {
  detectATS(url: string): ATSPlatform {
    if (!url) return 'unknown';

    if (url.includes('boards.greenhouse.io') || url.includes('greenhouse.io'))
      return 'greenhouse';
    if (url.includes('jobs.lever.co') || url.includes('lever.co'))
      return 'lever';
    if (
      url.includes('myworkdayjobs.com') ||
      url.includes('wd5.myworkdayjobs.com')
    )
      return 'workday';
    if (url.includes('icims.com')) return 'icims';
    if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com'))
      return 'ashby';
    if (url.includes('smartrecruiters.com')) return 'smartrecruiters';

    return 'unknown';
  }

  getApplicationUrlPattern(platform: ATSPlatform): string {
    switch (platform) {
      case 'greenhouse':
        return 'https://boards.greenhouse.io/*/jobs/*';
      case 'lever':
        return 'https://jobs.lever.co/*/*';
      case 'workday':
        return 'https://*.myworkdayjobs.com/*';
      case 'icims':
        return 'https://*.icims.com/jobs/*';
      case 'ashby':
        return 'https://jobs.ashbyhq.com/*';
      case 'smartrecruiters':
        return 'https://jobs.smartrecruiters.com/*';
      default:
        return 'unknown';
    }
  }
}
