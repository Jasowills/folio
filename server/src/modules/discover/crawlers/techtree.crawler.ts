import { Injectable } from '@nestjs/common';
import { BaseCrawler, RawJob } from './base.crawler';

interface CardData {
  uuid: string;
  title: string;
  company: string;
  logoUrl: string | null;
  location: string | null;
  skills: string[];
  salary: string | null;
}

@Injectable()
export class TechTreeCrawler extends BaseCrawler {
  source = 'techtree';

  async crawl(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    try {
      const response = await fetch('https://jobs.techtree.dev/', {
        headers: { 'User-Agent': 'Folio/1.0' },
      });
      if (!response.ok) return jobs;
      const html = await response.text();

      const cards = this.parseCards(html);
      for (const card of cards) {
        if (!card.uuid || !card.title) continue;

        const descParts: string[] = [];
        if (card.skills.length > 0) {
          descParts.push(`Skills: ${card.skills.join(', ')}`);
        }
        if (card.salary) {
          descParts.push(`Salary: ${card.salary}`);
        }
        if (card.location) {
          descParts.push(`Location: ${card.location}`);
        }

        const isRemote = (card.location || '').toLowerCase().includes('remote');

        jobs.push({
          source: 'techtree',
          sourceId: `techtree-${card.uuid}`,
          roleTitle: card.title,
          companyName: card.company || 'TechTree',
          location: card.location,
          isRemote,
          postedAt: new Date(),
          descriptionRaw: descParts.length > 0 ? descParts.join('. ') + '.' : '',
          applicationUrl: `https://jobs.techtree.dev/job/${card.uuid}`,
          isVerified: false,
        });
      }
    } catch (err) {
      throw err;
    }
    return jobs;
  }

  private parseCards(html: string): CardData[] {
    const cards: CardData[] = [];
    const cardRegex = /<a\s+href="\/job\/([a-f0-9-]+)"[^>]*class="group block rounded-xl[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null) {
      const uuid = match[1];
      const inner = match[2];

      const title = this.extract(inner, /<h3[^>]*>([\s\S]*?)<\/h3>/);

      const company = this.extract(inner, /<p[^>]*class="mt-1 flex items-center[^"]*"[^>]*>([\s\S]*?)<\/p>/);

      const logoSrc = this.extract(inner, /<img[^>]*src="([^"]*)"[^>]*alt="[^"]*"[^>]*\/>/);

      let location: string | null = null;
      const locMatch = /<span[^>]*class="min-w-0 truncate text-foreground"[^>]*>([\s\S]*?)<\/span>/.exec(inner);
      if (locMatch) {
        location = locMatch[1].trim();
      }

      const skills: string[] = [];
      const skillRegex = /<span[^>]*data-skill="true"[^>]*>([\s\S]*?)<\/span>/gi;
      let skillMatch: RegExpExecArray | null;
      while ((skillMatch = skillRegex.exec(inner)) !== null) {
        skills.push(skillMatch[1].trim());
      }

      let salary: string | null = null;
      const salMatch = /<span[^>]*class="text-base font-bold text-foreground[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(inner);
      if (salMatch) {
        salary = salMatch[1].trim();
      }

      if (uuid && title) {
        cards.push({
          uuid,
          title: this.decodeEntities(title),
          company: this.decodeEntities(company || 'TechTree'),
          logoUrl: logoSrc || null,
          location: location ? this.decodeEntities(location) : null,
          skills: skills.map((s) => this.decodeEntities(s)),
          salary: salary ? this.decodeEntities(salary) : null,
        });
      }
    }

    return cards;
  }

  private extract(text: string, regex: RegExp): string | null {
    const m = regex.exec(text);
    return m ? m[1].trim() : null;
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  }
}
