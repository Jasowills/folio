import type { SectionHeaderStyleProps } from './types'

export default function UnderlineRuleHeader({ label, design, className = '' }: SectionHeaderStyleProps) {
  return (
    <h2
      className={`text-[13px] font-semibold uppercase tracking-wider mb-2 border-b border-border pb-1 ${className}`}
      style={{ color: design.primaryColor }}
    >
      {label}
    </h2>
  )
}
