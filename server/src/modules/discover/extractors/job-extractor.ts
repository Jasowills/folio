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

const COMMON_SUFFIXES =
  /\s+(Inc|Ltd|LLC|LP|Corp|Corporation|GmbH|AG|Pty|Co|Company|Group|Holdings|Limited)\.?$/i;

export function normalizeCompanyName(name: string): string {
  return name.replace(COMMON_SUFFIXES, '').trim();
}

const URL_IN_NAME = /\s*\(https?:\/\/[^\s)]+\)\s*$/;
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/;

export function cleanCompanyName(name: string): string {
  return name.replace(URL_IN_NAME, '').replace(TRAILING_PAREN, '').trim();
}

const LOCATION_EXTRA =
  /\s*\|\s*(full[\s-]?time|part[\s-]?time|contract|internship|onsite|remote|hybrid).*$/i;
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
  result = result.replace(/&#(\d+);/g, (_m, code) =>
    String.fromCharCode(parseInt(code)),
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return result;
}

type DatePatternFn = (fullMatch: string, ...groups: string[]) => Date;

const DATE_PATTERNS: { pattern: RegExp; fn: DatePatternFn }[] = [
  {
    pattern: /^(\d{4}-\d{2}-\d{2})/,
    fn: (_f: string, m: string) => new Date(m),
  },
  { pattern: /^(?:today|just now|moments ago)$/i, fn: () => new Date() },
  {
    pattern: /^(\d+)\s+(minute|min)s?\s+ago$/i,
    fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 60000),
  },
  {
    pattern: /^(\d+)\s+hour(?:s)?\s+ago$/i,
    fn: (_f: string, n: string) => new Date(Date.now() - parseInt(n) * 3600000),
  },
  {
    pattern: /^(\d+)\s+day(?:s)?\s+ago$/i,
    fn: (_f: string, n: string) =>
      new Date(Date.now() - parseInt(n) * 86400000),
  },
  {
    pattern: /^(\d+)\s+week(?:s)?\s+ago$/i,
    fn: (_f: string, n: string) =>
      new Date(Date.now() - parseInt(n) * 604800000),
  },
  {
    pattern:
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i,
    fn: (_f: string, m: string, d: string, y?: string) =>
      new Date(`${m} ${d}, ${y || new Date().getFullYear()}`),
  },
];

export function normalizePostedDate(raw: string): Date | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  for (const { pattern, fn } of DATE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const args = match.slice(1);
      try {
        return fn(cleaned, ...args);
      } catch {
        continue;
      }
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

export function parseSalary(raw: string): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  for (const pattern of SALARY_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const parseK = (s: string) => {
        const num = parseFloat(s.replace(/[kK]/g, ''));
        return s.match(/[kK]/) ? num * 1000 : num;
      };
      if (pattern.toString().includes('£')) {
        return {
          min: match[1] ? parseK(match[1]) : null,
          max: match[2] ? parseK(match[2]) : null,
          currency: 'GBP',
        };
      }
      if (pattern.toString().includes('€')) {
        return {
          min: match[1] ? parseK(match[1]) : null,
          max: match[2] ? parseK(match[2]) : null,
          currency: 'EUR',
        };
      }
      return {
        min: match[1] ? parseK(match[1]) : null,
        max: match.length > 2 && match[2] ? parseK(match[2]) : null,
        currency: 'USD',
      };
    }
  }
  return { min: null, max: null, currency: null };
}

const EXP_LEVEL_PATTERNS: Array<{ regex: RegExp; level: string }> = [
  {
    regex: /\b(Junior|Entry[\s-]Level|Graduate|Associate|Trainee|Intern)\b/i,
    level: 'entry',
  },
  { regex: /\b(Mid[\s-]Level|Mid|II\b|L2|L3)\b/i, level: 'mid' },
  {
    regex: /\b(Senior|Sr[.\s]|III\b|L4|L5|5\+ years|3[-–]5 years)\b/i,
    level: 'senior',
  },
  { regex: /\b(Staff|Principal|Lead|L6|L7)\b/i, level: 'staff' },
  {
    regex: /\b(Director|VP\b|Vice President|Head of|C[\- ]?Level|C-suite)\b/i,
    level: 'director',
  },
];

export function detectExperienceLevel(
  title: string,
  description: string,
): string | null {
  const combined = `${title} ${description}`;
  for (const { regex, level } of EXP_LEVEL_PATTERNS) {
    if (regex.test(combined)) return level;
  }
  return null;
}

export function extractLocation(locationStr: string): {
  location: string | null;
  isRemote: boolean;
} {
  let isRemote = false;
  const location: string | null = locationStr || null;

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

const NICE_TO_HAVE_HEADERS =
  /\b(nice[\s-]to[\s-]have|bonus|preferred|desirable|plus|good[\s-]to[\s-]have)\b/i;

export function splitSkillsFromDescription(description: string): {
  required: string[];
  niceToHave: string[];
} {
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
  const applyPattern =
    /<a[^>]*href=["']([^"']+)["'][^>]*>(?:\s*Apply\s*(?:Now|for this job)?\s*)<\/a>/i;
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
  english: 'English',
  spanish: 'Spanish',
  french: 'French',
  german: 'German',
  chinese: 'Chinese',
  japanese: 'Japanese',
  korean: 'Korean',
  portuguese: 'Portuguese',
  italian: 'Italian',
  russian: 'Russian',
  arabic: 'Arabic',
  dutch: 'Dutch',
  polish: 'Polish',
  turkish: 'Turkish',
  swedish: 'Swedish',
  danish: 'Danish',
  norwegian: 'Norwegian',
  finnish: 'Finnish',
  hindi: 'Hindi',
  thai: 'Thai',
  vietnamese: 'Vietnamese',
  hebrew: 'Hebrew',
  deutsch: 'German',
  español: 'Spanish',
  français: 'French',
  中文: 'Chinese',
  日本語: 'Japanese',
  한국어: 'Korean',
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

const TECH_TITLE_PATTERNS: RegExp[] = [
  /software\s*(?:engineer|developer|architect)/i,
  /front[- ]?end/i,
  /back[- ]?end/i,
  /full[- ]?stack/i,
  /devops/i,
  /\bsite\s+reliability\s*(?:engineer)?/i,
  /\bsre\b/i,
  /data\s*(?:engineer|scientist|analytics)/i,
  /machine\s*learning/i,
  /\bai\s*(?:engineer|architect|developer|scientist)/i,
  /\bml\s*(?:engineer|ops)/i,
  /infrastructure\s*(?:engineer)?/i,
  /platform\s*(?:engineer|developer)/i,
  /cloud\s*(?:engineer|architect)/i,
  /security\s*(?:engineer|analyst|architect)/i,
  /\bqa\s*(?:engineer|automation)/i,
  /test\s*(?:engineer|automation)/i,
  /\bios\s*(?:engineer|developer)/i,
  /android\s*(?:engineer|developer)/i,
  /mobile\s*(?:engineer|developer)/i,
  /\bdeveloper/i,
  /\bprogrammer/i,
  /\bsoftware\s*architect/i,
  /tech\s*lead/i,
  /engineering\s*manager/i,
  /staff\s*engineer/i,
  /principal\s*engineer/i,
  /\bgolang\b/i,
  /\brust\b/i,
  /\bpython\b.*(?:engineer|developer)/i,
  /typescript\s*(?:engineer|developer)/i,
  /kubernetes/i,
  /\bdocker\b/i,
  /\baws\b.*(?:engineer|architect)/i,
  /microservices/i,
  /\bapi\s*(?:engineer|developer|design)/i,
  /blockchain/i,
  /smart\s*contract/i,
  /solidity/i,
  /\bnlp\b/i,
  /computer\s*vision/i,
  /deep\s*learning/i,
  /etl\s*(?:engineer|developer)/i,
  /data\s*pipeline/i,
  /system\s*design/i,
  /distributed\s*systems/i,
  /web\s*(?:engineer|developer)/i,
  /backend\s*(?:engineer|developer)/i,
  /technical\s*(?:co-founder|lead|manager)/i,
  /scala\s*(?:engineer|developer)/i,
  /kotlin\s*(?:engineer|developer)/i,
  /swift\s*(?:engineer|developer)/i,
  /\bc\+\+/i,
  /embedded\s*(?:engineer|software|systems)/i,
  /\bqa\s*(?:engineer|lead)/i,
  /solution\s*architect/i,
  /systems\s*(?:engineer|architect)/i,
  /\bllm\b/i,
  /gen[- ]?ai/i,
  /prompt\s*engineer/i,
  /database\s*(?:engineer|administrator|architect)/i,
  /site\s*reliability/i,
  /\bci\s*\/\s*cd/i,
  /haskell/i,
  /\berlang\b/i,
  /\belixir\b/i,
  /servicenow\s*(?:engineer|developer)/i,
  /salesforce\s*(?:engineer|developer)/i,
  /sap\s*(?:engineer|developer|consultant)/i,
  /it\s*(?:engineer|support|specialist|analyst)/i,
];

const NON_TECH_TITLE_PATTERNS: RegExp[] = [
  /nurse/i,
  /doctor/i,
  /medical\s*(?:assistant|receptionist|scribe|records)/i,
  /clinical/i,
  /patient/i,
  /healthcare\s*(?:assistant|aide)/i,
  /social\s*media/i,
  /accountant/i,
  /accounting/i,
  /financial\s*analyst/i,
  /\bhr\b/i,
  /human\s*resources/i,
  /recruiter/i,
  /talent\s*acquis/i,
  /administrative\s*(?:assistant|coordinator)/i,
  /office\s*manager/i,
  /customer\s*(?:service|support|success\s*manager|care)/i,
  /call\s*center/i,
  /driver/i,
  /delivery/i,
  /warehouse/i,
  /logistics/i,
  /maintenance/i,
  /facility/i,
  /janitor/i,
  /housekeeping/i,
  /cook/i,
  /chef/i,
  /restaurant/i,
  /server\b(?!.*engineer)/i,
  /bartender/i,
  /retail/i,
  /cashier/i,
  /store\s*manager/i,
  /teacher/i,
  /professor/i,
  /instructor(?!.*(?:tech|code|coding|software))/i,
  /legal/i,
  /paralegal/i,
  /attorney/i,
  /lawyer/i,
  /esthetician/i,
  /barber/i,
  /hairdresser/i,
  /nail\s*tech/i,
  /police/i,
  /security\s*guard/i,
  /firefighter/i,
  /construction/i,
  /electrician/i,
  /plumber/i,
  /carpenter/i,
  /hvac/i,
  /receptionist/i,
  /front\s*desk/i,
  /phlebotomist/i,
  /pharmacy/i,
  /dental/i,
  /veterinary/i,
  /concierge/i,
  /valet/i,
  /parking/i,
  /pastor/i,
  /minister/i,
  /priest/i,
];

export function fixMojibake(text: string): string {
  // Detect UTF-8 bytes misread as Latin-1 (common in scraped text)
  if (/[\u00C0-\u00FF][\u0080-\u00BF]/.test(text)) {
    try {
      const buf = Buffer.from(text, 'latin1');
      const fixed = buf.toString('utf-8');
      if (fixed !== text) return fixed;
    } catch {}
  }
  return text;
}

const NON_ENGLISH_TERMS = [
  'docente',
  'universidad',
  'facultad',
  'búsqueda',
  'remoto',
  'tiempo parcial',
  'orientador',
  'mentores',
  'clases',
  'tutores',
  'refuerzo escolar',
  'profesor',
  'apoyo escolar',
  'todos los niveles',
  'matemáticas',
  'física',
  'química',
  'filosofía',
  'bachiller',
  'vocación',
  'advogado',
  'trabalhista',
  'prazos',
  'vagas',
  'contratação',
  'freelancer',
  'kundenservice',
  'möchtest',
  'engagement',
  'información',
  'experiencia',
  'habilidades',
  'requisitos',
  'asistente',
  'administrativa',
  'reportes',
  'seguimiento',
  'derecho',
  'remuneración',
  'postulación',
  'contratación',
  'inscripción',
  'estudiantes',
  'aprender',
  'enseñar',
  'jurídico',
  'trabalhista',
  'efetivo',
  'remota',
  'pré-requisitos',
  'jornada',
  'período',
  'integral',
  'entreprise',
  'temps plein',
  'temps partiel',
  'cdi',
  'cdd',
  'stage',
  'alternance',
  'salaire',
  'expérience',
  'compétences',
  'poste',
  'recrutons',
  'rejoignez',
  'nous cherchons',
  'missions',
  'lavoro',
  'tempo pieno',
  'assunzione',
  'stipendio',
  'esperienza',
  'ufficio',
  'azienda',
  'requisiti',
  '中方',
  '合作',
  '经验',
  '工作',
  '职位',
  '招聘',
];

const ACCENT_THRESHOLD = 0.04; // if >4% of chars are accented, likely not English

const ACCENTED_CHARS =
  /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĳĵķĸĺļľŀłńņňŉŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżž]/i;

export function isLikelyEnglish(text: string): boolean {
  if (!text || text.length < 50) return true;

  const t = text.toLowerCase();

  // Check for non-English stop words / phrases
  const nonEnglishHits = NON_ENGLISH_TERMS.filter((term) =>
    t.includes(term),
  ).length;
  if (nonEnglishHits >= 2) return false;
  if (nonEnglishHits === 1 && t.length < 500) return false;

  // Check accented character ratio
  const total = t.length;
  const accented = (t.match(ACCENTED_CHARS) || []).length;
  if (accented / total > ACCENT_THRESHOLD) return false;

  return true;
}

export interface TechClassification {
  relevance: 'tech' | 'non-tech' | 'unknown';
  confidence: number;
}

export function classifyTechRelevance(
  title: string,
  description: string,
): TechClassification {
  const text = `${title} ${description}`.toLowerCase();

  let techScore = 0;
  let nonTechScore = 0;

  for (const pattern of TECH_TITLE_PATTERNS) {
    if (pattern.test(text)) techScore += 3;
  }

  for (const pattern of NON_TECH_TITLE_PATTERNS) {
    if (pattern.test(text)) nonTechScore += 3;
  }

  const techWords = [
    'engineer',
    'developer',
    'software',
    'code',
    'programming',
    'deploy',
    'algorithm',
    'api',
    'database',
    'server',
    'frontend',
    'backend',
    'fullstack',
    'devops',
    'infrastructure',
    'kubernetes',
    'docker',
    'aws',
    'cloud',
    'microservice',
    'typescript',
    'javascript',
    'python',
    'react',
    'node',
    'git',
    'agile',
    'sprint',
    'technical',
    'architecture',
    'system design',
    'ci/cd',
    'automation',
    'unit test',
    'integration test',
    'code review',
    'pull request',
  ];

  const nonTechWords = [
    'sales',
    'marketing',
    'accounting',
    'finance',
    'hr',
    'recruit',
    'customer',
    'patient',
    'medical',
    'clinical',
    'warehouse',
    'driver',
    'delivery',
    'maintenance',
    'retail',
    'restaurant',
    'hospital',
    'nurse',
    'doctor',
    'administrative',
    'reception',
    'call center',
  ];

  for (const word of techWords) {
    const count = (
      text.match(
        new RegExp(`\\b${word.replace(/[\/\- ]/g, '[- ]')}\\b`, 'gi'),
      ) || []
    ).length;
    techScore += Math.min(count, 3);
  }

  for (const word of nonTechWords) {
    const count = (
      text.match(
        new RegExp(`\\b${word.replace(/[\/\- ]/g, '[- ]')}\\b`, 'gi'),
      ) || []
    ).length;
    nonTechScore += Math.min(count, 3);
  }

  // Heavily penalize non-tech when title clearly indicates non-tech
  const titleLower = title.toLowerCase();
  for (const pattern of NON_TECH_TITLE_PATTERNS) {
    if (pattern.test(titleLower)) nonTechScore += 5;
  }
  for (const pattern of TECH_TITLE_PATTERNS) {
    if (pattern.test(titleLower)) techScore += 5;
  }

  // Check for encoding garbage (garbage titles)
  if (/^[A-Za-z]?\d{6,}$/.test(title.trim()) || title.trim().length < 2) {
    nonTechScore += 10;
  }

  // Penalize non-English descriptions
  if (!isLikelyEnglish(text)) {
    nonTechScore += 8;
  }

  const total = techScore + nonTechScore;
  if (total === 0) return { relevance: 'unknown', confidence: 0 };

  const techRatio = techScore / total;

  if (techRatio >= 0.55)
    return { relevance: 'tech', confidence: Math.round(techRatio * 100) };
  if (nonTechScore > techScore * 2)
    return {
      relevance: 'non-tech',
      confidence: Math.round((1 - techRatio) * 100),
    };

  return {
    relevance: 'unknown',
    confidence: Math.round(Math.min(techRatio, 1 - techRatio) * 50),
  };
}

const SENIORITY_PATTERNS: Array<{ regex: RegExp; level: string }> = [
  { regex: /\b(Intern|Trainee|Apprentice)\b/i, level: 'intern' },
  {
    regex:
      /\b(Junior|Jr[.\s]|Entry[\s-]Level|Entry|Graduate|Associate|L1|L2)\b/i,
    level: 'entry',
  },
  { regex: /\b(Mid[\s-]Level|Mid|II\b|L3)\b/i, level: 'mid' },
  { regex: /\b(Senior|Sr[.\s]|III\b|L4|L5)\b/i, level: 'senior' },
  { regex: /\b(Staff|Principal|L6)\b/i, level: 'staff' },
  { regex: /\b(Lead|Manager|Head of|L7)\b/i, level: 'lead' },
  {
    regex: /\b(Director|VP\b|Vice President|C[\- ]?Level|C-suite|Chief)\b/i,
    level: 'executive',
  },
];

export function detectSeniorityLevel(
  title: string,
  description: string,
): string | null {
  const combined = `${title} ${description}`;
  for (const { regex, level } of SENIORITY_PATTERNS) {
    if (regex.test(combined)) return level;
  }
  return null;
}

const ROLE_FAMILY_PATTERNS: Array<{ regex: RegExp; family: string }> = [
  {
    regex:
      /\b(software engineer|software developer|swe|full[\s-]?stack|backend|frontend|back[\s-]?end|front[\s-]?end)\b/i,
    family: 'software_engineering',
  },
  {
    regex:
      /\b(devops|site reliability|sre|platform engineer|infrastructure engineer|cloud engineer|reliability)\b/i,
    family: 'devops_infrastructure',
  },
  {
    regex:
      /\b(data scientist|data engineer|data analyst|machine learning|ml engineer|ml ops|ai engineer|ai researcher)\b/i,
    family: 'data_ai_ml',
  },
  {
    regex: /\b(product manager|product owner|technical product manager|pdm)\b/i,
    family: 'product_management',
  },
  {
    regex:
      /\b(designer|ux designer|ui designer|product designer|design engineer|creative)\b/i,
    family: 'design_ux',
  },
  {
    regex:
      /\b(engineering manager|tech lead|technology lead|vp engineering|cto)\b/i,
    family: 'engineering_leadership',
  },
  {
    regex:
      /\b(sales engineer|solutions architect|customer engineer|field engineer)\b/i,
    family: 'sales_engineering',
  },
  {
    regex:
      /\b(consultant|management consultant|business analyst|strategy|operations)\b/i,
    family: 'consulting_business',
  },
  {
    regex:
      /\b(quality assurance|qa engineer|test engineer|sdet|automation engineer)\b/i,
    family: 'qa_testing',
  },
  {
    regex:
      /\b(security engineer|cybersecurity|infosec|soc analyst|penetration tester)\b/i,
    family: 'security',
  },
  {
    regex: /\b(mobile engineer|ios engineer|android engineer)\b/i,
    family: 'mobile',
  },
  {
    regex:
      /\b(data analyst|business intelligence|bi engineer|analytics engineer)\b/i,
    family: 'data_analytics',
  },
  {
    regex:
      /\b(support engineer|technical support|customer support engineer)\b/i,
    family: 'support',
  },
  {
    regex: /\b(hardware engineer|embedded engineer|firmware engineer|fpga)\b/i,
    family: 'hardware_embedded',
  },
  {
    regex: /\b(research scientist|applied scientist|research engineer)\b/i,
    family: 'research',
  },
  {
    regex: /\b(marketing|growth|seo|content|social media|brand)\b/i,
    family: 'marketing',
  },
  {
    regex:
      /\b(sales|account executive|account manager|business development|bdr|sdr)\b/i,
    family: 'sales',
  },
  {
    regex: /\b(hr|human resources|people|talent|recruiter|recruiting)\b/i,
    family: 'hr_people',
  },
  {
    regex:
      /\b(finance|accountant|accounting|controller|financial analyst|fp&a)\b/i,
    family: 'finance',
  },
  {
    regex: /\b(legal|counsel|paralegal|compliance)\b/i,
    family: 'legal_compliance',
  },
];

export function detectRoleFamily(
  title: string,
  description: string,
): string | null {
  const combined = `${title} ${description}`;
  for (const { regex, family } of ROLE_FAMILY_PATTERNS) {
    if (regex.test(combined)) return family;
  }
  return null;
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
