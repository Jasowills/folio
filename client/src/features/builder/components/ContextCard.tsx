import type { TargetRoleData } from '../types'

interface Props {
  targetRole: TargetRoleData | null
}

export default function ContextCard({ targetRole }: Props) {
  if (!targetRole) return null

  const parts = [`Building for: ${targetRole.role}`]
  if (targetRole.level) parts.push(`\u00B7 ${targetRole.level}`)
  if (targetRole.company) parts.push(`\u00B7 Tailored to: ${targetRole.company}`)

  return (
    <div className="mt-4 text-center">
      <span className="inline-block text-[10px] text-muted/50 bg-white/60 px-3 py-1 rounded-full">
        {parts.join(' ')}
      </span>
    </div>
  )
}
