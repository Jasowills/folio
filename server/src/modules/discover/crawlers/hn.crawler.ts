import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class HNCrawler extends BaseCrawler {
  source = 'hn';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      const threadTitle = `Ask HN: Who is hiring? (${monthNames[month]} ${year})`;
      const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(threadTitle)}&tags=story`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return jobs;
      const searchData = await searchRes.json();

      const story = searchData.hits?.[0];
      if (!story) return jobs;
      const threadId = story.objectID;

      const commentsUrl = `https://hn.algolia.com/api/v1/items/${threadId}`;
      const commentsRes = await fetch(commentsUrl);
      if (!commentsRes.ok) return jobs;
      const commentsData = await commentsRes.json();

      const comments = commentsData.children || [];
      const seen = new Set<string>();

      for (const comment of comments) {
        if (!comment.text || comment.text.startsWith('<!--')) continue;
        const text = comment.text.replace(/<[^>]+>/g, '').trim();
        const firstLine = text.split('\n')[0].trim();
        const parsed = this.parseComment(firstLine, text);
        if (!parsed) continue;

        const dedupKey = `${parsed.company}|${parsed.role}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        jobs.push({
          source: 'hn',
          sourceId: `hn-${comment.objectID || dedupKey}`,
          roleTitle: parsed.role,
          companyName: parsed.company,
          location: parsed.location ?? null,
          isRemote: parsed.isRemote,
          postedAt: new Date(story.created_at || now),
          descriptionRaw: text,
          applicationUrl: parsed.url ?? null,
          isVerified: false,
        });
      }
    } catch (err) {
      throw err;
    }
    return jobs;
  }

  private parseComment(
    firstLine: string,
    fullText: string,
  ): {
    company: string;
    role: string;
    location?: string;
    isRemote: boolean;
    url?: string;
  } | null {
    const cleaned = firstLine.replace(/^\d+\.\s*/, '').trim();

    const pipeMatch = cleaned.match(/^([^|]+)\|([^|]+?)(?:\|(.+))?$/);
    if (pipeMatch) {
      const company = pipeMatch[1].trim();
      const role = pipeMatch[2].trim();
      const rest = pipeMatch[3]?.trim();
      const isRemote =
        (rest || '').toLowerCase().includes('remote') ||
        cleaned.toLowerCase().includes('remote');
      const location =
        rest && !isRemote ? rest.replace(/\([^)]*\)/g, '').trim() : undefined;

      const urlMatch = fullText.match(/(https?:\/\/[^\s,)]+)/);
      return { company, role, location, isRemote, url: urlMatch?.[1] };
    }

    const hyphenMatch = cleaned.match(/^([^-]+)\s*[-–—]\s*(.+)/);
    if (hyphenMatch) {
      const company = hyphenMatch[1].trim();
      const rest = hyphenMatch[2].trim();
      const locationMatch = rest.match(/\(([^)]+)\)/);
      const role = locationMatch ? rest.replace(/\([^)]+\)/, '').trim() : rest;
      const isRemote = cleaned.toLowerCase().includes('remote');
      const location =
        locationMatch && !isRemote ? locationMatch[1] : undefined;

      const urlMatch = fullText.match(/(https?:\/\/[^\s,)]+)/);
      return { company, role, location, isRemote, url: urlMatch?.[1] };
    }

    return null;
  }
}
