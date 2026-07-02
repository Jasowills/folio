import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface LeverCompany {
  name: string;
  boardUrl: string;
}

const LEVER_COMPANIES: LeverCompany[] = [
  { name: 'Buffer', boardUrl: 'https://jobs.lever.co/buffer' },
  { name: 'Help Scout', boardUrl: 'https://jobs.lever.co/helpscout' },
  { name: 'ConvertKit', boardUrl: 'https://jobs.lever.co/convertkit' },
  { name: 'Basecamp', boardUrl: 'https://jobs.lever.co/basecamp' },
  { name: 'Fellow', boardUrl: 'https://jobs.lever.co/fellow' },
  { name: 'Doist', boardUrl: 'https://jobs.lever.co/doist' },
  { name: 'Transistor', boardUrl: 'https://jobs.lever.co/transistor' },
  { name: 'Podia', boardUrl: 'https://jobs.lever.co/podia' },
  { name: 'Ghost', boardUrl: 'https://jobs.lever.co/ghost' },
  { name: 'Zapier', boardUrl: 'https://jobs.lever.co/zapier' },
  { name: 'Automattic', boardUrl: 'https://jobs.lever.co/automattic' },
  { name: 'Tailwind Labs', boardUrl: 'https://jobs.lever.co/tailwindlabs' },
  { name: 'Stellate', boardUrl: 'https://jobs.lever.co/stellate' },
  { name: 'Logto', boardUrl: 'https://jobs.lever.co/logto' },
  { name: 'Warp', boardUrl: 'https://jobs.lever.co/warp' },
  { name: 'Tuple', boardUrl: 'https://jobs.lever.co/tuple' },
  { name: 'Screenjar', boardUrl: 'https://jobs.lever.co/screenjar' },
  { name: 'Beehiiv', boardUrl: 'https://jobs.lever.co/beehiiv' },
  { name: 'Clerk', boardUrl: 'https://jobs.lever.co/clerk' },
  { name: 'Arc', boardUrl: 'https://jobs.lever.co/arc' },
  { name: 'Nango', boardUrl: 'https://jobs.lever.co/nango' },
  { name: 'Inkeep', boardUrl: 'https://jobs.lever.co/inkeep' },
  { name: 'TinaCMS', boardUrl: 'https://jobs.lever.co/tinacms' },
  { name: 'Rowy', boardUrl: 'https://jobs.lever.co/rowy' },
  { name: 'NocoDB', boardUrl: 'https://jobs.lever.co/nocodb' },
  { name: 'Plane', boardUrl: 'https://jobs.lever.co/plane' },
  { name: 'Documenso', boardUrl: 'https://jobs.lever.co/documenso' },
  { name: 'Formbricks', boardUrl: 'https://jobs.lever.co/formbricks' },
  { name: 'Cal.com', boardUrl: 'https://jobs.lever.co/calcom' },
  { name: 'Novu', boardUrl: 'https://jobs.lever.co/novu' },
  { name: 'Appwrite', boardUrl: 'https://jobs.lever.co/appwrite' },
  { name: 'Supabase', boardUrl: 'https://jobs.lever.co/supabase' },
  { name: 'Strapi', boardUrl: 'https://jobs.lever.co/strapi' },
  { name: 'Medusa', boardUrl: 'https://jobs.lever.co/medusa' },
  { name: 'Directus', boardUrl: 'https://jobs.lever.co/directus' },
  { name: 'Payload CMS', boardUrl: 'https://jobs.lever.co/payloadcms' },
  { name: 'Webstudio', boardUrl: 'https://jobs.lever.co/webstudio' },
  { name: 'Trigger.dev', boardUrl: 'https://jobs.lever.co/triggerdev' },
  { name: 'Eventiva', boardUrl: 'https://jobs.lever.co/eventiva' },
  { name: 'Hanko', boardUrl: 'https://jobs.lever.co/hanko' },
  { name: 'Kinde', boardUrl: 'https://jobs.lever.co/kinde' },
  { name: 'Logto', boardUrl: 'https://jobs.lever.co/logto' },
  { name: 'Oso', boardUrl: 'https://jobs.lever.co/oso' },
  { name: 'Permit.io', boardUrl: 'https://jobs.lever.co/permitio' },
  { name: 'Superwall', boardUrl: 'https://jobs.lever.co/superwall' },
  { name: 'Teleport', boardUrl: 'https://jobs.lever.co/teleport' },
  { name: 'Uffizzi', boardUrl: 'https://jobs.lever.co/uffizzi' },
  { name: 'Warrant', boardUrl: 'https://jobs.lever.co/warrant' },
  { name: 'Zuplo', boardUrl: 'https://jobs.lever.co/zuplo' },
  { name: 'Convictional', boardUrl: 'https://jobs.lever.co/convictional' },
];

@Injectable()
export class LeverCrawler extends BaseCrawler {
  source = 'lever';

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const company of LEVER_COMPANIES) {
      await this.rateLimit();
      try {
        const response = await fetch(company.boardUrl, {
          headers: { 'User-Agent': 'Folio/1.0' },
        });
        if (!response.ok) continue;
        const html = await response.text();
        const jobs = this.extractJobsFromBoard(html, company);
        allJobs.push(...jobs);
      } catch (err) {
        throw err;
      }
    }
    return allJobs;
  }

  private extractJobsFromBoard(html: string, company: LeverCompany): RawJob[] {
    const jobs: RawJob[] = [];
    const postingsRegex = /<a[^>]*href=["']([^"']*\/[a-f0-9-]{36})["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seenIds = new Set<string>();

    while ((match = postingsRegex.exec(html)) !== null) {
      const url = match[1];
      const inner = match[2];
      const titleMatch = inner.match(/<h4[^>]*>([^<]+)<\/h4>/i)
        || inner.match(/class=["'][^"']*(?:title|posting-title)["'][^>]*>([^<]+)</i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      if (!title) continue;

      const id = url.split('/').pop() || url;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const locationMatch = inner.match(/(?:Remote|(?:San Francisco|New York|London|Berlin|Austin|Seattle|Chicago|Los Angeles|Toronto|Sydney|Singapore|Dublin|Amsterdam|Paris|Tokyo|Bangalore|Austin|Denver|Portland|Miami|Boston|Washington|Philadelphia|Atlanta|Dallas|Houston|Phoenix|Minneapolis|Detroit|Seattle|Portland|Vancouver|Montreal|Melbourne))\s*(?:,\s*[A-Z]{2})?/gi);
      const locationText = locationMatch ? locationMatch[0] : null;

      jobs.push({
        source: 'lever',
        sourceId: `lever-${company.name}-${id}`,
        roleTitle: title,
        companyName: company.name,
        location: locationText,
        isRemote: locationText ? locationText.toLowerCase().includes('remote') : false,
        postedAt: null,
        descriptionRaw: '',
        applicationUrl: url.startsWith('http') ? url : `https://jobs.lever.co${url}`,
        isVerified: true,
      });
    }
    return jobs;
  }
}
