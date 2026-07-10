import type { AccentProps } from './types'

export default function SingleAccentLine({ design, children, className = '' }: AccentProps) {
  return (
    <div className={className} style={{ borderLeft: `3px solid ${design.primaryColor}`, paddingLeft: '10px' }}>
      {children}
    </div>
  )
}
