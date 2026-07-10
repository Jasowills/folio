import type { ReactNode } from 'react'
import type { DesignSettings } from '../../../../pages/editor/types'

export interface TimelineProps {
  design: DesignSettings
  items: ReactNode[]
  className?: string
}

export default function TimelineLine({ design, items, className = '' }: TimelineProps) {
  return (
    <div className={`relative pl-4 ${className}`}>
      <div
        className="absolute left-[7px] top-0 bottom-0 w-px"
        style={{ backgroundColor: design.primaryColor, opacity: 0.3 }}
      />
      {items.map((item, i) => (
        <div key={i} className="relative mb-3 last:mb-0">
          <div
            className="absolute left-[-10px] top-[6px] w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: design.primaryColor }}
          />
          {item}
        </div>
      ))}
    </div>
  )
}
