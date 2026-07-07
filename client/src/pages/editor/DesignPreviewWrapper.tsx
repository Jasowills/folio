import { useEffect } from 'react'
import type { DesignSettings } from './types'

const FONT_URLS: Record<string, string> = {
  'DM Serif Display': 'DM+Serif+Display:ital@0;1',
  'Georgia': '',
  'Garamond': '',
  'Merriweather': 'Merriweather:wght@300;400;700',
  'EB Garamond': 'EB+Garamond:wght@400;500;600',
  'Lora': 'Lora:wght@400;500;600',
  'Libre Baskerville': 'Libre+Baskerville:wght@400;700',
  'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;500;600;700',
  'Calibri': '',
  'Helvetica Neue': '',
  'Source Sans Pro': 'Source+Sans+Pro:wght@300;400;600;700',
  'Open Sans': 'Open+Sans:wght@300;400;500;600;700',
  'Roboto': 'Roboto:wght@300;400;500;700',
  'Lato': 'Lato:wght@300;400;700',
  'Nunito': 'Nunito:wght@300;400;600;700',
}

export function useFontLoader(headingFont: string, bodyFont: string) {
  useEffect(() => {
    const fonts = [headingFont, bodyFont].filter(f => FONT_URLS[f])
    if (fonts.length === 0) return
    const families = fonts.map(f => FONT_URLS[f]).filter(Boolean).join('&family=')
    if (!families) return
    const existing = document.getElementById('folio-fonts')
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.id = 'folio-fonts'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
    document.head.appendChild(link)
    return () => { const el = document.getElementById('folio-fonts'); if (el) el.remove() }
  }, [headingFont, bodyFont])
}

export function fontFamilyFor(font: string): string {
  const map: Record<string, string> = {
    'DM Serif Display': "'DM Serif Display', Georgia, serif",
    'Georgia': 'Georgia, "Times New Roman", serif',
    'Garamond': 'Garamond, Baskerville, "Baskerville Old Face", "Times New Roman", serif',
    'Merriweather': "'Merriweather', Georgia, serif",
    'EB Garamond': "'EB Garamond', Garamond, serif",
    'Lora': "'Lora', Georgia, serif",
    'Libre Baskerville': "'Libre Baskerville', Georgia, serif",
    'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    'Calibri': 'Calibri, "Helvetica Neue", Arial, sans-serif',
    'Helvetica Neue': '"Helvetica Neue", Helvetica, Arial, sans-serif',
    'Source Sans Pro': "'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif",
    'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    'Roboto': "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    'Lato': "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
    'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
  }
  return map[font] || font
}

export function designPreviewStyle(design: DesignSettings): React.CSSProperties {
  const marginVal = 6 + design.margins * 3
  return {
    fontFamily: fontFamilyFor(design.bodyFont),
    '--folio-heading-font': fontFamilyFor(design.headingFont),
    '--folio-primary': design.primaryColor,
    '--folio-secondary': design.secondaryColor,
    padding: `${marginVal}mm`,
  } as React.CSSProperties
}
