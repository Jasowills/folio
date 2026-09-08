import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface ICIMSCompany {
  name: string;
  boardUrl: string;
}

const ICIMS_COMPANIES: ICIMSCompany[] = [
  { name: 'Johnson & Johnson', boardUrl: 'https://jobs.jnj.com' },
  { name: 'Deloitte', boardUrl: 'https://careers.deloitte.com' },
  { name: 'KPMG', boardUrl: 'https://careers.kpmg.com' },
  { name: 'Cisco', boardUrl: 'https://jobs.cisco.com' },
  { name: 'Intel', boardUrl: 'https://jobs.intel.com' },
  { name: 'Oracle', boardUrl: 'https://careers.oracle.com' },
  { name: 'ADP', boardUrl: 'https://careers.adp.com' },
  { name: 'Aon', boardUrl: 'https://careers.aon.com' },
  { name: 'Cigna', boardUrl: 'https://careers.cigna.com' },
  { name: 'Northrop Grumman', boardUrl: 'https://careers.northropgrumman.com' },
  { name: 'Raytheon', boardUrl: 'https://careers.rtx.com' },
  { name: 'Boeing', boardUrl: 'https://jobs.boeing.com' },
  { name: 'Honeywell', boardUrl: 'https://careers.honeywell.com' },
  { name: 'Caterpillar', boardUrl: 'https://careers.caterpillar.com' },
  { name: 'Ecolab', boardUrl: 'https://careers.ecolab.com' },
  { name: 'Pitney Bowes', boardUrl: 'https://careers.pitneybowes.com' },
  { name: 'Kelly Services', boardUrl: 'https://careers.kellyservices.com' },
  { name: 'Aerotek', boardUrl: 'https://careers.aerotek.com' },
  { name: 'TEKsystems', boardUrl: 'https://careers.teksystems.com' },
  { name: 'Randstad', boardUrl: 'https://careers.randstadusa.com' },
];

interface ICIMSJob {
  title?: string;
  id?: string;
  location?: string;
  url?: string;
  postedDate?: string;
  description?: string;
}

@Injectable()
export class ICIMSCrawler extends BaseCrawler {
  source = 'icims';

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const company of ICIMS_COMPANIES) {
      await this.rateLimit();
      try {
        const jobs = await this.crawlCompany(company);
        allJobs.push(...jobs);
      } catch {
        continue;
      }
    }
    return allJobs;
  }

  private async crawlCompany(company: ICIMSCompany): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const searchUrl = `${company.boardUrl}/jobs/search?pr=0&schemaId=&o=`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Folio/1.0',
        Accept: 'application/json, text/html',
      },
    });

    if (!response.ok) return jobs;

    const text = await response.text();
    let jsonData: any;

    try {
      jsonData = JSON.parse(text);
    } catch {
      return this.parseFromHtml(text, company);
    }

    const results = Array.isArray(jsonData)
      ? jsonData
      : jsonData?.results || jsonData?.jobs || jsonData?.data || [];

    for (const job of results) {
      const parsed = this.parseJob(job, company);
      if (parsed) jobs.push(parsed);
    }

    return jobs;
  }

  private parseFromHtml(html: string, company: ICIMSCompany): RawJob[] {
    const jobs: RawJob[] = [];
    const jobRegex =
      /<div[^>]*class=["'][^"']*(?:job|result)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match: RegExpExecArray | null;

    while ((match = jobRegex.exec(html)) !== null) {
      const block = match[1];
      const titleMatch = block.match(
        /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!titleMatch) continue;

      const url = titleMatch[1].startsWith('http')
        ? titleMatch[1]
        : `${company.boardUrl}${titleMatch[1]}`;
      const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
      if (!title) continue;

      const locationMatch = block.match(
        /<span[^>]*class=["'][^"']*(?:location|city|state)["'][^>]*>([^<]+)<\/span>/i,
      );
      const location = locationMatch ? locationMatch[1].trim() : null;
      const id =
        url.match(/[?&]jobId[=](\d+)/)?.[1] || url.split('/').pop() || '';

      jobs.push({
        source: 'icims',
        sourceId: `icims-${company.name}-${id}`,
        roleTitle: title,
        companyName: company.name,
        location,
        isRemote: location ? location.toLowerCase().includes('remote') : false,
        postedAt: null,
        descriptionRaw: '',
        applicationUrl: url,
        isVerified: false,
      });
    }
    return jobs;
  }

  private parseJob(job: any, company: ICIMSCompany): RawJob | null {
    const title = job.title || job.name || '';
    if (!title) return null;

    const id = job.id || job.jobId || String(Math.random()).slice(2);
    const location = job.location || job.city || null;
    const locationStr =
      typeof location === 'string' ? location : location?.name || null;
    const url = job.url || job.applyUrl || `${company.boardUrl}/jobs/${id}/job`;
    const description = (job.description || job.descriptionPlain || '')
      .replace(/<[^>]*>/g, '')
      .trim();
    const postedDate = job.postedDate || job.datePosted || null;

    return {
      source: 'icims',
      sourceId: `icims-${company.name}-${id}`,
      roleTitle: title,
      companyName: company.name,
      location: locationStr,
      isRemote: locationStr
        ? locationStr.toLowerCase().includes('remote')
        : false,
      postedAt: postedDate ? new Date(postedDate) : null,
      descriptionRaw: description,
      applicationUrl: url,
      isVerified: false,
    };
  }
}
