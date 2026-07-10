import type { SectionHeaderStyleProps } from './types'

const SECTION_ICONS: Record<string, string> = {
  summary: '\u25CB',
  experience: '\u25A1',
  education: '\u25B6',
  skills: '\u2605',
  certifications: '\u2713',
  languages: '\u266B',
  links: '\u2197',
  projects: '\u2699',
  volunteer: '\u2764',
  awards: '\u2606',
  publications: '\u270E',
  references: '\u2022',
}

export default function IconPlusLabelHeader({ label, design, className = '' }: SectionHeaderStyleProps) {
  const icon = SECTION_ICONS[label.toLowerCase()] || '\u25CF'

  return (
    <h2
      className={`text-[13px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${className}`}
      style={{ color: design.primaryColor }}
    >
      <span className="text-[11px]">{icon}</span>
      <span>{label}</span>
    </h2>
  )
}
