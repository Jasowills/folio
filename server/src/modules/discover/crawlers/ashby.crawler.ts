import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface AshbyBoard {
  name: string;
  boardUrl: string;
}

const ASHBY_BOARDS: AshbyBoard[] = [
  { name: 'Linear', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/linear' },
  { name: 'Raycast', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/raycast' },
  { name: 'Warp', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/warp' },
  { name: 'Lemonade', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/lemonade' },
  { name: 'Synthesia', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/synthesia' },
  { name: 'Notion', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/notion' },
  { name: 'Runway', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/runway' },
  { name: 'HeyGen', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/heygen' },
  { name: 'Mercor', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/mercor' },
  { name: 'Clerk', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/clerk' },
  { name: 'Arcade', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/arcade' },
  { name: 'Kraftful', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/kraftful' },
  { name: 'Tact', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/tact' },
  { name: 'Mistral AI', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/mistralai' },
  { name: 'Together AI', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/togetherai' },
  { name: 'Fireworks AI', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/fireworksai' },
  { name: 'Baseten', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/baseten' },
  { name: 'Recall', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/recall' },
  { name: 'Jasper', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/jasper' },
  { name: 'Copy.ai', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/copyai' },
  { name: 'Typeface', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/typeface' },
  { name: 'Writer', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/writer' },
  { name: 'Anthropic', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/anthropic' },
  { name: 'Perplexity', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/perplexity' },
  { name: 'ElevenLabs', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/elevenlabs' },
  { name: 'Hume AI', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/humeai' },
  { name: 'Cognition AI', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/cognitionai' },
  { name: 'Replit', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/replit' },
  { name: 'Vercel', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/vercel' },
  { name: 'Railway', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/railway' },
  { name: 'Neon', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/neon' },
  { name: 'Supabase', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/supabase' },
  { name: 'Convex', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/convex' },
  { name: 'Trigger.dev', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/triggerdev' },
  { name: 'Resend', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/resend' },
  { name: 'Knock', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/knock' },
  { name: 'Clerk', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/clerk' },
  { name: 'WorkOS', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/workos' },
  { name: 'Stytch', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/stytch' },
  { name: 'Pangea', boardUrl: 'https://api.ashbyhq.com/posting-api/job-board/pangea' },
];

@Injectable()
export class AshbyCrawler extends BaseCrawler {
  source = 'ashby';

  async crawl(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    for (const board of ASHBY_BOARDS) {
      await this.rateLimit();
      try {
        const response = await fetch(board.boardUrl, {
          headers: { 'User-Agent': 'Folio/1.0' },
        });
        if (!response.ok) continue;
        const data = await response.json() as any;
        const jobs = this.extractJobs(data, board);
        allJobs.push(...jobs);
      } catch {
        continue;
      }
    }
    return allJobs;
  }

  private extractJobs(data: any, board: AshbyBoard): RawJob[] {
    const jobs: RawJob[] = [];
    const listings = data?.jobPostings || data?.listings || data?.jobs || [];
    if (!Array.isArray(listings)) return jobs;

    for (const posting of listings) {
      const id = posting.id || posting.jobId || '';
      if (!id) continue;
      const title = posting.title || posting.name || '';
      if (!title) continue;

      const location = posting.location || posting.address || null;
      const locationStr = typeof location === 'string' ? location : location?.name || null;
      const isRemote = locationStr ? locationStr.toLowerCase().includes('remote') : false;
      const description = (posting.descriptionPlain || posting.descriptionHtml || posting.description || '').replace(/<[^>]*>/g, '').trim();
      const postedAt = posting.publishedDate || posting.createdAt || null;
      const applicationUrl = posting.applyUrl || posting.applicationUrl || '';

      jobs.push({
        source: 'ashby',
        sourceId: `ashby-${board.name}-${id}`,
        roleTitle: title,
        companyName: board.name,
        location: locationStr,
        isRemote,
        postedAt: postedAt ? new Date(postedAt) : null,
        descriptionRaw: description,
        applicationUrl: applicationUrl || null,
        isVerified: true,
      });
    }
    return jobs;
  }
}
