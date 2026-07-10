import { Injectable, Logger } from '@nestjs/common';
import { SKILL_DICTIONARY, LANGUAGE_DICTIONARY, PROFICIENCY_MAP, SECTION_PATTERNS, ALL_SECTION_HEADERS } from './resume-parser.constants';
import { parseDateRange, normalizeToISO } from './resume-parser.dates';

interface ParsedContact {
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  github: string | null;
}

interface ParsedExperience {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  bullets: string[];
}

interface ParsedEducation {
  institution: string;
  degree: string;
  field: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
}

interface ParsedCertification {
  name: string;
  issuer: string | null;
  date?: string | null;
}

interface ParsedLanguage {
  language: string;
  proficiency: string | null;
}

interface ParsedLinks {
  title: string;
  url: string;
}

interface SectionMap {
  sections: Map<string, string>;
  detectedOrder: string[];
  unrecognized: string[];
  confidence: number;
}

interface QualityAssessment {
  score: number;
  issues: string[];
  requiresFallback: boolean;
  isLikelyScanned: boolean;
}

export interface ParsedResume {
  isResume: boolean;
  name: string | null;
  contact: ParsedContact;
  summary: string | null;
  experience: ParsedExperience[];
  education: ParsedEducation[];
  skills: string[];
  certifications: ParsedCertification[];
  languages: ParsedLanguage[];
  links: ParsedLinks[];
  confidence: number;
  warnings: string[];
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE = /(https?:\/\/[^\s"<>]+)/gi;
const LINKEDIN_RE = /linkedin\.com\/(?:in|pub|company)\/[a-zA-Z0-9_-]+/i;
const GITHUB_RE = /github\.com\/[a-zA-Z0-9_-]+/i;
const BARE_DOMAIN_RE = /(?:^|\s)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:vercel\.app|netlify\.app|github\.io|pages\.dev|herokuapp\.com|onrender\.com|fly\.dev|replit\.app|glitch\.me|railway\.app|cyclic\.app|koyeb\.app|uwu\.ai|render\.com|adaptable\.app|wordpress\.com|blogspot\.com|wixsite\.com|squarespace\.com|web\.app))\b/gi;
const BARE_GITHUB_RE = /(?:^|\s)(github\.com\/[a-zA-Z0-9_-]+)(?:\s|$)/gi;

const TITLE_KEYWORDS = [
  'engineer', 'manager', 'designer', 'director', 'lead', 'senior',
  'junior', 'head', 'vp', 'vice president', 'analyst', 'developer',
  'consultant', 'specialist', 'coordinator', 'executive', 'officer',
  'associate', 'architect', 'principal', 'product', 'software',
  'data', 'ux', 'ui', 'marketing', 'sales', 'operations', 'finance',
  'legal', 'hr', 'research', 'intern', 'founder', 'co-founder',
  'owner', 'partner', 'freelance', 'contractor', 'ceo', 'cto', 'cfo',
  'scrum master', 'devops', 'sre', 'solutions', 'technical',
  'full stack', 'fullstack', 'frontend', 'front-end', 'backend',
  'back-end', 'qa', 'quality assurance', 'sysadmin', 'administrator',
  'scientist', 'professor', 'lecturer', 'instructor', 'teacher',
  'nurse', 'doctor', 'physician', 'attorney', 'lawyer', 'accountant',
  'auditor', 'broker', 'agent',
];

const COMPANY_SUFFIXES = [
  'ltd', 'limited', 'llc', 'inc', 'plc', 'gmbh', 'ag', 'corp',
  'corporation', 'group', 'technologies', 'tech', 'solutions',
  'services', 'consulting', 'digital', 'labs', 'studio', 'agency',
  'partners', 'ventures', 'capital', 'health', 'media', 'systems',
  'software', 'industries', 'global', 'international', 'holdings',
  'network', 'associates', 'enterprises', 'llp', 'pvt',
];

const LOCATION_BLOCKLIST = new Set([
  'rust', 'solana', 'solidity', 'node', 'react', 'angular', 'vue',
  'python', 'java', 'ruby', 'go', 'c++', 'c#', 'typescript',
  'javascript', 'html', 'css', 'sql', 'docker', 'kubernetes',
  'aws', 'azure', 'gcp', 'linux', 'git',
]);

const KNOWN_COMPOUND_WORDS = new Set([
  'javascript', 'typescript', 'webgl', 'webrtc', 'webassembly',
  'websocket', 'webpack', 'graphql', 'devops', 'devsecops',
  'github', 'gitlab', 'gitbook', 'gitops', 'macos', 'ios',
  'openapi', 'openid', 'openssl', 'opencv', 'postgresql', 'mysql',
  'mongodb', 'sqlite', 'cloudfront', 'cloudwatch', 'cloudformation',
  'cloudflare', 'codepipeline', 'codebuild', 'codecommit',
  'nextjs', 'nestjs', 'fastapi', 'springboot',
]);

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  assessQuality(text: string, pageCount: number): QualityAssessment {
    let score = 1.0;
    const issues: string[] = [];

    const charsPerPage = text.length / Math.max(pageCount, 1);
    if (charsPerPage < 150) {
      score -= 0.4;
      issues.push('low-text-density');
    } else if (charsPerPage < 300) {
      score -= 0.1;
      issues.push('below-average-text-density');
    }

    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    const nonAsciiPct = nonAsciiCount / Math.max(text.length, 1);
    if (nonAsciiPct > 0.08) {
      score -= 0.3;
      issues.push('high-non-ascii');
    } else if (nonAsciiPct > 0.03) {
      score -= 0.1;
      issues.push('moderate-non-ascii');
    }

    const repeatRuns = text.match(/(.)\1{6,}/g);
    if (repeatRuns && repeatRuns.length > 3) {
      score -= 0.2;
      issues.push('repetition-artifacts');
    }

    const hasEmail = EMAIL_RE.test(text);
    const hasDate = /\b(19|20)\d{2}\b/.test(text);
    const newlinesPer100 = (text.match(/\n/g) || []).length / Math.max(text.length / 100, 1);
    const hasStructure = newlinesPer100 >= 2;

    if (!hasEmail) { score -= 0.1; issues.push('missing-email'); }
    if (!hasDate) { score -= 0.1; issues.push('missing-date'); }
    if (!hasStructure) { score -= 0.1; issues.push('no-line-structure'); }

    const alphaNumRatio = (text.match(/[a-zA-Z0-9]/g) || []).length / Math.max(text.length, 1);

    const result = {
      score: Math.max(0, score),
      issues,
      requiresFallback: score < 0.6,
      isLikelyScanned: score < 0.4 && alphaNumRatio < 0.3,
    };
    this.logger.log(`assessQuality: score=${result.score}, issues=[${issues.join(', ')}], requiresFallback=${result.requiresFallback}, isLikelyScanned=${result.isLikelyScanned}, charsPerPage=${charsPerPage.toFixed(1)}, nonAsciiPct=${(nonAsciiPct * 100).toFixed(1)}%`);
    return result;
  }

  private normalizeSpacedCaps(lines: string[]): string[] {
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Only process lines with no lowercase letters
      if (/[a-z]/.test(trimmed)) return line;

      // Check if the line consists mostly of single uppercase letters separated by spaces
      // e.g. "P R O F E S S I O N A L   S U M M A R Y" or "T E C H N I C A L   S K I L L S"
      const tokens = trimmed.split(/\s+/);
      const singleLetterTokens = tokens.filter((t) => /^[A-Z]$/.test(t)).length;

      // At least 90% of tokens must be single letters, and at least 3 such tokens
      if (singleLetterTokens < tokens.length * 0.9) return line;
      if (singleLetterTokens < 3) return line;

      // Remove single inter-letter spaces, collapse multiple spaces
      return trimmed
        .replace(/([A-Z]) (?=[A-Z])/g, '$1')
        .replace(/\s+/g, ' ');
    });
  }

  detectSections(text: string): SectionMap {
    const rawLines = text.split('\n');
    const mergedLines = this.mergeWrappedLines(rawLines);
    let lines = mergedLines.map(l => l.trim());

    lines = this.normalizeSpacedCaps(lines);

    const headings: Array<{ index: number; line: string; section: string | null }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      const prevLine = i > 0 ? lines[i - 1] : '';
      const prevIsBlank = !prevLine || prevLine.trim().length === 0;

      const matched = this.matchSectionHeader(trimmed);
      const matchedExact = this.matchSectionHeader(trimmed, true);

      if (!this.isHeadingCandidate(trimmed, i === 0, prevIsBlank) && !matchedExact) continue;

      const isAllUpper = trimmed.length > 4 && trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed);
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const nextIsBlank = !nextLine || nextLine.trim().length === 0;

      if (matched || isAllUpper || (nextIsBlank && trimmed.length < 35)) {
        headings.push({ index: i, line: trimmed, section: matched });
      }
    }

    const sections = new Map<string, string>();
    const detectedOrder: string[] = [];
    const unrecognized: string[] = [];

    let currentSection = 'header';
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const heading = headings.find(h => h.index === i);

      if (heading) {
        if (currentContent.length > 0) {
          const existing = sections.get(currentSection) || '';
          sections.set(currentSection, existing + currentContent.join('\n'));
        }

        currentSection = heading.section || `unrecognized_${heading.line.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        if (!detectedOrder.includes(currentSection)) {
          detectedOrder.push(currentSection);
        }

        if (!heading.section) {
          unrecognized.push(heading.line);
        }

        currentContent = [];
      } else {
        currentContent.push(lines[i]);
      }
    }

    if (currentContent.length > 0) {
      const existing = sections.get(currentSection) || '';
      sections.set(currentSection, existing + currentContent.join('\n'));
    }

    const expectedSections = ['experience', 'education', 'skills', 'summary'];
    let foundCount = 0;
    for (const es of expectedSections) {
      if (sections.has(es) && (sections.get(es) || '').trim().length > 0) foundCount++;
    }
    let confidence = 0.0;
    if (foundCount >= 2) confidence = 0.8 + Math.min((foundCount - 2) * 0.05, 0.2);
    if (sections.has('header') && (sections.get('header') || '').trim().length > 3) confidence = Math.max(confidence, 0.3);

    this.logger.log(`detectSections: foundCount=${foundCount}, confidence=${confidence}, sections=${[...sections.keys()].join(', ')}, detectedOrder=[${detectedOrder.join(', ')}], unrecognized=[${unrecognized.join(', ')}]`);
    return { sections, detectedOrder, unrecognized, confidence };
  }

  private mergeWrappedLines(lines: string[]): string[] {
    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];
      const next = lines[i + 1];
      if (next && /^[a-z]/.test(next.trim()) && current.length > 30 && !current.match(/[.!?:]$/) && next.trim().length > 10) {
        result.push(current + ' ' + next.trim());
        i++;
      } else {
        result.push(current);
      }
    }
    return result;
  }

  private isHeadingCandidate(line: string, isFirstLine: boolean, precededByBlank: boolean): boolean {
    if (!isFirstLine && !precededByBlank) return false;
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 45) return false;
    if (trimmed.includes('@')) return false;
    if (/http|www/i.test(trimmed)) return false;
    if (/\b\d{4}\b/.test(trimmed) && /present|current|to|–|—|-/i.test(trimmed)) return false;
    if (/^[-•*♦‣⁃◦‣\d.)]/.test(trimmed)) return false;
    return true;
  }

  private matchSectionHeader(line: string, exactOnly = false): string | null {
    const clean = line
      .toLowerCase()
      .replace(/[^a-z0-9\s/&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    for (const [section, patterns] of Object.entries(SECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (clean === pattern) return section;
        if (clean === pattern + 's') return section;
        if (clean.endsWith(':') && clean.slice(0, -1).trim() === pattern) return section;
        if (!exactOnly && this.fuzzyMatch(clean, pattern, 2)) return section;
      }
    }

    // Fallback: check if space-stripped clean text contains any section pattern
    // Handles spaced-caps that normalised to e.g. "professionalsummary"
    if (!exactOnly) {
      const compact = clean.replace(/\s+/g, '');
      for (const [section, patterns] of Object.entries(SECTION_PATTERNS)) {
        for (const pattern of patterns) {
          const patternCompact = pattern.replace(/\s+/g, '');
          if (patternCompact.length >= 4 && compact.includes(patternCompact)) return section;
        }
      }
    }

    return null;
  }

  private fuzzyMatch(text: string, keyword: string, threshold: number): boolean {
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

  async parse(rawText: string): Promise<ParsedResume> {
    this.logger.log(`parse: input length=${rawText.length}, preview="${rawText.slice(0, 120).replace(/\n/g, '\\n')}"`);

    const sectionMap = this.detectSections(rawText);
    const { sections } = sectionMap;
    this.logger.log(`parse: sections detected=${sections.size}, order=[${sectionMap.detectedOrder.join(', ')}], confidence=${sectionMap.confidence}, unrecognized=[${sectionMap.unrecognized.join(', ')}]`);

    const headerSection = sections.get('header') || rawText.split('\n').slice(0, 15).join('\n');

    const [contactResult, summaryResult, experienceResult, educationResult, skillsResult, certsResult, langsResult] = await Promise.all([
      Promise.resolve(this.parseContact(headerSection)),
      Promise.resolve(this.parseSummary(sections)),
      Promise.resolve(this.parseExperience(sections)),
      Promise.resolve(this.parseEducation(sections)),
      Promise.resolve(this.parseSkills(sections)),
      Promise.resolve(this.parseCertifications(sections)),
      Promise.resolve(this.parseLanguages(sections)),
    ]);
    // Fallback: if email not found in header, search full text
    if (!contactResult.email) {
      const fullEmailMatch = rawText.match(EMAIL_RE);
      if (fullEmailMatch) {
        contactResult.email = fullEmailMatch[0].toLowerCase();
        this.logger.log(`parse: email fallback from full text — "${contactResult.email}"`);
      }
    }
    // Fallback: if phone not found in header, search full text
    if (!contactResult.phone) {
      const fullPhoneMatch = rawText.match(PHONE_RE);
      if (fullPhoneMatch) {
        contactResult.phone = fullPhoneMatch[0].trim();
        this.logger.log(`parse: phone fallback from full text — "${contactResult.phone}"`);
      }
    }

    this.logger.log(`parse: contact name="${contactResult.name}", email=${contactResult.email}, phone=${contactResult.phone}, linkedin=${contactResult.linkedin}, github=${contactResult.github}, website=${contactResult.website}, location=${contactResult.location}`);
    this.logger.log(`parse: summary length=${summaryResult?.length || 0}, experience=${experienceResult.length} entries, education=${educationResult.length} entries, skills=${skillsResult.length} raw items, certifications=${certsResult.length}, languages=${langsResult.length}`);

    const links = this.buildLinks(contactResult, rawText, sections);
    this.logger.log(`parse: links built=${links.length}`);

    const warnings: string[] = [];
    if (sectionMap.confidence < 0.5) warnings.push('low-section-detection-confidence');
    if (sectionMap.unrecognized.length > 0) warnings.push(`unrecognized-sections: ${sectionMap.unrecognized.join(', ')}`);

    const experienceClean = this.cleanupExperience(experienceResult);
    const educationClean = this.cleanupEducation(educationResult);
    const skillsClean = this.deduplicateSkills(skillsResult);
    this.logger.log(`parse: after cleanup — experience=${experienceClean.length}, education=${educationClean.length}, skills=${skillsClean.length}`);

    const overallConfidence = this.calculateOverallConfidence(
      contactResult.name,
      contactResult.email,
      experienceClean,
      educationClean,
      skillsClean,
    );
    this.logger.log(`parse: done — isResume=${sectionMap.confidence >= 0.3 || overallConfidence >= 0.3}, confidence=${overallConfidence}, warnings=[${warnings.join(', ')}]`);

    return {
      isResume: sectionMap.confidence >= 0.3 || overallConfidence >= 0.3,
      name: contactResult.name,
      contact: {
        email: contactResult.email,
        phone: contactResult.phone,
        location: contactResult.location,
        linkedin: contactResult.linkedin,
        website: contactResult.website,
        github: contactResult.github,
      },
      summary: summaryResult,
      experience: experienceClean,
      education: educationClean,
      skills: skillsClean,
      certifications: certsResult,
      languages: langsResult,
      links,
      confidence: overallConfidence,
      warnings,
    };
  }

  parseContact(headerText: string): {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    website: string | null;
    github: string | null;
  } {
    const lines = headerText.split('\n').map(l => l.trim()).filter(Boolean);
    const headerJoined = lines.join(' ');
    // Also join without spaces so split email addresses get reconstructed
    const headerJoinedFlat = lines.join('');

    const email = this.parseEmail(headerJoined, headerJoinedFlat);
    const phone = this.parsePhone(headerJoined);
    const linkedin = this.parseLinkedin(headerJoined);
    const github = this.parseGithub(headerJoined);
    const website = this.parseWebsite(headerJoined, linkedin, github);
    const location = this.parseLocation(lines);
    const name = this.parseName(lines, email, phone);

    return { name, email, phone, location, linkedin, website, github };
  }

  private parseName(lines: string[], email: string | null, phone: string | null): string | null {
    const firstLine = lines[0];
    if (!firstLine) return null;

    let name = firstLine.replace(/[,;].*$/, '').trim();
    if (name.length < 3 || name.length > 60) return null;

    let wordCount = name.split(/\s+/).length;

    // CamelCase/PascalCase recovery: if PDF extraction merged words like "AmadiJason",
    // split on uppercase boundaries and check if that produces a valid name
    if (wordCount === 1) {
      const split = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
      const splitCount = split.split(/\s+/).length;
      if (splitCount >= 2 && splitCount <= 5) {
        name = split;
        wordCount = splitCount;
      }
    }

    if (wordCount < 2 || wordCount > 5) return null;

    if (name.includes('@') || /http/i.test(name) || /\d/.test(name)) return null;
    if (phone && PHONE_RE.test(name)) return null;
    if (EMAIL_RE.test(name)) return null;
    if (/\b(19|20)\d{2}\b/.test(name)) return null;
    if (ALL_SECTION_HEADERS.some(h => name.toLowerCase().includes(h))) return null;

    const hasTitleCase = name.split(/\s+/).every(w => /^[A-Z]/.test(w));
    const isAllUpper = name === name.toUpperCase() && name.length > 3;
    if (!hasTitleCase && !isAllUpper) return null;

    return name;
  }

  private parseEmail(joinedText: string, flatText?: string): string | null {
    const joinedAddrs = [...joinedText.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase()).filter(Boolean);
    const flatAddrs = flatText ? [...flatText.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase()).filter(Boolean) : [];

    // Prefer a letter-starting email from the space-joined text (clean extraction)
    for (const addr of joinedAddrs) {
      if (/^[a-zA-Z]/.test(addr)) return addr;
    }

    // Fall back to flat text (reconstructs emails split across lines)
    for (const addr of flatAddrs) {
      if (/^[a-zA-Z]/.test(addr)) return addr;
    }

    // Last resort: any match
    return joinedAddrs[0] || flatAddrs[0] || null;
  }

  private parsePhone(text: string): string | null {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      const match = text.match(PHONE_RE);
      if (match) return match[0].trim();
    }
    return null;
  }

  private parseLinkedin(text: string): string | null {
    const match = text.match(LINKEDIN_RE);
    if (match) return `https://${match[0].toLowerCase()}`;
    const usernameMatch = text.match(/\blinkedin\s*[:/]\s*([a-zA-Z0-9_-]{3,50})\b/i);
    if (usernameMatch) return `https://linkedin.com/in/${usernameMatch[1].toLowerCase()}`;
    return null;
  }

  private parseGithub(text: string): string | null {
    const match = text.match(GITHUB_RE);
    if (match) return `https://${match[0].toLowerCase()}`;
    const bareMatch = text.match(BARE_GITHUB_RE);
    if (bareMatch) return `https://${bareMatch[1].toLowerCase()}`;
    return null;
  }

  private parseWebsite(text: string, linkedin: string | null, github: string | null): string | null {
    const urls = [...text.matchAll(URL_RE)];
    const excluded = new Set<string>();
    if (linkedin) excluded.add(linkedin.toLowerCase());
    if (github) excluded.add(github.toLowerCase());

    for (const m of urls) {
      const url = m[0].toLowerCase();
      if (!excluded.has(url) && !url.includes('linkedin') && !url.includes('github')) {
        return m[0];
      }
    }

    const bareDomains = [...text.matchAll(BARE_DOMAIN_RE)];
    if (bareDomains.length > 0) {
      return `https://${bareDomains[0][1].toLowerCase()}`;
    }

    return null;
  }

  private parseLocation(lines: string[]): string | null {
    for (const line of lines.slice(0, 10)) {
      if (/^remote$/i.test(line.trim())) return 'Remote';
      if (/^hybrid$/i.test(line.trim())) return 'Hybrid';

      const match = line.match(/([A-Z][a-zA-Z'-]+(?:[\s,]+[A-Z][a-zA-Z'-]+)*)\s*,\s*([A-Z]{2})\b/);
      if (match) {
        const firstWord = match[1].split(/[\s,]+/)[0].toLowerCase();
        if (LOCATION_BLOCKLIST.has(firstWord)) continue;
        return match[0].trim();
      }

      const fullMatch = line.match(/([A-Z][a-zA-Z]+(?:[\s,]+[A-Z][a-zA-Z'-]+)*)\s*,\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\b/);
      if (fullMatch) {
        const firstWord = fullMatch[1].split(/[\s,]+/)[0].toLowerCase();
        if (LOCATION_BLOCKLIST.has(firstWord)) continue;
        return fullMatch[0].trim();
      }
    }

    return null;
  }

  private parseSummary(sections: Map<string, string>): string | null {
    const summaryHeaders = SECTION_PATTERNS.summary;
    let content = '';
    for (const h of summaryHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content || content.trim().length < 20) return null;

    let cleaned = content;
    const headingMatch = cleaned.match(/^(professional\s+)?(summary|profile|objective|about)/i);
    if (headingMatch && headingMatch.index === 0) {
      cleaned = cleaned.substring(headingMatch[0].length).trim();
    }

    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.split('\n').filter(l => {
      const t = l.trim();
      if (t.length <= 1) return false;
      if (/^[.\-–—=*_]+$/.test(t)) return false;
      if (ALL_SECTION_HEADERS.some(h => t.toLowerCase() === h)) return false;
      return true;
    }).join('\n').trim();

    if (cleaned.length < 20) return null;
    return cleaned;
  }

  private parseExperience(sections: Map<string, string>): ParsedExperience[] {
    const expHeaders = SECTION_PATTERNS.experience;
    let content = '';
    for (const h of expHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content) return [];

    const projHeaders = SECTION_PATTERNS.projects;
    let projContent = '';
    for (const h of projHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        projContent = found;
        break;
      }
    }

    const experience = this.parseExperienceBlocks(content);
    if (projContent) {
      const projects = this.parseExperienceBlocks(projContent);
      for (const p of projects) {
        if (p.title && !experience.some(e => e.title.toLowerCase() === p.title.toLowerCase() && e.company.toLowerCase() === p.company.toLowerCase())) {
          experience.push(p);
        }
      }
    }

    return experience;
  }

  private parseExperienceBlocks(text: string): ParsedExperience[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const blocks: ParsedExperience[] = [];
    let current: ParsedExperience | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.looksLikeJobEntry(line)) {
        if (current) blocks.push(current);

        const { title, company } = this.splitTitleCompany(line);
        const dateRange = parseDateRange(line);

        current = {
          company,
          title,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          current: dateRange.current,
          bullets: [],
        };
        continue;
      }

      const hasTitleOnly = this.matchesTitleKeyword(line) && !/\b(19|20)\d{2}\b/.test(line) && line.length > 3 && line.length < 80;
      if (hasTitleOnly) {
        const nextLine = lines[i + 1];
        const nextHasDate = nextLine && /\b(19|20)\d{2}\b/.test(nextLine);
        const nextTwo = lines[i + 2];
        const nextTwoHasDate = nextTwo && /\b(19|20)\d{2}\b/.test(nextTwo);

        if (nextHasDate || nextTwoHasDate) {
          if (current) blocks.push(current);
          const mergedLine = nextHasDate ? `${line} ${nextLine}` : `${line} ${nextLine} ${nextTwo}`;
          const dateRange = parseDateRange(mergedLine);
          current = {
            company: '',
            title: line,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            current: dateRange.current,
            bullets: [],
          };
          if (nextHasDate) i++;
          else i += 2;
          continue;
        }
      }

      if (current) {
        const hasDate = /\b(19|20)\d{2}\b/.test(line);
        const isBullet = /^[-•*♦‣⁃◦‣]/.test(line) || /^\d+[.)]/.test(line);
        const isDateRange = hasDate && /present|current|to|–|—|-|until/i.test(line);

        if (isDateRange && !isBullet && line.length < 80) {
          current.startDate = current.startDate || parseDateRange(line).startDate;
          current.endDate = current.endDate || parseDateRange(line).endDate;
          current.current = current.current || parseDateRange(line).current;
          continue;
        }
      }

      if (current && line.length > 0) {
        if (/^[-•*♦‣⁃◦‣]/.test(line) || /^\d+[.)]/.test(line)) {
          const bullet = line.replace(/^[-•*♦‣⁃◦‣\d.)\s]+/, '').trim();
          if (bullet && bullet.length >= 10) current.bullets.push(bullet);
        } else if (line.length > 20 && !/^\d{4}\s/.test(line)) {
          if (this.matchesTitleKeyword(line) && line.length < 60 && /\b(19|20)\d{2}\b/.test(line)) {
          } else if (this.looksLikeCompanyLine(line)) {
            if (!current.company) current.company = line;
            else current.bullets.push(line);
          } else {
            current.bullets.push(line);
          }
        } else if (line.length > 3 && this.matchesTitleKeyword(line) && !hasCurrentIndicators(line)) {
          current.bullets.push(line);
        }
      }
    }

    if (current) blocks.push(current);

    // Merge company-only entries (no bullets, no dates) into the previous entry
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const next = blocks[i + 1];
      if (!block.company && next && next.bullets.length === 0 && !next.startDate && !next.endDate) {
        const hasTitleKw = this.matchesTitleKeyword(next.title);
        const hasCompanyKw = next.company ? this.matchesTitleKeyword(next.company) : false;
        if (!hasTitleKw || hasCompanyKw) {
          block.company = next.title;
          blocks.splice(i + 1, 1);
          i--;
        }
      }
    }

    return blocks;
  }

  private matchesTitleKeyword(line: string): boolean {
    const lower = line.toLowerCase();
    for (const kw of TITLE_KEYWORDS) {
      if (new RegExp(`\\b${kw.replace(/\./g, '\\.')}`, 'i').test(lower)) return true;
    }
    const words = lower.split(/\s+/);
    for (const word of words) {
      if (word.length < 4) continue;
      for (const kw of TITLE_KEYWORDS) {
        if (Math.abs(word.length - kw.length) > 2) continue;
        if (this.levenshtein(word, kw) <= 2) return true;
      }
    }
    return false;
  }

  private looksLikeJobEntry(line: string): boolean {
    if (line.length < 4 || line.length > 200) return false;
    if (/^(and|or|the|a|an|in|at|for|with|of|to)\b/i.test(line)) return false;
    if (/^[-•*♦‣⁃◦‣\d.)]/.test(line)) return false;

    const hasDate = /\b(19|20)\d{2}\b/.test(line);
    const hasTitle = this.matchesTitleKeyword(line);
    const hasSeparator = /\s+(at|@|—|–|-|•|\||,)\s+/.test(line);

    if (hasTitle && hasDate) return true;
    if (hasSeparator && hasDate) return true;
    if (hasTitle && hasSeparator) return true;
    if (hasDate && /^[A-Z]/.test(line) && line.split(/\s+/).length >= 2) return true;

    return false;
  }

  private splitTitleCompany(line: string): { title: string; company: string } {
    const countTitleWords = (s: string): number => {
      const lower = s.toLowerCase();
      let count = 0;
      for (const kw of TITLE_KEYWORDS) {
        if (new RegExp(`\\b${kw}`, 'i').test(lower)) count++;
      }
      return count;
    };

    const patterns = [
      { sep: /\s+•\s+/, before: true, after: true },
      { sep: /\s+\|\s+/, before: true, after: true },
      { sep: /\s+at\s+/i, before: true, after: true },
      { sep: /\s+@\s+/, before: true, after: true },
      { sep: /\s+[—–]\s+/, before: true, after: true },
      { sep: /\s+,\s+(?=inc|llc|ltd|corp|co|technologies|tech|solutions|group)/i, before: true, after: false },
    ];

    for (const { sep, before, after } of patterns) {
      const parts = line.split(sep);
      if (parts.length >= 2) {
        const datesRemoved = parts.map(p => p.replace(/\b(19|20)\d{2}\b(?:\s*[–—]\s*(?:(?:19|20)\d{2}|present|current|now|ongoing))?[^,]*/gi, '').trim());
        const first = datesRemoved[0].replace(/[,;]+$/, '').trim();
        const second = datesRemoved.slice(1).join(' ').replace(/[,;]+$/, '').trim();
        if (first && second) {
          const title = before ? first : second;
          const company = before ? second : first;
          const titleScore = countTitleWords(title);
          const companyScore = countTitleWords(company);
          if (companyScore > titleScore) return { title: company, company: title };
          return { title, company };
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

  private looksLikeCompanyLine(line: string): boolean {
    const lower = line.toLowerCase();
    const hasSuffix = COMPANY_SUFFIXES.some(s => new RegExp(`\\b${s}$`, 'i').test(lower));
    if (hasSuffix) return true;
    // "Company — Location" pattern: if the part before the separator doesn't match title keywords, treat as company
    const dashMatch = line.match(/^([A-Za-z][A-Za-z'.\s]{1,40})\s*[—–]\s*[A-Z]/);
    if (dashMatch) {
      const beforeDash = dashMatch[1].trim();
      if (!this.matchesTitleKeyword(beforeDash) && beforeDash.length >= 2) return true;
      return false;
    }
    if (/^[A-Z][a-zA-Z'.\s]{2,40}$/.test(line) && !this.matchesTitleKeyword(line)) return true;
    return false;
  }

  private parseEducation(sections: Map<string, string>): ParsedEducation[] {
    const eduHeaders = SECTION_PATTERNS.education;
    let content = '';
    for (const h of eduHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content) return [];

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const blocks: ParsedEducation[] = [];
    let current: ParsedEducation | null = null;

    for (const line of lines) {
      const inst = this.matchInstitution(line);
      if (inst) {
        if (current) blocks.push(current);
        current = { institution: inst, degree: '', field: null };
        const deg = this.matchDegree(line);
        if (deg) {
          current.degree = deg;
          current.field = this.extractField(line, inst, deg);
        }
        continue;
      }

      if (current) {
        const deg = this.matchDegree(line);
        if (deg && !current.degree) {
          current.degree = deg;
          current.field = current.field || this.extractField(line, '', deg);
          continue;
        }

        const years = line.match(/\b(19|20)\d{2}\b/g);
        if (years) {
          if (years.length >= 2) { current.startDate = years[0]; current.endDate = years[1]; }
          else if (!current.startDate) current.startDate = years[0];
          else current.endDate = years[0];
          continue;
        }

        const gpaMatch = line.match(/\b(GPA|grade)[:\s]*(\d+\.?\d*)/i);
        if (gpaMatch) current.gpa = gpaMatch[2];
      }
    }

    if (current) blocks.push(current);
    return blocks;
  }

  private matchInstitution(line: string): string | null {
    if (line.length < 2 || /^[-•*♦\d.)]/.test(line)) return null;

    const standaloneAbbrevs = /\b(MIT|UCL|LSE|KCL|LBS|Imperial|Oxford|Cambridge|Harvard|Stanford|Yale|Columbia|NYU|UCLA|UC Berkeley|UPenn|Cornell|Princeton|Duke)\b/;
    const abMatch = line.match(standaloneAbbrevs);
    if (abMatch && line.length < 50) return line.trim();

    if (line.length < 5) return null;

    const indicators = /\b(University|College|Institute|School|Academy|Polytechnic|Conservatory|Faculty|Seminary|Campus)\b/i;
    const match = line.match(indicators);
    if (match) {
      const idx = match.index!;
      const before = line.substring(0, idx);
      const orEarlier = before.match(/\b([A-Z][a-zA-Z'.]+)\s*$/);
      const start = orEarlier ? orEarlier.index! : idx;
      const end = line.indexOf(',', idx);
      const endIdx = end > 0 && end - idx < 40 ? end : idx + 40;
      return line.substring(start, endIdx).replace(/[,;–—|].*$/, '').trim();
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

  private matchDegree(line: string): string | null {
    const patterns: RegExp[] = [
      /\bbachelor\s+of\s+science\b/i, /\bbachelor\s+of\s+arts\b/i,
      /\bbachelor\s+of\s+engineering\b/i, /\b(?:bsc|b\.sc\.?)\b/i,
      /\b(?:ba|b\.a\.?)\b/i, /\b(?:beng|b\.eng\.?)\b/i,
      /\b(?:bba|b\.b\.a\.?)\b/i, /\bllb\b/i, /\b(?:bfa|b\.f\.a\.?)\b/i,
      /\bbachelor\b/i,
      /\bmaster\s+of\s+science\b/i, /\bmaster\s+of\s+arts\b/i,
      /\bmaster\s+of\s+business\s+administration\b/i,
      /\b(?:msc|m\.sc\.?)\b/i, /\b(?:ma|m\.a\.?)\b/i,
      /\b(?:meng|m\.eng\.?)\b/i, /\bmba\b/i, /\bllm\b/i,
      /\b(?:mfa|m\.f\.a\.?)\b/i, /\bmphil\b/i, /\bmph\b/i,
      /\bmaster\b/i,
      /\bdoctor\s+of\s+philosophy\b/i, /\bphd\b/i, /\bdphil\b/i,
      /\bmd\b/i, /\bjd\b/i, /\bedd\b/i, /\bdoctor(?:al|ate)?\b/i,
      /\bhnd\b/i, /\bhnc\b/i, /\bbtec\b/i, /\bnvq\b/i,
      /\bfoundation\s+degree\b/i, /\bassociate\s+degree\b/i,
      /\bdiploma\b/i, /\bcertificate\b/i,
    ];

    const canonical: Record<string, string> = {
      'bachelor of science': 'BSc', 'bachelor of arts': 'BA',
      'bachelor of engineering': 'BEng', 'bsc': 'BSc', 'b.sc.': 'BSc',
      'ba': 'BA', 'b.a.': 'BA', 'beng': 'BEng', 'b.eng.': 'BEng',
      'bba': 'BBA', 'b.b.a.': 'BBA', 'llb': 'LLB', 'bfa': 'BFA',
      'b.f.a.': 'BFA', 'bachelor': 'Bachelor',
      'master of science': 'MSc', 'master of arts': 'MA',
      'master of business administration': 'MBA',
      'msc': 'MSc', 'm.sc.': 'MSc', 'ma': 'MA', 'm.a.': 'MA',
      'meng': 'MEng', 'm.eng.': 'MEng', 'mba': 'MBA', 'llm': 'LLM',
      'mfa': 'MFA', 'm.f.a.': 'MFA', 'mphil': 'MPhil', 'mph': 'MPH',
      'master': 'Master',
      'doctor of philosophy': 'PhD', 'phd': 'PhD', 'dphil': 'DPhil',
      'md': 'MD', 'jd': 'JD', 'edd': 'EdD', 'doctor': 'Doctor',
      'hnd': 'HND', 'hnc': 'HNC', 'btec': 'BTEC', 'nvq': 'NVQ',
      'foundation degree': 'Foundation Degree',
      'associate degree': 'Associate Degree',
      'diploma': 'Diploma', 'certificate': 'Certificate',
    };

    for (const regex of patterns) {
      const m = line.match(regex);
      if (m) {
        const lower = m[0].toLowerCase();
        if (canonical[lower]) return canonical[lower];
        return m[0].trim();
      }
    }

    return null;
  }

  private extractField(line: string, institution: string, degree: string): string | null {
    let remainder = line;
    if (institution) remainder = remainder.replace(institution, '');
    const degRegex = new RegExp(degree.replace(/\./g, '\\.'), 'i');
    remainder = remainder.replace(degRegex, '');

    const field = remainder
      .replace(/[,;–—|].*$/, '')
      .replace(/^in\s+/i, '')
      .replace(/^of\s+/i, '')
      .trim();

    if (field && field.length > 1 && field.length < 50 && !/^\d+$/.test(field)) return field;
    return null;
  }

  private parseSkills(sections: Map<string, string>): string[] {
    const skillHeaders = SECTION_PATTERNS.skills;
    let content = '';
    for (const h of skillHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content) return [];

    const allSkills = new Set<string>();

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    const categoryLabel = /^(languages|frontend|backend|blockchain|cloud|devops|databases|tools|practices|frameworks|libraries|platforms|technologies|stacks?|database|programming|methodologies|testing|design|data|other):\s*/i;

    for (const line of lines) {
      const cleaned = line.replace(categoryLabel, '').trim();
      if (!cleaned) continue;

      const commaSkills = cleaned.split(/[,•·|;]+/).map(s => s.trim()).filter(Boolean);
      for (const s of commaSkills) {
        const normalized = this.matchSkill(s);
        if (normalized) allSkills.add(normalized);
      }
    }

    const flat = [...allSkills].filter(s => s.length >= 2 && s.length <= 50);
    return this.deduplicateSkills(flat);
  }

  private matchSkill(text: string): string | null {
    const clean = text.replace(/\(.*?\)/g, '').trim();
    if (clean.length < 2 || clean.length > 60) return null;

    const lower = clean.toLowerCase();

    // Exact dictionary match
    if (SKILL_DICTIONARY[lower]) return SKILL_DICTIONARY[lower];

    // Fuzzy dictionary match — whole-word match with short remaining text guard
    for (const [key, value] of Object.entries(SKILL_DICTIONARY)) {
      if (lower === key) return value;
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(lower)) {
        const remaining = lower.replace(keyRegex, '').trim();
        // Only treat as variant if very little remains (punctuation, whitespace)
        if (remaining.length <= 3) return value;
        // Otherwise it's a compound skill (e.g. "Ruby on Rails" contains "ruby" but isn't just "Ruby")
      }
    }

    // Reject known non-skill patterns
    if (ALL_SECTION_HEADERS.some(h => lower === h)) return null;
    if (/^\d+$/.test(clean)) return null;
    if (/^[-•*♦‣⁃◦‣\d.)]+$/.test(clean)) return null;

    // Accept anything that looks like a reasonable skill name:
    // Must start with a letter or digit, contain letters/digits/spaces/slashes/dots/hashes/+/#
    if (/^[a-zA-Z0-9][a-zA-Z0-9\s/+.#&-]{1,58}$/.test(clean)) {
      // Title-case normalize, but preserve all-caps words (e.g. "SEO", "API")
      return clean.replace(/\b\w+/g, word => {
        if (/^[A-Z]{2,}$/.test(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
    }

    return null;
  }

  private parseCertifications(sections: Map<string, string>): ParsedCertification[] {
    const certHeaders = SECTION_PATTERNS.certifications;
    let content = '';
    for (const h of certHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content) return [];

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const certs: ParsedCertification[] = [];

    const knownIssuers = [
      'aws', 'amazon web services', 'google', 'microsoft', 'cisco',
      'comptia', 'pmi', 'scrum alliance', 'hubspot', 'salesforce',
      'oracle', 'ibm', 'adobe', 'meta', 'coursera', 'udemy', 'edx',
      'linkedin learning', 'isaca', 'iapp', 'cfa institute', 'acca',
      'cima', 'prince2', 'axelos', 'isc2', 'ec-council',
      'offensive security', 'hashicorp', 'red hat', 'vmware',
      'databricks', 'snowflake', 'tableau', 'pagerduty',
      'nielsen norman group', 'ideo',
      'interaction design foundation', 'freecodecamp',
    ];

    for (const line of lines) {
      const text = line.replace(/^[-•*♦\d.)\s]+/, '').trim();
      if (!text) continue;

      // Skip lines that are just URLs or very short
      if (text.length < 3) continue;

      let name = text;
      let issuer: string | null = null;

      // Try to split by known issuers
      for (const known of knownIssuers) {
        const regex = new RegExp(`\\b${known.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
          const match = matches[matches.length - 1];
          const before = text.substring(0, match.index).replace(/[•·|—–-]\s*$/, '').trim();
          const after = text.substring(match.index + match[0].length).replace(/[•·|—–-]\s*$/, '').trim();
          // Use the part before the issuer as the name, after as additional info
          if (before) {
            name = before;
            issuer = match[0];
          } else if (after) {
            name = after;
            issuer = match[0];
          } else {
            name = match[0];
            issuer = null;
          }
          if (issuer === 'aws' || issuer?.toLowerCase() === 'amazon web services') issuer = 'AWS';
          break;
        }
      }

      // Try to split by separators if no issuer found
      if (!issuer) {
        const separators = ['issued by', 'certified by', 'through', '|', '•', '·', '—', '–'];
        for (const sep of separators) {
          const idx = text.indexOf(sep);
          if (idx > 0) {
            const candidateName = text.substring(0, idx).trim();
            const candidateIssuer = text.substring(idx + sep.length).replace(/\b\d{4}\b.*$/, '').trim();
            if (candidateName && candidateName.length > 2) {
              name = candidateName;
              issuer = candidateIssuer || null;
              break;
            }
          }
        }
      }

      // Clean up the name
      const date = this.extractCertDate(text);
      let cleanedName = name
        .replace(/^[-•*♦\s]+/, '')
        .replace(/\(\s*\)/g, '') // Remove empty parentheses
        .replace(/\s{2,}/g, ' ')
        .trim();

      // Skip if name is empty or just punctuation/whitespace
      if (!cleanedName || /^[-•·|—–\s()]+$/.test(cleanedName)) continue;
      if (cleanedName.length < 2) continue;

      certs.push({ name: cleanedName, issuer, date });
    }

    return certs;
  }

  private extractCertDate(text: string): string | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) return yearMatch[0];
    return null;
  }

  private parseLanguages(sections: Map<string, string>): ParsedLanguage[] {
    const langHeaders = SECTION_PATTERNS.languages;
    let content = '';
    for (const h of langHeaders) {
      const found = sections.get(h);
      if (found && found.trim().length > 0) {
        content = found;
        break;
      }
    }

    if (!content) return [];

    const results: ParsedLanguage[] = [];
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/[,•·|;]+/).map(s => s.trim()).filter(Boolean);

      for (const part of parts) {
        const lower = part.toLowerCase();

        for (const [langKey, langName] of Object.entries(LANGUAGE_DICTIONARY)) {
          const langRegex = new RegExp(`\\b${langKey}\\b`, 'i');
          if (langRegex.test(lower)) {
            let proficiency: string | null = null;

            for (const [profKey, profValue] of Object.entries(PROFICIENCY_MAP)) {
              const profRegex = new RegExp(`\\b${profKey}\\b`, 'i');
              if (profRegex.test(part)) {
                proficiency = profValue;
                break;
              }
            }

            if (!results.some(r => r.language.toLowerCase() === langName.toLowerCase())) {
              results.push({ language: langName, proficiency });
            }
            break;
          }
        }
      }
    }

    return results;
  }

  private buildLinks(contact: {
    linkedin: string | null;
    github: string | null;
    website: string | null;
  }, rawText: string, sections: Map<string, string>): ParsedLinks[] {
    const links: ParsedLinks[] = [];

    if (contact.linkedin) links.push({ title: 'LinkedIn', url: contact.linkedin });
    if (contact.github) links.push({ title: 'GitHub', url: contact.github });
    if (contact.website) links.push({ title: 'Website', url: contact.website });

    for (const h of SECTION_PATTERNS.links) {
      const content = sections.get(h);
      if (content) {
        const urls = [...content.matchAll(URL_RE)];
        for (const m of urls) {
          const url = m[0].toLowerCase();
          if (!links.some(l => l.url.toLowerCase() === url)) {
            const label = content.replace(url, '').replace(/^[-•*♦\d.)\s]+/, '').replace(/[:,;]\s*$/, '').trim();
            links.push({ title: label || url, url: m[0] });
          }
        }
      }
    }

    return links;
  }

  private cleanupExperience(entries: ParsedExperience[]): ParsedExperience[] {
    const sorted = entries
      .filter(e => e.title || e.company)
      .sort((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1;
        const aStart = a.startDate || '0000-00';
        const bStart = b.startDate || '0000-00';
        return bStart.localeCompare(aStart);
      });

    const deduped: ParsedExperience[] = [];
    for (const entry of sorted) {
      const isDup = deduped.some(e =>
        e.title.toLowerCase() === entry.title.toLowerCase() &&
        e.company.toLowerCase() === entry.company.toLowerCase() &&
        e.startDate === entry.startDate,
      );
      if (!isDup) deduped.push(entry);
    }

    return deduped;
  }

  private cleanupEducation(entries: ParsedEducation[]): ParsedEducation[] {
    return entries
      .filter(e => e.institution || e.degree)
      .sort((a, b) => {
        const aEnd = a.endDate || a.startDate || '0000';
        const bEnd = b.endDate || b.startDate || '0000';
        return bEnd.localeCompare(aEnd);
      });
  }

  private deduplicateSkills(skills: string[]): string[] {
    const seen = new Map<string, string>();
    for (const skill of skills) {
      const key = skill.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, skill);
      }
    }
    return [...seen.values()].filter(s => s.length >= 2 && s.length <= 50);
  }

  private calculateOverallConfidence(
    name: string | null,
    email: string | null,
    experience: ParsedExperience[],
    education: ParsedEducation[],
    skills: string[],
  ): number {
    const weights = [
      { value: name ? 1 : 0, weight: 0.15 },
      { value: email ? 1 : 0, weight: 0.15 },
      { value: (experience.some(e => e.title && e.company)) ? 1 : 0, weight: 0.35 },
      { value: (education.some(e => e.institution && e.degree)) ? 1 : 0, weight: 0.20 },
      { value: skills.length >= 3 ? 1 : 0, weight: 0.15 },
    ];

    return weights.reduce((sum, w) => sum + w.value * w.weight, 0);
  }
}

function hasCurrentIndicators(line: string): boolean {
  return /\b(present|current|now|ongoing)\b/i.test(line);
}
