import type { SectionHeaderStyleProps } from './types'

export default function ColoredTabHeader({ label, design, className = '' }: SectionHeaderStyleProps) {
  return (
    <h2
      className={`text-[11px] font-bold uppercase tracking-wider mb-2 inline-block ${className}`}
      style={{
        backgroundColor: design.primaryColor,
        color: '#fff',
        padding: '2px 10px',
        borderRadius: '3px',
      }}
    >
      {label}
    </h2>
  )
}
