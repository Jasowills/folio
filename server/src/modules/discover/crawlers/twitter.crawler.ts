import { Injectable, Logger } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

@Injectable()
export class TwitterCrawler extends BaseCrawler {
  source = 'twitter';
  private readonly logger = new Logger(TwitterCrawler.name);

  async crawl(targetRole?: string): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      this.logger.warn('TWITTER_BEARER_TOKEN not set — skipping Twitter crawl');
      return jobs;
    }

    const roleQuery = targetRole || 'software engineer';
    const query = encodeURIComponent(
      `("we're hiring" OR "now hiring" OR "join our team") ${roleQuery} -filter:retweets lang:en`
    );

    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=100&tweet.fields=created_at,author_id,text&expansions=author_id&user.fields=name,username`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );
      if (!response.ok) {
        this.logger.warn(`Twitter API returned ${response.status}`);
        return jobs;
      }
      const data = await response.json();
      const tweets = data.data || [];
      const users = (data.includes?.users || []).reduce((acc: Record<string, string>, u: any) => {
        acc[u.id] = u.name;
        return acc;
      }, {});

      const seen = new Set<string>();
      for (const tweet of tweets) {
        const text = tweet.text || '';
        const authorName = users[tweet.author_id] || 'Unknown';

        const parsed = this.parseTweet(text, authorName);
        if (!parsed) continue;

        const dedupKey = `${parsed.company}|${parsed.role}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        jobs.push({
          source: 'twitter',
          sourceId: `twitter-${tweet.id}`,
          roleTitle: parsed.role,
          companyName: parsed.company,
          location: parsed.location || null,
          isRemote: parsed.isRemote,
          postedAt: tweet.created_at ? new Date(tweet.created_at) : null,
          descriptionRaw: text,
          applicationUrl: parsed.url || null,
          isVerified: false,
        });
      }
    } catch (err) {
      this.logger.error('Twitter crawl failed:', err);
    }

    return jobs;
  }

  private parseTweet(text: string, authorName: string): { company: string; role: string; location?: string; isRemote: boolean; url?: string } | null {
    const urlMatch = text.match(/(https?:\/\/[^\s,)]+)/);
    const isRemote = text.toLowerCase().includes('remote');
    const locationMatch = text.match(/\b(in|at|for)\s+([A-Z][A-Za-z\s]+?)(?:,\s*([A-Z]{2}))?(?:\s*[.!]|$)/);

    const rolePatterns = [
      /(?:hiring|looking for|seeking|hired)\s+(?:a|an|a\s+remote)?\s*([A-Za-z][A-Za-z\s\/]+?(?:Engineer|Designer|Developer|Manager|Lead|Architect|Scientist|Analyst|Coordinator|Specialist|Director|Head|VP|Intern))/i,
      /(?:hiring|looking for|seeking|hired)\s+(?:a|an|a\s+remote)?\s*([A-Za-z][A-Za-z\s\/]+?(?:role|position|gig))/i,
    ];
    let role: string | null = null;
    for (const pattern of rolePatterns) {
      const m = text.match(pattern);
      if (m) { role = m[1].trim(); break; }
    }

    const company = authorName;

    if (!role) return null;

    return { company: company.replace(/\b(Inc|LLC|Ltd|Corp)\.?$/i, '').trim(), role, isRemote, url: urlMatch?.[1] };
  }
}
