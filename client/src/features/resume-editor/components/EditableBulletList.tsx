import EditableField from './EditableField'

interface EditableBulletListProps {
  bullets: string[]
  onChange: (bullets: string[]) => void
  className?: string
}

export default function EditableBulletList({ bullets, onChange, className = '' }: EditableBulletListProps) {
  const visible = bullets.filter(Boolean)

  function handleBulletChange(index: number, value: string) {
    const next = [...bullets]
    next[index] = value
    onChange(next)
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const next = [...bullets]
      next.splice(index + 1, 0, '')
      onChange(next)
    }
    if (e.key === 'Backspace' && bullets[index] === '') {
      e.preventDefault()
      if (bullets.length <= 1) return
      const next = bullets.filter((_, i) => i !== index)
      onChange(next)
    }
  }

  return (
    <ul className={`list-none ${className}`}>
      {bullets.map((bullet, i) => (
        <li key={i} className="flex gap-1.5 items-start">
          <span className="shrink-0 mt-0.5 text-teal">\u2022</span>
          <EditableField
            value={bullet}
            onChange={v => handleBulletChange(i, v)}
            placeholder="Add a bullet point..."
            className="flex-1 text-muted text-[11px]"
            multiline
          />
        </li>
      ))}
      {visible.length === 0 && (
        <li>
          <button
            onClick={() => onChange([''])}
            className="text-[11px] text-muted/40 hover:text-muted transition-colors italic cursor-pointer"
          >
            + Add bullet point
          </button>
        </li>
      )}
    </ul>
  )
}
