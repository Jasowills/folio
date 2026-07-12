import type { TemplateConfig } from './config/types'
import { getTemplateConfig } from './config/registry'

interface PreviewProps {
  templateId: string
  accentColor?: string
  className?: string
}

function ColumnLayout({ layout }: { layout: string }) {
  switch (layout) {
    case 'sidebar-left':
      return (
        <g>
          <rect x="2" y="2" width="20" height="44" rx="1" fill="#E8E6E1" />
          <rect x="24" y="2" width="38" height="44" rx="1" fill="#F5F3EF" />
        </g>
      )
    case 'sidebar-right':
      return (
        <g>
          <rect x="2" y="2" width="38" height="44" rx="1" fill="#F5F3EF" />
          <rect x="42" y="2" width="20" height="44" rx="1" fill="#E8E6E1" />
        </g>
      )
    case 'header-band-plus-single':
      return (
        <g>
          <rect x="2" y="2" width="60" height="12" rx="1" fill="#E8E6E1" />
          <rect x="2" y="16" width="60" height="30" rx="1" fill="#F5F3EF" />
        </g>
      )
    case 'asymmetric-grid':
      return (
        <g>
          <rect x="2" y="2" width="36" height="20" rx="1" fill="#E8E6E1" />
          <rect x="40" y="2" width="22" height="20" rx="1" fill="#F5F3EF" />
          <rect x="2" y="24" width="28" height="22" rx="1" fill="#F5F3EF" />
          <rect x="32" y="24" width="30" height="22" rx="1" fill="#E8E6E1" />
        </g>
      )
    default: // single-column
      return <rect x="2" y="2" width="60" height="44" rx="1" fill="#F5F3EF" />
  }
}

function HeaderBlock({ treatment, color }: { treatment: string; color: string }) {
  const y = treatment === 'header-band-plus-single' || treatment === 'full-bleed-band' ? 2 : 2
  const h = treatment.includes('dark-block') || treatment.includes('full-bleed') || treatment.includes('card-block') ? 14 : 10

  switch (treatment) {
    case 'dark-block':
      return <rect x="2" y={y} width="60" height={h} rx="1" fill={color} opacity="0.9" />
    case 'full-bleed-band':
      return <rect x="0" y={y} width="64" height={h} fill={color} opacity="0.15" />
    case 'top-stripe':
      return <rect x="2" y={y} width="60" height="2" rx="0.5" fill={color} />
    case 'centered-stacked':
      return (
        <g>
          <rect x="18" y={y} width="28" height="2" rx="0.5" fill={color} opacity="0.6" />
          <rect x="14" y={y + 3} width="36" height="1.5" rx="0.5" fill="#999" opacity="0.3" />
          <rect x="20" y={y + 6} width="24" height="1" rx="0.5" fill="#999" opacity="0.2" />
        </g>
      )
    case 'left-aligned':
      return (
        <g>
          <rect x="4" y={y + 1} width="24" height="2" rx="0.5" fill={color} opacity="0.7" />
          <rect x="4" y={y + 4} width="32" height="1" rx="0.5" fill="#999" opacity="0.3" />
        </g>
      )
    case 'centered-line':
      return (
        <g>
          <rect x="16" y={y + 1} width="32" height="2" rx="0.5" fill={color} opacity="0.6" />
          <rect x="22" y={y + 5} width="20" height="1" rx="0.5" fill="#999" opacity="0.3" />
        </g>
      )
    case 'card-block':
      return <rect x="4" y={y} width="56" height={h} rx="2" fill={color} opacity="0.08" />
    case 'split-header':
      return (
        <g>
          <rect x="2" y={y} width="30" height={h} rx="1" fill={color} opacity="0.12" />
          <rect x="34" y={y} width="28" height={h} rx="1" fill="#F5F3EF" />
        </g>
      )
    default: // minimal, center
      return (
        <g>
          <rect x="18" y={y + 1} width="28" height="2" rx="0.5" fill={color} opacity="0.5" />
        </g>
      )
  }
}

function SectionHeaders({ style, color }: { style: string; color: string }) {
  const sections = [18, 28, 38]
  return (
    <g>
      {sections.map((y, i) => (
        <g key={i}>
          {style === 'underline-rule' && <rect x="4" y={y} width="20" height="0.7" fill={color} opacity="0.5" />}
          {style === 'small-caps-spaced' && <rect x="4" y={y} width="16" height="1.5" rx="0.3" fill={color} opacity="0.4" />}
          {style === 'colored-tab' && <rect x="4" y={y - 0.5} width="14" height="2.5" rx="1" fill={color} opacity="0.25" />}
          {style === 'icon-plus-label' && (
            <g>
              <circle cx="6" cy={y + 0.75} r="1.2" fill={color} opacity="0.3" />
              <rect x="9" y={y} width="14" height="1.5" rx="0.3" fill={color} opacity="0.35" />
            </g>
          )}
          {style === 'numbered' && (
            <g>
              <text x="4" y={y + 2} fontSize="2.5" fill={color} opacity="0.5" fontFamily="monospace">{i + 1}.</text>
              <rect x="8" y={y} width="14" height="1.5" rx="0.3" fill={color} opacity="0.3" />
            </g>
          )}
          {['underline-rule', 'small-caps-spaced', 'colored-tab', 'icon-plus-label', 'numbered'].indexOf(style) === -1 && (
            <rect x="4" y={y} width="18" height="1.5" rx="0.3" fill={color} opacity="0.35" />
          )}
          <rect x="4" y={y + 2.5} width="48" height="0.6" rx="0.2" fill="#ccc" opacity="0.5" />
          <rect x="4" y={y + 4} width="42" height="0.6" rx="0.2" fill="#ddd" opacity="0.4" />
        </g>
      ))}
    </g>
  )
}

export default function TemplatePreview({ templateId, accentColor = '#0F6E56', className = '' }: PreviewProps) {
  const config = getTemplateConfig(templateId)

  if (!config) return null

  return (
    <svg
      viewBox="0 0 64 48"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ColumnLayout layout={config.columnLayout} />
      <HeaderBlock treatment={config.headerTreatment} color={accentColor} />
      <SectionHeaders style={config.sectionHeaderStyle} color={accentColor} />
    </svg>
  )
}
