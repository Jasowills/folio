import type { ReactNode } from 'react'
import type { DesignSettings } from '../../../../../../pages/editor/types'

export interface ColumnLayoutProps {
  header: ReactNode
  children: ReactNode
  sidebarContent?: ReactNode
  design: DesignSettings
  className?: string
}
