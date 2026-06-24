import { Injectable, Logger } from '@nestjs/common';

interface ParsedResume {
  isResume: boolean;
  name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    github: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills: string[];
  certifications: Array<{ name: string; issuer: string }>;
  languages: string[];
  links: Array<{ title: string; url: string }>;
  confidence: number;
}

const SECTION_HEADERS = [
  ['professional experience', 'experience', 'work experience', 'employment',
   'work history', 'professional background', 'relevant experience',
   'professional employment', 'career history', 'work', 'employment history',
   'professional experience', 'job experience', 'related experience'],
  ['education', 'academic background', 'academic history', 'academic training',
   'educational background', 'education and training', 'studies'],
  ['skills', 'technical skills', 'core competencies', 'key skills',
   'skills & abilities', 'skills and abilities', 'competencies',
   'technical proficiencies', 'areas of expertise', 'expertise',
   'professional skills', 'technical expertise', 'skill set', 'specialties',
   'qualifications', 'core qualifications'],
  ['certifications', 'certificates', 'professional certifications',
   'certifications and licenses', 'licenses', 'licenses and certifications',
   'professional development', 'training and certifications'],
  ['languages', 'language proficiency', 'language skills', 'linguistic skills'],
  ['professional summary', 'summary', 'profile', 'objective',
   'career objective', 'about me', 'personal summary', 'professional profile',
   'qualifications summary', 'summary of qualifications', 'career summary',
   'personal statement', 'professional background'],
  ['projects', 'personal projects', 'professional projects', 'key projects',
   'project experience', 'technical projects'],
  ['publications', 'research', 'research experience'],
  ['awards', 'honors', 'awards and honors', 'honours', 'achievements'],
  ['volunteer', 'volunteer experience', 'volunteer work', 'community service',
   'volunteering'],
  ['links', 'social', 'social links', 'online presence', 'contact links',
   'profiles'],
  ['references', 'additional information', 'other', 'activities',
   'leadership', 'leadership experience', 'professional affiliations',
   'affiliations', 'memberships'],
] as const;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE = /(https?:\/\/[^\s"]+)/gi;
const LINKEDIN_RE = /linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+/i;
const GITHUB_RE = /github\.com\/[a-zA-Z0-9_-]+/i;

const DEGREE_KEYWORDS = [
  'bachelor', 'master', 'phd', 'doctorate', 'associate', 'mba',
  'b\.s\.', 'b\.a\.', 'm\.s\.', 'm\.a\.', 'ph\.d\.',
  'b\.eng', 'm\.eng', 'bsc', 'msc', 'ba', 'ma', 'bs', 'ms', 'phd',
  'b\.tech', 'm\.tech', 'b\.com', 'm\.com', 'b\.ba', 'm\.ba',
  'bachelor of', 'master of', 'doctor of philosophy',
  'high school', 'diploma', 'certificate',
  'bachelors', 'masters', 'bachelor\'s', 'master\'s',
  'doctor', 'doctoral',
];

const TITLE_KEYWORDS = [
  'manager', 'engineer', 'developer', 'designer', 'analyst',
  'consultant', 'director', 'coordinator', 'specialist',
  'associate', 'intern', 'lead', 'head', 'chief', 'officer',
  'assistant', 'representative', 'technician', 'architect',
  'administrator', 'supervisor', 'president', 'vice president',
  'principal', 'senior', 'junior', 'freelance', 'contractor',
  'partner', 'owner', 'founder', 'co-founder', 'ceo', 'cto', 'cfo',
  'vp', 'svp', 'evp', 'director of', 'manager of',
  'software engineer', 'software developer', 'data scientist',
  'product manager', 'project manager', 'program manager',
  'scrum master', 'business analyst', 'quality assurance',
  'devops', 'sysadmin', 'administrator',
  'researcher', 'scientist', 'professor', 'teacher', 'instructor',
  'nurse', 'doctor', 'physician', 'surgeon', 'attorney', 'lawyer',
  'accountant', 'auditor', 'financial analyst', 'underwriter',
  'broker', 'agent', 'representative',
];

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  parse(rawText: string): ParsedResume {
    const lines = rawText.split('\n').map(l => l.trim());
    const nonEmpty = lines.filter(l => l.length > 0);

    const sections = this.extractSections(nonEmpty);
    const headerLines = this.getHeaderLines(sections);
    const headerText = headerLines.join(' ');
    const allHeaderText = nonEmpty.slice(0, Math.min(25, nonEmpty.length)).join(' ');

    const name = this.extractName(headerLines, nonEmpty);
    const contact = this.extractContact(nonEmpty);
    const summary = this.extractSectionText(sections, ['professional summary', 'summary', 'profile', 'objective', 'about me', 'personal summary', 'qualifications summary', 'summary of qualifications', 'career summary', 'personal statement', 'professional profile']);
    const experience = this.extractExperience(sections, nonEmpty);
    const education = this.extractEducation(sections);
    const skills = this.extractSkills(sections);
    const certifications = this.extractCertifications(sections);
    const languages = this.extractLanguages(sections);
    const links = this.extractLinks(contact, nonEmpty, sections);

    const hasResumeContent = !!(name || contact.email || contact.phone ||
      experience.length > 0 || education.length > 0 ||
      skills.length > 0 || summary.length > 10);

    const hasDates = /\b(19|20)\d{2}\b/.test(rawText);
    const hasJobIndicators = TITLE_KEYWORDS.some(k => new RegExp(`\\b${k.replace(/\./g, '\\.')}`, 'i').test(rawText));
    const hasSectionLabels = SECTION_HEADERS.flat().some(h => {
      const regex = new RegExp(`(?:^|\\n)\\s*${this.escapeRegex(h)}\\s*[:\\n]`, 'im');
      return regex.test(rawText);
    });

    const signals = [hasResumeContent, hasDates, hasJobIndicators, hasSectionLabels];
    const strongSignals = signals.filter(Boolean).length;
    const confidence = Math.round((strongSignals / signals.length) * 100);

    return {
      isResume: strongSignals >= 1,
      name,
      contact,
      summary,
      experience,
      education,
      skills,
      certifications,
      languages,
      links,
      confidence,
    };
  }

  private levenshtein(a: string, b: string): number {
    const alen = a.length;
    const blen = b.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;
    const matrix: number[][] = [];
    for (let i = 0; i <= alen; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= blen; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= alen; i++) {
      for (let j = 1; j <= blen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[alen][blen];
  }

  private fuzzyMatchKeyword(text: string, keyword: string, threshold: number): boolean {
    const clean = text.toLowerCase().trim();
    const kw = keyword.toLowerCase().trim();
    if (clean === kw) return true;
    if (clean.includes(kw)) return true;
    const words = clean.split(/[\s,;/]+/);
    for (const word of words) {
      if (word.length < 3) continue;
      if (Math.abs(word.length - kw.length) > threshold) continue;
      if (this.levenshtein(word, kw) <= threshold) return true;
    }
    return false;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractSections(lines: string[]): Map<string, string[]> {
    const sections = new Map<string, string[]>();
    let currentSection = '_header';
    const currentLines: string[] = [];

    for (const line of lines) {
      const header = this.matchSectionHeader(line);
      if (header) {
        if (currentLines.length > 0) {
          sections.set(currentSection, [...currentLines]);
        }
        currentSection = header;
        currentLines.length = 0;
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      sections.set(currentSection, [...currentLines]);
    }

    return sections;
  }

  private matchSectionHeader(line: string): string | null {
    const clean = line
      .replace(/[^a-zA-Z\s-/&]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    for (const group of SECTION_HEADERS) {
      for (const header of group as readonly string[]) {
        if (clean === header) return header;
        if (clean === header + 's') return header;
        if (clean.endsWith(':') && clean.slice(0, -1) === header) return header;
        if (clean.startsWith(header) && clean.length === header.length) return header;

        const threshold = header.length <= 5 ? 1 : header.length <= 8 ? 2 : 3;
        if (this.fuzzyMatchKeyword(clean, header, threshold)) return header;
      }
    }

    return null;
  }

  private getHeaderLines(sections: Map<string, string[]>): string[] {
    return sections.get('_header') || [];
  }

  private extractName(headerLines: string[], allLines: string[]): string {
    for (const candidate of [headerLines, allLines]) {
      if (candidate.length === 0) continue;
      const raw = candidate[0];
      const name = raw.replace(/[,;].*$/, '').trim();
      if (name.length > 0 && name.length < 80 &&
          !EMAIL_RE.test(name) && !PHONE_RE.test(name) && !URL_RE.test(name) &&
          !DEGREE_KEYWORDS.some(k => new RegExp(k.replace(/\./g, '\\.'), 'i').test(name))) {
        return name;
      }
    }
    return '';
  }

  private extractContact(lines: string[]): ParsedResume['contact'] {
    const contact: ParsedResume['contact'] = {
      email: '', phone: '', location: '', linkedin: '', website: '', github: '',
    };

    const headerText = lines.slice(0, 25).join(' ');

    const emailMatch = headerText.match(EMAIL_RE);
    if (emailMatch) contact.email = emailMatch[0];

    const phoneMatch = headerText.match(PHONE_RE);
    if (phoneMatch) contact.phone = phoneMatch[0].trim();

    const linkedinMatch = headerText.match(LINKEDIN_RE);
    if (linkedinMatch) contact.linkedin = `https://${linkedinMatch[0].toLowerCase()}`;

    const githubMatch = headerText.match(GITHUB_RE);
    if (githubMatch) contact.github = `https://${githubMatch[0].toLowerCase()}`;

    const urlMatches = headerText.matchAll(URL_RE);
    const foundUrls = new Set<string>();
    for (const m of urlMatches) {
      const url = m[0].toLowerCase();
      if (url.includes('linkedin')) {
        contact.linkedin = contact.linkedin || url;
      } else if (url.includes('github')) {
        contact.github = contact.github || url;
      } else if (!foundUrls.has(url)) {
        contact.website = contact.website || url;
      }
      foundUrls.add(url);
    }

    contact.location = this.extractLocation(lines);
    return contact;
  }

  private extractLocation(lines: string[]): string {
    const patterns = [
      /([A-Z][a-zA-Z]+(?:[\s,]+[A-Z][a-zA-Z'-]+)*)\s*,\s*([A-Z]{2})\b/,
      /([A-Z][a-zA-Z]+(?:[\s,]+[A-Z][a-zA-Z'-]+)*)\s*,\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\b/,
    ];

    for (const line of lines.slice(0, 10)) {
      for (const pattern of patterns) {
        const m = line.match(pattern);
        if (m && !EMAIL_RE.test(line) && !PHONE_RE.test(line)) {
          return m[0].trim();
        }
      }

      const locationLabel = line.match(/^(location|based|resides?|from):\s*(.+)$/i);
      if (locationLabel) return locationLabel[2].trim();

      if (/^[A-Z][a-zA-Z]+(?:[\s,]+[A-Z][a-zA-Z]+)*,\s*[A-Z]{2}\b/.test(line)) {
        return line.trim();
      }
    }

    for (const line of lines.slice(0, 10)) {
      if (/^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\b/.test(line)) return line.trim();
    }

    return '';
  }

  private extractSectionText(sections: Map<string, string[]>, possibleHeaders: string[]): string {
    for (const header of possibleHeaders) {
      const lines = sections.get(header);
      if (lines && lines.length > 0) {
        return lines.join(' ').trim();
      }
    }
    return '';
  }

  private extractExperience(sections: Map<string, string[]>, allLines: string[]): ParsedResume['experience'] {
    const expHeaders = SECTION_HEADERS[0] as readonly string[];
    let lines: string[] = [];
    for (const h of expHeaders) {
      const found = sections.get(h);
      if (found) { lines = found; break; }
    }

    if (lines.length === 0) {
      if (allLines.length > 20) {
        lines = allLines.slice(5);
      }
    }

    if (lines.length === 0) return [];

    return this.parseExperienceBlocks(lines);
  }

  private parseExperienceBlocks(lines: string[]): ParsedResume['experience'] {
    const blocks: ParsedResume['experience'] = [];
    let current: ParsedResume['experience'][number] | null = null;

    for (const line of lines) {
      if (this.looksLikeJobEntry(line)) {
        if (current) blocks.push(current);

        const { title, company } = this.splitTitleCompany(line);
        const dateRange = this.extractDateRange(line);

        current = {
          company,
          title,
          startDate: dateRange.start,
          endDate: dateRange.end,
          current: dateRange.current,
          bullets: [],
        };
        continue;
      }

      if (current) {
        const dateOnly = this.tryExtractDateLine(line);
        if (dateOnly && !this.looksLikeJobEntry(line) && line.length < 60) {
          current.startDate = current.startDate || dateOnly.start;
          current.endDate = current.endDate || dateOnly.end;
          current.current = current.current || dateOnly.current;
          continue;
        }
      }

      if (current && line.length > 0) {
        if (/^[-•*♦‣⁃◦‣]/.test(line) || /^\d+[.)]/.test(line)) {
          const bullet = line.replace(/^[-•*♦‣⁃◦‣\d.)\s]+/, '').trim();
          if (bullet) current.bullets.push(bullet);
        } else if (line.length > 10 && !/^\d{4}\s/.test(line)) {
          current.bullets.push(line);
        }
      }
    }

    if (current) blocks.push(current);
    return blocks;
  }

  private matchesTitleKeyword(line: string): boolean {
    const lower = line.toLowerCase();
    for (const kw of TITLE_KEYWORDS) {
      const escaped = kw.replace(/\./g, '\\.');
      if (new RegExp(`\\b${escaped}`, 'i').test(lower)) return true;
    }
    const words = lower.split(/\s+/);
    for (const word of words) {
      if (word.length < 4) continue;
      for (const kw of TITLE_KEYWORDS) {
        if (Math.abs(word.length - kw.length) > 2) continue;
        if (this.levenshtein(word, kw.toLowerCase()) <= 2) return true;
      }
    }
    return false;
  }

  private looksLikeJobEntry(line: string): boolean {
    if (line.length < 4 || line.length > 200) return false;
    if (/^(and|or|the|a|an|in|at|for|with|of|to)\b/i.test(line)) return false;
    if (/^[-•*♦‣⁃◦‣\d.)]/.test(line)) return false;
    if (DEGREE_KEYWORDS.some(k => new RegExp(`\\b${k.replace(/\./g, '\\.')}`, 'i').test(line)) && !this.matchesTitleKeyword(line)) {
      return false;
    }

    const hasDate = /\b(19|20)\d{2}\b/.test(line);
    const hasTitle = this.matchesTitleKeyword(line);
    const hasSeparator = /\s+(at|@|—|–|-|•|\||,)\s+/.test(line);

    if (hasTitle && hasDate) return true;
    if (hasSeparator && hasDate) return true;
    if (hasTitle && hasSeparator) return true;

    if (hasDate && /^[A-Z]/.test(line) && line.split(/\s+/).length >= 2) {
      return true;
    }

    return false;
  }

  private splitTitleCompany(line: string): { title: string; company: string } {
    const patterns = [
      { sep: /\s+•\s+/, before: true, after: true },
      { sep: /\s+\|\s+/, before: true, after: true },
      { sep: /\s+at\s+/i, before: true, after: true },
      { sep: /\s+@\s+/, before: true, after: true },
      { sep: /\s+[—–]\s+/, before: true, after: true },
      { sep: /\s+,\s+(?=inc|llc|ltd|corp|co|technologies|tech|solutions|group|associates|partners|consulting|services|systems|software|digital)/i, before: true, after: false },
    ];

    for (const { sep, before, after } of patterns) {
      const parts = line.split(sep);
      if (parts.length >= 2) {
        const datesRemoved = parts.map(p => p.replace(/\b(19|20)\d{2}\b(?:\s*[–—]\s*(?:(?:19|20)\d{2}|present|current|now|ongoing))?[^,]*/gi, '').trim());
        const first = datesRemoved[0].replace(/[,;]+$/, '').trim();
        const second = datesRemoved.slice(1).join(' ').replace(/[,;]+$/, '').trim();
        if (first && second) {
          return before && after ? { title: first, company: second }
            : before ? { title: first, company: second }
            : { title: second, company: first };
        }
      }
    }

    const dateMatch = line.match(/\b(19|20)\d{2}\b/);
    if (dateMatch) {
      const beforeDate = line.substring(0, dateMatch.index).trim().replace(/[,;/]+$/, '');
      return { title: beforeDate || line, company: '' };
    }

    return { title: line.replace(/[,;].*$/, '').trim(), company: '' };
  }

  private tryExtractDateLine(line: string): { start: string; end: string; current: boolean } | null {
    const datePattern = /\b(19|20)\d{2}\b/;
    if (!datePattern.test(line)) return null;
    if (line.length > 80) return null;
    return this.extractDateRange(line);
  }

  private extractDateRange(text: string): { start: string; end: string; current: boolean } {
    const current = /\b(present|current|now|ongoing)\b/i.test(text);

    const monthNames = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
    const datePattern = new RegExp(`(?:(${monthNames})\\s*[.\\s]*)?(\\d{4})\\b`, 'gi');
    const rangePattern = /(?:from|between)?\s*(.+?)\s*(?:to|–|—|-|until|–)\s*(.+?)(?:\s|$)/i;

    const rangeMatch = text.match(rangePattern);
    if (rangeMatch) {
      const startText = rangeMatch[1];
      const endText = rangeMatch[2];
      const startDates = this.extractDatesFromText(startText);
      const endDates = this.extractDatesFromText(endText);
      return {
        start: startDates[0] || '',
        end: current ? '' : (endDates[0] || ''),
        current: current || /\b(present|current|now)\b/i.test(endText),
      };
    }

    const dates = this.extractDatesFromText(text);
    if (dates.length >= 2) {
      return { start: dates[0], end: current ? '' : dates[dates.length - 1], current };
    }
    if (dates.length === 1) {
      return { start: dates[0], end: '', current };
    }

    return { start: '', end: '', current };
  }

  private extractDatesFromText(text: string): string[] {
    const monthNames = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
    const fullDate = new RegExp(`(${monthNames})\\s*[.\\s]*(\\d{4})`, 'gi');
    const yearOnly = /\b(19|20)\d{2}\b/g;

    const result: string[] = [];
    const fullMatches = [...text.matchAll(fullDate)];
    for (const m of fullMatches) {
      const month = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase().replace(/\.$/, '');
      result.push(`${month} ${m[2]}`);
    }

    if (result.length === 0) {
      const yearMatches = [...text.matchAll(yearOnly)];
      for (const m of yearMatches) result.push(m[0]);
    }

    return result;
  }

  private extractEducation(sections: Map<string, string[]>): ParsedResume['education'] {
    const eduHeaders = SECTION_HEADERS[1] as readonly string[];
    let lines: string[] = [];
    for (const h of eduHeaders) {
      const found = sections.get(h);
      if (found) { lines = found; break; }
    }

    if (lines.length === 0) return [];

    const education: ParsedResume['education'] = [];
    let current: ParsedResume['education'][number] | null = null;

    for (const line of lines) {
      const inst = this.matchInstitution(line);
      if (inst) {
        if (current) education.push(current);
        const parsed = this.parseEducationLine(line);
        current = parsed;
        continue;
      }

      const deg = this.matchDegree(line);
      if (deg && current) {
        current.degree = deg;
        const degRegex = new RegExp(deg.replace(/\./g, '\\.'), 'i');
        if (!degRegex.test(line)) {
          const fuzzyMatch = line.match(new RegExp(`.{0,3}${deg[0]}.{0,${deg.length + 1}}`, 'i'));
          if (fuzzyMatch) {
            const rest = line.replace(fuzzyMatch[0], '').replace(/[,;].*$/, '').trim();
            if (rest && !/^\d/.test(rest)) current.field = rest;
          }
        } else {
          const rest = line.replace(degRegex, '').replace(/[,;].*$/, '').trim();
          if (rest && !/^\d/.test(rest)) current.field = rest;
        }
        continue;
      }

      const years = line.match(/\b(19|20)\d{2}\b/g);
      if (years && current) {
        if (years.length >= 2) {
          current.startDate = years[0];
          current.endDate = years[1];
        } else if (!current.startDate) {
          current.startDate = years[0];
        } else {
          current.endDate = years[0];
        }
        continue;
      }

      const gpaMatch = line.match(/\b(GPA|grade|g\.p\.a)[:\s]*(\d+\.?\d*)/i);
      if (gpaMatch && current) {
        current.gpa = gpaMatch[2];
      }
    }

    if (current) education.push(current);
    return education;
  }

  private matchInstitution(line: string): string | null {
    if (line.length < 5 || /^[-•*♦\d.)]/.test(line)) return null;

    const indicators = /\b(University|College|Institute|School|Academy|Institute of Technology|Polytechnic|Conservatory|Académie)\b/i;
    const match = line.match(indicators);
    if (match) {
      const idx = match.index!;
      const fullName = line.substring(0, idx + match[0].length + 20).replace(/[,;–—|].*$/, '').trim();
      const sentinel = line.indexOf(',', idx);
      if (sentinel > 0 && sentinel - idx < 30) {
        return line.substring(0, sentinel).trim();
      }
      return fullName || line.substring(0, idx + match[0].length).trim();
    }

    const commonPrefixes = ['university of', 'university at', 'state university of', 'institute of'];
    const lower = line.toLowerCase();
    for (const prefix of commonPrefixes) {
      if (lower.startsWith(prefix)) {
        const end = line.indexOf(',');
        return end > 0 ? line.substring(0, end).trim() : line.trim();
      }
    }

    return null;
  }

  private parseEducationLine(line: string): ParsedResume['education'][number] {
    const result: ParsedResume['education'][number] = { institution: '', degree: '', field: '' };
    const inst = this.matchInstitution(line);
    if (inst) result.institution = inst;

    const deg = this.matchDegree(line);
    if (deg) result.degree = deg;

    if (inst && deg) {
      let remainder = line.replace(inst, '');
      const degRegex = new RegExp(deg.replace(/\./g, '\\.'), 'i');
      if (!degRegex.test(remainder)) {
        const fuzzyMatch = remainder.match(new RegExp(`.{0,3}${deg[0]}.{0,${deg.length + 1}}`, 'i'));
        if (fuzzyMatch) remainder = remainder.replace(fuzzyMatch[0], '');
      } else {
        remainder = remainder.replace(degRegex, '');
      }
      const parts = remainder.replace(/[,;–—|].*$/, '').trim();
      if (parts && !/^\d/.test(parts) && !this.matchInstitution(parts)) {
        result.field = parts;
      }
    }

    return result;
  }

  private matchDegree(line: string): string | null {
    const lower = line.toLowerCase();
    for (const deg of DEGREE_KEYWORDS) {
      const regex = new RegExp(`\\b${deg.replace(/\./g, '\\.')}\\b`, 'i');
      if (regex.test(line)) {
        const match = line.match(regex);
        if (match) return match[0];
      }
    }
    const words = lower.split(/[\s,;]+/);
    for (const word of words) {
      if (word.length < 4) continue;
      for (const deg of DEGREE_KEYWORDS) {
        const dk = deg.toLowerCase();
        if (Math.abs(word.length - dk.length) > 2) continue;
        if (this.levenshtein(word, dk) <= 2) return deg;
      }
    }
    return null;
  }

  private extractSkills(sections: Map<string, string[]>): string[] {
    const skillHeaders = SECTION_HEADERS[2] as readonly string[];
    let lines: string[] = [];
    for (const h of skillHeaders) {
      const found = sections.get(h);
      if (found) { lines = found; break; }
    }

    if (lines.length === 0) return [];

    const allText = lines.join(' ');
    const separators = /[,•·|;/\n]+/;
    const skillList = allText
      .split(separators)
      .map(s => s.replace(/\(.*?\)/g, '').trim())
      .filter(s => s.length > 1 && s.length < 60)
      .filter(s => !SECTION_HEADERS.flat().some(h => this.fuzzyMatch(s, h)));

    if (skillList.length >= 2) return [...new Set(skillList)];

    const byLine = lines
      .map(l => l.replace(/^[-•*♦\d.)\s]+/, '').trim())
      .filter(l => l.length > 0 && l.length < 60);

    if (byLine.length >= 2) return [...new Set(byLine)];

    return [...new Set(skillList)];
  }

  private fuzzyMatch(a: string, b: string): boolean {
    return a.toLowerCase().trim() === b.toLowerCase().trim();
  }

  private extractCertifications(sections: Map<string, string[]>): ParsedResume['certifications'] {
    const certHeaders = SECTION_HEADERS[3] as readonly string[];
    let lines: string[] = [];
    for (const h of certHeaders) {
      const found = sections.get(h);
      if (found) { lines = found; break; }
    }

    if (lines.length === 0) return [];

    return lines.map((line) => {
      const text = line.replace(/^[-•*♦\d.)\s]+/, '').trim();
      if (!text) return { name: '', issuer: '' };

      const issuers = ['issued by', 'certified by', 'through', '|', '•', '·', '—', '–', '-'];
      for (const sep of issuers) {
        const idx = text.indexOf(sep);
        if (idx > 0) {
          const name = text.substring(0, idx).trim();
          const issuer = text.substring(idx + sep.length).replace(/\b\d{4}\b.*$/, '').trim();
          if (name) return { name, issuer };
        }
      }

      return { name: text, issuer: '' };
    }).filter(c => c.name.length > 0);
  }

  private extractLanguages(sections: Map<string, string[]>): string[] {
    const langHeaders = SECTION_HEADERS[4] as readonly string[];
    let lines: string[] = [];
    for (const h of langHeaders) {
      const found = sections.get(h);
      if (found) { lines = found; break; }
    }

    if (lines.length === 0) return [];

    const allText = lines.join(', ');
    return allText
      .split(/[,•·|;/\n]+/)
      .map(s => s.replace(/\(.*?\)/g, '').replace(/[-–].*$/, '').trim())
      .filter(s => s.length > 1 && s.length < 40)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .filter(s => !/^\d+(\.\d+)?$/.test(s));
  }

  private extractLinks(
    contact: ParsedResume['contact'],
    allLines: string[],
    sections: Map<string, string[]>,
  ): Array<{ title: string; url: string }> {
    const links: Array<{ title: string; url: string }> = [];

    if (contact.linkedin) links.push({ title: 'LinkedIn', url: contact.linkedin });
    if (contact.github) links.push({ title: 'GitHub', url: contact.github });
    if (contact.website) links.push({ title: 'Website', url: contact.website });

    const linkHeaders = SECTION_HEADERS[10] as readonly string[];
    for (const h of linkHeaders) {
      const lines = sections.get(h);
      if (lines) {
        for (const line of lines) {
          const urls = [...line.matchAll(URL_RE)];
          for (const m of urls) {
            const url = m[0].toLowerCase();
            if (!links.some(l => l.url.toLowerCase() === url)) {
              const label = line.replace(url, '').replace(/^[-•*♦\d.)\s]+/, '').replace(/[:,;]\s*$/, '').trim();
              links.push({ title: label || url, url: m[0] });
            }
          }
        }
      }
    }

    const headerText = allLines.slice(0, 15).join(' ');
    const extraUrls = [...headerText.matchAll(URL_RE)];
    for (const m of extraUrls) {
      const url = m[0].toLowerCase();
      if (!links.some(l => l.url.toLowerCase() === url)) {
        let label = '';
        if (url.includes('linkedin')) label = 'LinkedIn';
        else if (url.includes('github')) label = 'GitHub';
        else if (url.includes('portfolio')) label = 'Portfolio';
        else label = url;
        links.push({ title: label, url: m[0] });
      }
    }

    return links;
  }
}
