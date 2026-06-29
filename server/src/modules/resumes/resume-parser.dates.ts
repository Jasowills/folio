const MONTH_NAMES_FULL = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const MONTH_NAMES_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const MONTH_ABBREV: Record<string, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
};

const SEASON_MONTHS: Record<string, number> = {
  spring: 3, summer: 6, autumn: 9, fall: 9, winter: 12,
};

const CURRENT_INDICATORS = /^(present|current|now|ongoing|today|to date|till date|till now|continuing|—|-)$/i;

function normalizeMonth(input: string): string | null {
  const lower = input.toLowerCase().replace(/\.$/, '');
  if (MONTH_NAMES_FULL.includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1, 3);
  }
  if (MONTH_NAMES_SHORT.includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1, 3);
  }
  return null;
}

function monthToNumber(month: string): number {
  const m = month.toLowerCase().replace(/\.$/, '').slice(0, 3);
  return MONTH_NAMES_SHORT.indexOf(m);
}

export interface ParsedDate {
  date: string;
  isCurrent: boolean;
}

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
  current: boolean;
}

const MONTH_RE = '(?:Jan(?:uary)?\\.?|Feb(?:ruary)?\\.?|Mar(?:ch)?\\.?|Apr(?:il)?\\.?|May\\.?|Jun(?:e)?\\.?|Jul(?:y)?\\.?|Aug(?:ust)?\\.?|Sep(?:tember)?\\.?|Oct(?:ober)?\\.?|Nov(?:ember)?\\.?|Dec(?:ember)?\\.?)';

const SEASON_RE = '(?:Spring|Summer|Autumn|Fall|Winter)';

const YEAR_RE = '(?:19|20)\\d{2}';

const FULL_DATE_RE = new RegExp(`(${MONTH_RE})\\s*['°]?(\\d{2})?\\s*(${YEAR_RE})`, 'gi');
const SEASON_YEAR_RE = new RegExp(`(${SEASON_RE})\\s+(${YEAR_RE})`, 'gi');
const NUMERIC_DATE_RE = /(0[1-9]|1[0-2])[./](\d{4})\b/g;
const YEAR_ONLY_RE = /\b(19|20)\d{2}\b/g;

function extractSingleDate(text: string): { month: string | null; year: string | null } {
  const fullMatch = FULL_DATE_RE.exec(text);
  if (fullMatch) {
    FULL_DATE_RE.lastIndex = 0;
    const month = normalizeMonth(fullMatch[1]);
    const year = fullMatch[3];
    return { month, year };
  }
  FULL_DATE_RE.lastIndex = 0;

  const seasonMatch = SEASON_YEAR_RE.exec(text);
  if (seasonMatch) {
    SEASON_YEAR_RE.lastIndex = 0;
    const season = seasonMatch[1].toLowerCase();
    const year = seasonMatch[2];
    const monthNum = SEASON_MONTHS[season];
    const month = monthNum ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNum - 1] : null;
    return { month, year };
  }
  SEASON_YEAR_RE.lastIndex = 0;

  const numericMatch = NUMERIC_DATE_RE.exec(text);
  if (numericMatch) {
    NUMERIC_DATE_RE.lastIndex = 0;
    const monthNum = parseInt(numericMatch[1], 10);
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNum - 1] || null;
    return { month, year: numericMatch[2] };
  }
  NUMERIC_DATE_RE.lastIndex = 0;

  const yearMatch = YEAR_ONLY_RE.exec(text);
  if (yearMatch) {
    YEAR_ONLY_RE.lastIndex = 0;
    return { month: null, year: yearMatch[0] };
  }
  YEAR_ONLY_RE.lastIndex = 0;

  return { month: null, year: null };
}

export function normalizeToISO(month: string | null, year: string, isEnd: boolean): string {
  const m = month ? monthToNumber(month) + 1 : (isEnd ? 12 : 1);
  return `${year}-${String(m).padStart(2, '0')}`;
}

export function parseDateRange(text: string): DateRange {
  const currentMatch = text.match(CURRENT_INDICATORS);
  const isCurrent = !!currentMatch;

  const rangeSeparator = /\s*(?:to|until|thru|through|–|—|-)\s*/i;
  const rangeParts = text.split(rangeSeparator);

  if (rangeParts.length >= 2) {
    const startText = rangeParts[0].trim();
    const endText = rangeParts[rangeParts.length - 1].trim();

    const startResult = extractSingleDate(startText);
    const endIsCurrent = CURRENT_INDICATORS.test(endText);
    const endResult = endIsCurrent ? { month: null, year: null } : extractSingleDate(endText);

    return {
      startDate: startResult.year ? normalizeToISO(startResult.month, startResult.year, false) : null,
      endDate: (endIsCurrent || !endResult.year) ? null : normalizeToISO(endResult.month, endResult.year, true),
      current: isCurrent || endIsCurrent,
    };
  }

  if (isCurrent) {
    return { startDate: null, endDate: null, current: true };
  }

  const single = extractSingleDate(text);
  if (single.year) {
    return {
      startDate: normalizeToISO(single.month, single.year, false),
      endDate: null,
      current: false,
    };
  }

  return { startDate: null, endDate: null, current: false };
}

export function extractDatesFromText(text: string): string[] {
  const results: string[] = [];

  const fullMatches = [...text.matchAll(FULL_DATE_RE)];
  for (const m of fullMatches) {
    const month = normalizeMonth(m[1]);
    const year = m[3];
    if (month && year) results.push(normalizeToISO(month, year, false));
  }

  if (results.length === 0) {
    const numericMatches = [...text.matchAll(NUMERIC_DATE_RE)];
    for (const m of numericMatches) {
      const monthNum = parseInt(m[1], 10);
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNum - 1];
      results.push(normalizeToISO(month, m[2], false));
    }
  }

  if (results.length === 0) {
    const yearMatches = [...text.matchAll(YEAR_ONLY_RE)];
    for (const m of yearMatches) results.push(`${m[0]}-01`);
  }

  return results;
}
