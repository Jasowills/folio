import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

const ENTITY_MAP: Record<string, string> = {
  '&#x27;': "'", '&#x2F;': '/', '&#x2f;': '/',
  '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
  '&apos;': "'",
}

export function decodeHtml(text: string): string {
  let r = text
  for (const [e, c] of Object.entries(ENTITY_MAP)) r = r.replaceAll(e, c)
  r = r.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code)))
  r = r.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
  return r
}

const URL_REGEX = /https?:\/\/[^\s<>"'\]]+/gi

export function extractUrl(text: string): string | null {
  const decoded = decodeHtml(text)
  const urls = decoded.match(URL_REGEX)
  if (!urls) return null
  return urls[0].replace(/[.,;:!?)\]]+$/, '')
}

export function formatJobDescription(raw: string): string {
  if (!raw) return ''
  let t = raw
  // Insert padding around block-level HTML tags before stripping them
  t = t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/?h[1-6]>/gi, '\n\n')
    .replace(/<\/?div>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?[uo]l>/gi, '\n')
    .replace(/<\/?blockquote>/gi, '\n\n')
    .replace(/<\/?tr>/gi, '\n')
    .replace(/<\/?td[^>]*>/gi, '\t')
    .replace(/<\/?th[^>]*>/gi, '\t')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return t
}

export function getScoreColor(score: number) {
  if (score >= 75) return 'text-score-high'
  if (score >= 50) return 'text-score-mid'
  return 'text-score-low'
}

export function getScoreRingColor(score: number) {
  if (score >= 75) return '#2D6A2D'
  if (score >= 50) return '#BA7517'
  return '#9B2335'
}
