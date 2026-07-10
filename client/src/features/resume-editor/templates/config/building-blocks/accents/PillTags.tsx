import type { ReactNode } from 'react'
import type { DesignSettings } from '../../../../../../pages/editor/types'

export interface PillTagsProps {
  design: DesignSettings
  children: ReactNode
  className?: string
}

export default function PillTags({ design, children, className = '' }: PillTagsProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {children}
    </div>
  )
}

export function PillTag({ design, children, className = '' }: { design: DesignSettings; children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded ${className}`}
      style={{
        backgroundColor: `${design.primaryColor}15`,
        color: design.primaryColor,
      }}
    >
      {children}
    </span>
  )
}
