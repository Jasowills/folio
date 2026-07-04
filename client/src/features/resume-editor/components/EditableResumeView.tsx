import type { LocalData } from '../../../pages/editor/types'
import EditableField from './EditableField'
import EditableBulletList from './EditableBulletList'
import EditableDate from './EditableDate'
import SectionMenu from './SectionMenu'
import IssueHighlight from './IssueHighlight'
import IssueBadge from './IssueBadge'

interface RedFlag {
  message: string
  severity: 'low' | 'medium' | 'high'
  section?: string
}

interface Props {
  data: LocalData
  onUpdate: (data: LocalData) => void
  redFlags?: RedFlag[]
}

interface SectionDef {
  key: string
  label: string
  visible: boolean
  render: () => React.ReactNode
  clone: () => Partial<LocalData>
  remove: () => Partial<LocalData>
}

export default function EditableResumeView({ data, onUpdate, redFlags = [] }: Props) {
  function setField<K extends keyof LocalData>(key: K, value: LocalData[K]) {
    onUpdate({ ...data, [key]: value })
  }

  function updateExp(index: number, field: string, value: string | boolean) {
    const exp = [...data.experience]
    ;(exp[index] as any)[field] = value
    setField('experience', exp)
  }

  function updateEdu(index: number, field: string, value: string) {
    const edu = [...data.education]
    ;(edu[index] as any)[field] = value
    setField('education', edu)
  }

  const sectionOrder = data.sectionOrder.filter(
    s => s === 'summary' || s === 'experience' || s === 'education' || s === 'skills' || s === 'certifications' || s === 'languages' || s === 'links'
  )

  const sections: SectionDef[] = [
    {
      key: 'summary', label: 'Summary', visible: !!data.summary,
      render: () => (
        <EditableField value={data.summary} onChange={v => setField('summary', v)} placeholder="Write a professional summary..." multiline className="text-muted leading-relaxed" />
      ),
      clone: () => ({ summary: data.summary }),
      remove: () => ({ summary: '' }),
    },
    {
      key: 'experience', label: 'Experience', visible: data.experience.length > 0,
      render: () => (
        data.experience.map((exp, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between gap-2">
              <strong><EditableField value={exp.title} onChange={v => updateExp(i, 'title', v)} placeholder="Job Title" className="text-[13px] font-semibold" /></strong>
              <EditableDate startDate={exp.startDate} endDate={exp.endDate} current={exp.current || false}
                onStartDateChange={v => updateExp(i, 'startDate', v)}
                onEndDateChange={v => updateExp(i, 'endDate', v)}
                onCurrentChange={v => updateExp(i, 'current', v)} />
            </div>
            <p className="text-[11px] text-muted mb-2">
              <EditableField value={exp.company} onChange={v => updateExp(i, 'company', v)} placeholder="Company Name" />
            </p>
            <EditableBulletList bullets={exp.bullets}
              onChange={v => { const e = [...data.experience]; e[i] = { ...e[i], bullets: v }; setField('experience', e) }} />
          </div>
        ))
      ),
      clone: () => ({ experience: [...data.experience, { ...data.experience[0], company: '', title: '', bullets: [''] }] }),
      remove: () => ({ experience: [] }),
    },
    {
      key: 'education', label: 'Education', visible: data.education.length > 0,
      render: () => (
        data.education.map((edu, i) => (
          <div key={i} className="mb-2 last:mb-0">
            <strong className="text-[12px]"><EditableField value={edu.institution} onChange={v => updateEdu(i, 'institution', v)} placeholder="Institution" /></strong>
            <p className="text-[10px] text-muted">
              <EditableField value={edu.degree} onChange={v => updateEdu(i, 'degree', v)} placeholder="Degree" />
              {edu.field ? <span> — <EditableField value={edu.field} onChange={v => updateEdu(i, 'field', v)} placeholder="Field" /></span> : null}
            </p>
          </div>
        ))
      ),
      clone: () => ({ education: [...data.education, { ...data.education[0], institution: '', degree: '' }] }),
      remove: () => ({ education: [] }),
    },
    {
      key: 'skills', label: 'Skills', visible: data.skills.length > 0,
      render: () => (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {data.skills.map((s, i) => (
            <span key={i} className="text-[10px] bg-paper px-2 py-0.5 rounded text-muted">{s.name}</span>
          ))}
        </div>
      ),
      clone: () => ({ skills: [...data.skills] }),
      remove: () => ({ skills: [] }),
    },
    {
      key: 'certifications', label: 'Certifications', visible: data.certifications.length > 0,
      render: () => (
        data.certifications.map((c, i) => (
          <p key={i} className="text-[11px] text-muted">{c.name}{c.issuer ? ` \u2014 ${c.issuer}` : ''}</p>
        ))
      ),
      clone: () => ({ certifications: [...data.certifications] }),
      remove: () => ({ certifications: [] }),
    },
    {
      key: 'languages', label: 'Languages', visible: data.languages.length > 0,
      render: () => (
        <p className="text-[11px] text-muted">{data.languages.join(' \u00B7 ')}</p>
      ),
      clone: () => ({ languages: [...data.languages] }),
      remove: () => ({ languages: [] }),
    },
    {
      key: 'links', label: 'Links', visible: data.links.length > 0,
      render: () => (
        data.links.map((l, i) => (
          <p key={i} className="text-[11px] text-muted">
            <span className="font-medium underline text-teal">{l.title || l.url}</span>
            {l.title && l.url ? ` \u2014 ${l.url}` : ''}
          </p>
        ))
      ),
      clone: () => ({ links: [...data.links] }),
      remove: () => ({ links: [] }),
    },
  ]

  const orderedSections = sectionOrder
    .map(key => sections.find(s => s.key === key))
    .filter((s): s is SectionDef => !!s && s.visible)

  return (
    <div className="space-y-5">
      <SectionContainer
        label="Header"
        index={-1}
        count={orderedSections.length}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDuplicate={() => {}}
        onRemove={() => {}}
        onHide={() => {}}
      >
        <div className="flex items-center justify-between mb-2">
          <div />
          <IssueBadge count={redFlags.length} />
        </div>
        <div className="text-center mb-4">
          <h1 className="text-[24px] font-bold mb-1">
            <EditableField value={data.name} onChange={v => setField('name', v)} placeholder="Your Name" className="text-[24px] font-bold" />
          </h1>
          <p className="text-[11px] text-muted flex items-center justify-center gap-2 flex-wrap">
            <EditableField value={data.contact.email} onChange={v => setField('contact', { ...data.contact, email: v })} placeholder="email@example.com" />
            <EditableField value={data.contact.phone} onChange={v => setField('contact', { ...data.contact, phone: v })} placeholder="(555) 123-4567" />
            <EditableField value={data.contact.location} onChange={v => setField('contact', { ...data.contact, location: v })} placeholder="City, State" />
          </p>
        </div>
      </SectionContainer>

      {orderedSections.map((sec, i) => {
        const sectionFlags = redFlags.filter(f => f.section?.toLowerCase() === sec.key)
        return (
          <SectionContainer
            key={sec.key}
            label={sec.label}
            index={i}
            count={orderedSections.length}
            onMoveUp={() => moveSection(sec.key, -1)}
            onMoveDown={() => moveSection(sec.key, 1)}
            onDuplicate={() => {
              const change = (sec as any).clone()
              onUpdate({ ...data, ...change })
            }}
            onRemove={() => {
              const change = (sec as any).remove()
              const order = data.sectionOrder.filter(s => s !== sec.key)
              onUpdate({ ...data, ...change, sectionOrder: order })
            }}
            onHide={() => {
              const order = data.sectionOrder.filter(s => s !== sec.key)
              onUpdate({ ...data, sectionOrder: order })
            }}
          >
            <IssueHighlight section={sec.key} flags={sectionFlags}>
              <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-ink border-b border-border pb-1">{sec.label}</h2>
              {sec.render()}
            </IssueHighlight>
          </SectionContainer>
        )
      })}
    </div>
  )

  function moveSection(key: string, direction: -1 | 1) {
    const order = [...data.sectionOrder]
    const idx = order.indexOf(key)
    const target = idx + direction
    if (target < 0 || target >= order.length) return
    ;[order[idx], order[target]] = [order[target], order[idx]]
    setField('sectionOrder', order)
  }
}

function SectionContainer({
  children, label, index, count, onMoveUp, onMoveDown, onDuplicate, onRemove, onHide,
}: {
  children: React.ReactNode
  label: string
  index: number
  count: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
  onHide: () => void
}) {
  const isHeader = label === 'Header'
  return (
    <div className="group relative px-1 py-1 -mx-1 rounded transition-colors hover:bg-paper-dark/30">
      {!isHeader && (
        <div className="absolute -left-0.5 top-0 bottom-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ width: '8px', cursor: 'grab' }}>
          <div className="flex flex-col gap-0.5">
            <div className="w-1 h-1 rounded-full bg-muted/40" />
            <div className="w-1 h-1 rounded-full bg-muted/40" />
            <div className="w-1 h-1 rounded-full bg-muted/40" />
          </div>
        </div>
      )}
      <div className={`flex items-start gap-1 ${isHeader ? '' : 'ml-3'}`}>
        <div className="flex-1 min-w-0">{children}</div>
        {!isHeader && (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1">
            <SectionMenu
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
              onHide={onHide}
              canMoveUp={index > 0}
              canMoveDown={index < count - 1}
            />
          </div>
        )}
      </div>
    </div>
  )
}
