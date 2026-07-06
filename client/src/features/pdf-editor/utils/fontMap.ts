export function mapCanvasFont(fontFamily: string): string {
  if (fontFamily === 'serif') return '"DM Serif Display", Georgia, serif'
  if (fontFamily === 'monospace') return '"Roboto Mono", "Courier New", monospace'
  return '"Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif'
}
