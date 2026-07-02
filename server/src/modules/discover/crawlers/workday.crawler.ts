import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { BaseCrawler, RawJob } from './base.crawler';

interface WorkdayCompany {
  name: string;
  baseUrl: string;
}

const WORKDAY_COMPANIES: WorkdayCompany[] = [
  { name: 'Amazon', baseUrl: 'https://amazon.wd5.myworkdayjobs.com/AmazonJobs' },
  { name: 'Microsoft', baseUrl: 'https://microsoft.wd3.myworkdayjobs.com/MicrosoftCareers' },
  { name: 'Apple', baseUrl: 'https://apple.wd5.myworkdayjobs.com/AppleCareers' },
  { name: 'Google', baseUrl: 'https://google.wd5.myworkdayjobs.com/GoogleCareers' },
  { name: 'Meta', baseUrl: 'https://meta.wd5.myworkdayjobs.com/MetaCareers' },
  { name: 'Netflix', baseUrl: 'https://netflix.wd5.myworkdayjobs.com/NetflixCareers' },
  { name: 'Salesforce', baseUrl: 'https://salesforce.wd5.myworkdayjobs.com/ExternalCareerSite' },
  { name: 'Adobe', baseUrl: 'https://adobe.wd5.myworkdayjobs.com/external' },
  { name: 'Uber', baseUrl: 'https://uber.wd5.myworkdayjobs.com/UberCareers' },
  { name: 'Shopify', baseUrl: 'https://shopify.wd5.myworkdayjobs.com/Shopify' },
  { name: 'Spotify', baseUrl: 'https://spotify.wd5.myworkdayjobs.com/SpotifyCareers' },
  { name: 'Slack', baseUrl: 'https://slack.wd5.myworkdayjobs.com/SlackCareers' },
  { name: 'Square', baseUrl: 'https://square.wd5.myworkdayjobs.com/SquareCareers' },
  { name: 'Atlassian', baseUrl: 'https://atlassian.wd5.myworkdayjobs.com/AtlassianCareers' },
  { name: 'Twilio', baseUrl: 'https://twilio.wd5.myworkdayjobs.com/TwilioCareers' },
  { name: 'Cisco', baseUrl: 'https://cisco.wd5.myworkdayjobs.com/CiscoJobs' },
  { name: 'Oracle', baseUrl: 'https://oracle.wd5.myworkdayjobs.com/OracleCareers' },
  { name: 'IBM', baseUrl: 'https://ibm.wd5.myworkdayjobs.com/IBMJobs' },
  { name: 'Intel', baseUrl: 'https://intel.wd5.myworkdayjobs.com/IntelJobs' },
  { name: 'Qualcomm', baseUrl: 'https://qualcomm.wd5.myworkdayjobs.com/QualcommJobs' },
  { name: 'AMD', baseUrl: 'https://amd.wd5.myworkdayjobs.com/AMDJobs' },
  { name: 'NVIDIA', baseUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIACareers' },
  { name: 'HP', baseUrl: 'https://hp.wd5.myworkdayjobs.com/HPJobs' },
  { name: 'Dell', baseUrl: 'https://dell.wd5.myworkdayjobs.com/DellCareers' },
  { name: 'PayPal', baseUrl: 'https://paypal.wd5.myworkdayjobs.com/PayPalCareers' },
  { name: 'Stripe', baseUrl: 'https://stripe.wd5.myworkdayjobs.com/StripeCareers' },
  { name: 'Airbnb', baseUrl: 'https://airbnb.wd5.myworkdayjobs.com/AirbnbCareers' },
  { name: 'Palantir', baseUrl: 'https://palantir.wd5.myworkdayjobs.com/PalantirCareers' },
  { name: 'Snowflake', baseUrl: 'https://snowflake.wd5.myworkdayjobs.com/SnowflakeCareers' },
  { name: 'Databricks', baseUrl: 'https://databricks.wd5.myworkdayjobs.com/DatabricksCareers' },
];

@Injectable()
export class WorkdayCrawler extends BaseCrawler {
  source = 'workday';
  private readonly logger = new Logger(WorkdayCrawler.name);

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const company of WORKDAY_COMPANIES) {
      await this.rateLimit();
      try {
        const jobs = await this.crawlCompany(company);
        allJobs.push(...jobs);
      } catch (err) {
        throw err;
      }
    }
    return allJobs;
  }

  private async crawlCompany(company: WorkdayCompany): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,mp4,mp3,avi,webm}', (route) => route.abort());
      await page.goto(company.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      const jobSelector = '[class*="job"], [data-automation-id*="job"], [class*="posting"], a[href*="job"]';
      const links = await page.$$(jobSelector);
      const seen = new Set<string>();

      for (const link of links.slice(0, 30)) {
        try {
          const text = await link.innerText();
          const href = await link.getAttribute('href');
          if (!text.trim()) continue;

          const title = text.split('\n')[0].trim();
          if (seen.has(title)) continue;
          seen.add(title);

          const isRemote = text.toLowerCase().includes('remote');
          const location = text.split('\n').find((l) => l.includes(',') || l.match(/[A-Z]{2}/)) || null;

          jobs.push({
            source: 'workday',
            sourceId: `workday-${company.name}-${Buffer.from(title).toString('base64').slice(0, 30)}`,
            roleTitle: title,
            companyName: company.name,
            location,
            isRemote,
            postedAt: new Date(),
            descriptionRaw: text,
            applicationUrl: href ? (href.startsWith('http') ? href : `${company.baseUrl}${href}`) : company.baseUrl,
            isVerified: true,
          });
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      this.logger.warn(`Workday crawl failed for ${company.name}:`, err);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }
}
