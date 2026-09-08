import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface GreenhouseCompany {
  name: string;
  boardUrl: string;
}

const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  { name: 'Airbnb', boardUrl: 'https://boards.greenhouse.io/airbnb' },
  { name: 'Stripe', boardUrl: 'https://boards.greenhouse.io/stripe' },
  { name: 'Instacart', boardUrl: 'https://boards.greenhouse.io/instacart' },
  { name: 'Reddit', boardUrl: 'https://boards.greenhouse.io/reddit' },
  { name: 'Discord', boardUrl: 'https://boards.greenhouse.io/discord' },
  { name: 'Pinterest', boardUrl: 'https://boards.greenhouse.io/pinterest' },
  { name: 'GitLab', boardUrl: 'https://boards.greenhouse.io/gitlab' },
  { name: 'Coinbase', boardUrl: 'https://boards.greenhouse.io/coinbase' },
  { name: 'Dropbox', boardUrl: 'https://boards.greenhouse.io/dropbox' },
  { name: 'Datadog', boardUrl: 'https://boards.greenhouse.io/datadog' },
  { name: 'HashiCorp', boardUrl: 'https://boards.greenhouse.io/hashicorp' },
  { name: 'Asana', boardUrl: 'https://boards.greenhouse.io/asana' },
  { name: 'Notion', boardUrl: 'https://boards.greenhouse.io/notion' },
  { name: 'Figma', boardUrl: 'https://boards.greenhouse.io/figma' },
  { name: 'Canva', boardUrl: 'https://boards.greenhouse.io/canva' },
  { name: 'Plaid', boardUrl: 'https://boards.greenhouse.io/plaid' },
  { name: 'Brex', boardUrl: 'https://boards.greenhouse.io/brex' },
  { name: 'Rippling', boardUrl: 'https://boards.greenhouse.io/rippling' },
  { name: 'Deel', boardUrl: 'https://boards.greenhouse.io/deel' },
  { name: 'Webflow', boardUrl: 'https://boards.greenhouse.io/webflow' },
  { name: 'Vercel', boardUrl: 'https://boards.greenhouse.io/vercel' },
  { name: 'Supabase', boardUrl: 'https://boards.greenhouse.io/supabase' },
  { name: 'Linear', boardUrl: 'https://boards.greenhouse.io/linear' },
  { name: 'Calendly', boardUrl: 'https://boards.greenhouse.io/calendly' },
  { name: 'Loom', boardUrl: 'https://boards.greenhouse.io/loom' },
  { name: 'Framer', boardUrl: 'https://boards.greenhouse.io/framer' },
  { name: 'Railway', boardUrl: 'https://boards.greenhouse.io/railway' },
  { name: 'WorkOS', boardUrl: 'https://boards.greenhouse.io/workos' },
  { name: 'Vanta', boardUrl: 'https://boards.greenhouse.io/vanta' },
  { name: 'Ramp', boardUrl: 'https://boards.greenhouse.io/ramp' },
  { name: 'Mercury', boardUrl: 'https://boards.greenhouse.io/mercury' },
  { name: 'Descript', boardUrl: 'https://boards.greenhouse.io/descript' },
  { name: 'Replit', boardUrl: 'https://boards.greenhouse.io/replit' },
  { name: 'Substack', boardUrl: 'https://boards.greenhouse.io/substack' },
  { name: 'CircleCI', boardUrl: 'https://boards.greenhouse.io/circleci' },
  { name: 'Sentry', boardUrl: 'https://boards.greenhouse.io/sentry' },
  { name: 'Netlify', boardUrl: 'https://boards.greenhouse.io/netlify' },
  { name: 'Railway', boardUrl: 'https://boards.greenhouse.io/railway' },
  { name: 'Apollo', boardUrl: 'https://boards.greenhouse.io/apollo' },
  { name: 'Scale AI', boardUrl: 'https://boards.greenhouse.io/scaleai' },
  { name: 'Anthropic', boardUrl: 'https://boards.greenhouse.io/anthropic' },
  { name: 'OpenAI', boardUrl: 'https://boards.greenhouse.io/openai' },
  { name: 'Perplexity', boardUrl: 'https://boards.greenhouse.io/perplexity' },
  {
    name: 'Hugging Face',
    boardUrl: 'https://boards.greenhouse.io/huggingface',
  },
  { name: 'Replicate', boardUrl: 'https://boards.greenhouse.io/replicate' },
  { name: 'Modal', boardUrl: 'https://boards.greenhouse.io/modal' },
  { name: 'Airtable', boardUrl: 'https://boards.greenhouse.io/airtable' },
  { name: 'Faire', boardUrl: 'https://boards.greenhouse.io/faire' },
  { name: 'Gusto', boardUrl: 'https://boards.greenhouse.io/gusto' },
  { name: 'Chime', boardUrl: 'https://boards.greenhouse.io/chime' },
];

@Injectable()
export class GreenhouseCrawler extends BaseCrawler {
  source = 'greenhouse';

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const company of GREENHOUSE_COMPANIES) {
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

  private extractJobsFromBoard(
    html: string,
    company: GreenhouseCompany,
  ): RawJob[] {
    const jobs: RawJob[] = [];
    const jobRegex =
      /<a[^>]*href=["']([^"']+\/jobs\/\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seenIds = new Set<string>();

    while ((match = jobRegex.exec(html)) !== null) {
      const url = match[1];
      const inner = match[2];
      const titleMatch =
        inner.match(
          /<span[^>]*class=["'][^"']*(?:title|job-title)["'][^>]*>([^<]+)<\/span>/i,
        ) || inner.match(/([^<>\n]+?)\s*<br/i);
      const locationMatch = inner.match(
        /<span[^>]*class=["'][^"']*location["'][^>]*>([^<]+)<\/span>/i,
      );
      const title = titleMatch ? titleMatch[1].trim() : '';
      if (!title) continue;

      const jobId = url.includes('/jobs/') ? url.split('/jobs/')[1] : url;
      if (seenIds.has(jobId)) continue;
      seenIds.add(jobId);

      jobs.push({
        source: 'greenhouse',
        sourceId: `greenhouse-${company.name}-${jobId}`,
        roleTitle: title,
        companyName: company.name,
        location: locationMatch ? locationMatch[1].trim() : null,
        isRemote: locationMatch
          ? locationMatch[1].toLowerCase().includes('remote')
          : false,
        postedAt: null,
        descriptionRaw: '',
        applicationUrl: url.startsWith('http')
          ? url
          : `${company.boardUrl}${url}`,
        isVerified: true,
      });
    }
    return jobs;
  }
}
