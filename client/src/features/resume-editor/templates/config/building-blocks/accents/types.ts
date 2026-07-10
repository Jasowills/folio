import type { ReactNode } from 'react'
import type { DesignSettings } from '../../../../pages/editor/types'

export interface AccentProps {
  design: DesignSettings
  children: ReactNode
  className?: string
}
