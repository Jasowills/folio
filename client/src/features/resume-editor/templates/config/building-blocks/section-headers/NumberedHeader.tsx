import type { SectionHeaderStyleProps } from './types'

export default function NumberedHeader({ label, design, index = 0, className = '' }: SectionHeaderStyleProps) {
  return (
    <h2
      className={`text-[13px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2 ${className}`}
      style={{ color: design.primaryColor }}
    >
      <span
        className="text-[10px] font-bold rounded-full flex items-center justify-center"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: design.primaryColor,
          color: '#fff',
        }}
      >
        {index + 1}
      </span>
      <span>{label}</span>
    </h2>
  )
}
