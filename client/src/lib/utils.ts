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
