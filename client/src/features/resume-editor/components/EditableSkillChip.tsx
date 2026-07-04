import { useState } from 'react'
import type { SkillEntry } from '../../../pages/editor/types'

interface EditableSkillChipProps {
  skill: SkillEntry
  onChange: (skill: SkillEntry) => void
  onDelete: () => void
}

export default function EditableSkillChip({ skill, onChange, onDelete }: EditableSkillChipProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(skill.name)

  function handleFinish() {
    setEditing(false)
    if (draft.trim() && draft !== skill.name) onChange({ ...skill, name: draft.trim() })
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-paper px-2 py-0.5 rounded text-muted border border-teal">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleFinish}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFinish() } }}
          className="w-16 bg-transparent border-0 outline-none p-0 text-[10px]"
        />
        <button onClick={onDelete} className="text-muted/40 hover:text-danger transition-colors cursor-pointer">&times;</button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-paper px-2 py-0.5 rounded text-muted group cursor-pointer" onClick={() => setEditing(true)}>
      {skill.name}
      <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-muted/40 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">&times;</button>
    </span>
  )
}
