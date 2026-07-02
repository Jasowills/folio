export interface ExtractedFields {
  roleTitle: string;
  companyName: string;
  location: string | null;
  isRemote: boolean;
  postedAt: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  experienceLevel: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  applicationUrl: string | null;
}

const COMMON_SUFFIXES = /\s+(Inc|Ltd|LLC|LP|Corp|Corporation|GmbH|AG|Pty|Co|Company|Group|Holdings|Limited)\.?$/i;

export function normalizeCompanyName(name: string): string {
  return name.replace(COMMON_SUFFIXES, '').trim();
}

const URL_IN_NAME = /\s*\(https?:\/\/[^\s)]+\)\s*$/;
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/;

export function cleanCompanyName(name: string): string {
  return name
    .replace(URL_IN_NAME, '')
    .replace(TRAILING_PAREN, '')
    .trim();
}

const LOCATION_EXTRA = /\s*\|\s*(full[\s-]?time|part[\s-]?time|contract|internship|onsite|remote|hybrid).*$/i;
const LOCATION_PREFIX = /^(on\s?site|onsite|hybrid|remote)\s*[:–-]?\s*/i;
const LEADING_PREPOSITION = /^(in|at)\s+/i;

export function cleanLocation(location: string): string {
  return location
    .replace(LOCATION_EXTRA, '')
    .replace(LOCATION_PREFIX, '')
    .replace(LEADING_PREPOSITION, '')
    .replace(/^\(|\)$/g, '')
    .trim();
}

const ENTITY_MAP: Record<string, string> = {
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x2f;': '/',
  '&apos;': "'",
  '&amp;': '&',
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

export function decodeHtmlEntities(text: string): string {
  let result = text;
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    result = result.replaceAll(entity, char);
  }
  result = result.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}

type DatePatternFn = (fullMatch: string, ...groups: string[]) => Date;

const DATE_PATTERNS: { pattern: RegExp; fn: DatePatternFn }[] = [
  { pattern: /^(\d{4}-\d{2}-\d{2})/, fn: (_f: string, m: string) => new Date(m) },
  { pattern: /^(?:today|just now|moments ago)$/i, fn: () => new Date() },
  { pattern: /^(\d+)\s+(minute|min)s?\s+ago$/i, fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 60000) },
  { pattern: /^(\d+)\s+hour(?:s)?\s+ago$/i, fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 3600000) },
  { pattern: /^(\d+)\s+day(?:s)?\s+ago$/i, fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 86400000) },
  { pattern: /^(\d+)\s+week(?:s)?\s+ago$/i, fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 604800000) },
  { pattern: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i, fn: (_f: string, m: string, d: string, y?: string) => new Date(`${m} ${d}, ${y || new Date().getFullYear()}`) },
];

export function normalizePostedDate(raw: string): Date | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  for (const { pattern, fn } of DATE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const args = match.slice(1) as string[];
      try { return fn(cleaned, ...args); } catch { continue; }
    }
  }
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const SALARY_PATTERNS = [
  /\$(\d+[kK]?)\s*(?:–|-|to)\s*\$(\d+[kK]?)/,
  /£(\d+[kK]?)\s*(?:–|-|to)\s*£(\d+[kK]?)/,
  /€(\d+[kK]?)\s*(?:–|-|to)\s*€(\d+[kK]?)/,
  /\$(\d+[kK]?)\s*\+\s*/,
  /(?:up to|max|maximum)\s+\$(\d+[kK]?)/i,
];

export function parseSalary(raw: string): { min: number | null; max: number | null; currency: string | null } {
  for (const pattern of SALARY_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const parseK = (s: string) => {
        const num = parseFloat(s.replace(/[kK]/g, ''));
        return s.match(/[kK]/) ? num * 1000 : num;
      };
      if (pattern.toString().includes('£')) {
        return { min: match[1] ? parseK(match[1]) : null, max: match[2] ? parseK(match[2]) : null, currency: 'GBP' };
      }
      if (pattern.toString().includes('€')) {
        return { min: match[1] ? parseK(match[1]) : null, max: match[2] ? parseK(match[2]) : null, currency: 'EUR' };
      }
      return { min: match[1] ? parseK(match[1]) : null, max: match.length > 2 && match[2] ? parseK(match[2]) : null, currency: 'USD' };
    }
  }
  return { min: null, max: null, currency: null };
}

const EXP_LEVEL_PATTERNS: Array<{ regex: RegExp; level: string }> = [
  { regex: /\b(Junior|Entry[\s-]Level|Graduate|Associate|Trainee|Intern)\b/i, level: 'entry' },
  { regex: /\b(Mid[\s-]Level|Mid|II\b|L2|L3)\b/i, level: 'mid' },
  { regex: /\b(Senior|Sr[.\s]|III\b|L4|L5|5\+ years|3[-–]5 years)\b/i, level: 'senior' },
  { regex: /\b(Staff|Principal|Lead|L6|L7)\b/i, level: 'staff' },
  { regex: /\b(Director|VP\b|Vice President|Head of|C[\- ]?Level|C-suite)\b/i, level: 'director' },
];

export function detectExperienceLevel(title: string, description: string): string | null {
  const combined = `${title} ${description}`;
  for (const { regex, level } of EXP_LEVEL_PATTERNS) {
    if (regex.test(combined)) return level;
  }
  return null;
}

export function extractLocation(locationStr: string): { location: string | null; isRemote: boolean } {
  let isRemote = false;
  let location: string | null = locationStr || null;

  if (!location) return { location: null, isRemote: false };

  const lower = location.toLowerCase();

  if (/\bremote\b/.test(lower)) {
    return { location: 'Remote', isRemote: true };
  }

  if (/\b(hybrid|on[\s-]?site|in[\s-]?office)\b/.test(lower)) {
    isRemote = false;
  }

  return { location, isRemote };
}

const NICE_TO_HAVE_HEADERS = /\b(nice[\s-]to[\s-]have|bonus|preferred|desirable|plus|good[\s-]to[\s-]have)\b/i;

export function splitSkillsFromDescription(description: string): { required: string[]; niceToHave: string[] } {
  const niceToHaveSection: string[] = [];
  const requiredSection: string[] = [];
  const lines = description.split('\n');
  let currentSection: 'required' | 'nice_to_have' = 'required';

  for (const line of lines) {
    if (NICE_TO_HAVE_HEADERS.test(line)) {
      currentSection = 'nice_to_have';
      continue;
    }
    if (currentSection === 'nice_to_have') {
      niceToHaveSection.push(line);
    } else {
      requiredSection.push(line);
    }
  }

  return {
    required: requiredSection,
    niceToHave: niceToHaveSection,
  };
}

const SKILL_PATTERNS = [
  /(?:required|must have|you (?:have|bring)|what you (?:need|bring)|qualifications?|requirements?|skills?):\s*([^]*?)(?=\n\n|\n(?:nice|bonus|preferred|plus|about us|why join))/i,
  /(?:nice to have|bonus|preferred|desirable|plus):\s*([^]*?)(?=\n\n|\n(?:about us|why join|apply|benefits))/i,
];

export function extractSkills(text: string, knownSkills: string[]): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const skill of knownSkills) {
    if (lower.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }
  return found;
}

export function extractApplicationUrl(html: string): string | null {
  const applyPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>(?:\s*Apply\s*(?:Now|for this job)?\s*)<\/a>/i;
  const match = html.match(applyPattern);
  return match ? match[1] : null;
}

const URL_REGEX = /https?:\/\/[^\s<>"'\]]+/gi;

export function extractUrlFromText(text: string): string | null {
  const decoded = decodeHtmlEntities(text);
  const urls = decoded.match(URL_REGEX);
  if (!urls) return null;
  return urls[0].replace(/[.,;:!?]+$/, '');
}

const LANGUAGE_PATTERNS = [
  /\b(?:fluent|proficient|native)\s+(?:in\s+)?(?:English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic|Dutch|Polish|Turkish|Swedish|Danish|Norwegian|Finnish|Hindi|Thai|Vietnamese|Hebrew)\b/gi,
  /\b(?:English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic|Dutch|Polish|Turkish|Swedish|Danish|Norwegian|Finnish|Hindi|Thai|Vietnamese|Hebrew)\s+(?:fluency|proficiency|required|preferred|must|is\s+a\s+plus)\b/gi,
  /\b(?:language|languages)[^.]*?(?:English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic|Dutch|Polish|Turkish|Swedish|Danish|Norwegian|Finnish|Hindi|Thai|Vietnamese|Hebrew)/gi,
  /(?:Deutsch|English|Español|Français|中文|日本語|한국어)\s*(?:C1|C2|B1|B2|native|fluent)/gi,
];

const LANGUAGE_NAMES: Record<string, string> = {
  english: 'English', spanish: 'Spanish', french: 'French', german: 'German',
  chinese: 'Chinese', japanese: 'Japanese', korean: 'Korean', portuguese: 'Portuguese',
  italian: 'Italian', russian: 'Russian', arabic: 'Arabic', dutch: 'Dutch',
  polish: 'Polish', turkish: 'Turkish', swedish: 'Swedish', danish: 'Danish',
  norwegian: 'Norwegian', finnish: 'Finnish', hindi: 'Hindi', thai: 'Thai',
  vietnamese: 'Vietnamese', hebrew: 'Hebrew', deutsch: 'German',
  español: 'Spanish', français: 'French', '中文': 'Chinese',
  '日本語': 'Japanese', '한국어': 'Korean',
};

export function extractLanguages(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of LANGUAGE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const lower = match[0].toLowerCase();
      for (const [key, name] of Object.entries(LANGUAGE_NAMES)) {
        if (lower.includes(key)) {
          found.add(name);
        }
      }
    }
  }
  return Array.from(found);
}

export function extractField(text: string, fieldName: string): string | null {
  const patterns: Record<string, RegExp[]> = {
    roleTitle: [
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /class=["'](?:title|position|job-title)["'][^>]*>([^<]+)/i,
    ],
    companyName: [
      /class=["'](?:company|employer)["'][^>]*>([^<]+)/i,
      /property=["']?hiringOrganization["']?[^>]*>([^<]+)/i,
    ],
    location: [
      /class=["'](?:location)["'][^>]*>([^<]+)/i,
      /<span[^>]*class=["'][^"']*(?:location|place)["'][^>]*>([^<]+)<\/span>/i,
    ],
  };

  const fieldPatterns = patterns[fieldName];
  if (!fieldPatterns) return null;

  for (const pattern of fieldPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
