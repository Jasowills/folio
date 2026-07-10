import type { SectionHeaderStyleProps } from './types'

export default function SmallCapsHeader({ label, design, className = '' }: SectionHeaderStyleProps) {
  return (
    <h2
      className={`text-[13px] font-semibold tracking-wider mb-2 ${className}`}
      style={{
        fontVariant: 'small-caps',
        color: design.primaryColor,
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </h2>
  )
}
