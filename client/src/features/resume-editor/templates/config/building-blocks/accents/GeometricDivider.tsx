import type { AccentProps } from './types'

export default function GeometricDivider({ design, children, className = '' }: AccentProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-0.5 flex-1" style={{ backgroundColor: design.primaryColor, opacity: 0.3 }} />
        <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: design.primaryColor }} />
        <div className="h-0.5 flex-1" style={{ backgroundColor: design.primaryColor, opacity: 0.3 }} />
      </div>
      {children}
    </div>
  )
}
