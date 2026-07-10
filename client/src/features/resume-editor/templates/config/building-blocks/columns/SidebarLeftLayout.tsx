import type { ColumnLayoutProps } from './types'
import type { DesignSettings } from '../../../../pages/editor/types'

export default function SidebarLeftLayout({ header, children, sidebarContent, design, className = '' }: ColumnLayoutProps) {
  return (
    <div className={`flex gap-0 ${className}`}>
      <div
        className="w-[36%] shrink-0 p-5 min-h-full"
        style={{ backgroundColor: design.primaryColor }}
      >
        {sidebarContent}
      </div>
      <div className="flex-1 p-5">
        {header}
        {children}
      </div>
    </div>
  )
}
