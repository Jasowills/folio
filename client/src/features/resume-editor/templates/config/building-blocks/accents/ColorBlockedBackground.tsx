import type { AccentProps } from './types'

export default function ColorBlockedBackground({ design, children, className = '' }: AccentProps) {
  return (
    <div
      className={`p-3 rounded ${className}`}
      style={{ backgroundColor: `${design.primaryColor}08` }}
    >
      {children}
    </div>
  )
}
