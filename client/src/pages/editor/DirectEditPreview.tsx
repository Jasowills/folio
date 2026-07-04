import { InlineEditEngine, renderContact } from './InlineEditEngine'
import type { LocalData } from './types'

interface Props {
  localData: LocalData
  onUpdate: (data: LocalData) => void
}

function clone(data: LocalData): LocalData {
  return JSON.parse(JSON.stringify(data))
}

export function DirectEditPreview({ localData, onUpdate }: Props) {
  const engine = InlineEditEngine({ localData, onUpdate, editMode: 'direct' })
  const { Editable, SelectionToolbarComponent, AddButton, DeleteButton, DragHandle } = engine

  return (
    <div className="bg-white shadow-lg rounded-sm p-10 min-h-[297mm] w-[210mm] text-[13px] leading-relaxed text-ink">
      <div className="relative mb-6 text-center">
        <h1 className="text-[28px] font-bold mb-1">{Editable({ state: { type: 'name' }, value: localData.name, className: 'text-[28px] font-bold' })}</h1>
        <p className="text-[12px] text-muted">{renderContact(Editable, localData)}</p>
      </div>

      {localData.summary && (
        <div className="relative mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-1.5 text-ink border-b border-border pb-1">Summary</h2>
          <div className="text-muted leading-relaxed mt-2">{Editable({ state: { type: 'summary' }, value: localData.summary, multiline: true })}</div>
        </div>
      )}

      {localData.experience.length > 0 && (
        <div className="relative mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3 text-ink border-b border-border pb-1">Experience</h2>
          {localData.experience.map((exp, i) => (
            <div key={i} className="relative mb-4 group">
              <div className="flex items-center justify-between gap-2">
                <strong>{Editable({ state: { type: 'job-title', sectionIndex: i }, value: exp.title, className: 'font-semibold text-[14px]' })}</strong>
                <span className="text-[11px] text-muted whitespace-nowrap">
                  {Editable({ state: { type: 'date', sectionIndex: i }, value: [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' — ') })}
                </span>
              </div>
              <p className="text-[12px] text-muted mb-2">{Editable({ state: { type: 'company', sectionIndex: i }, value: exp.company })}</p>
              <ul className="list-disc list-inside space-y-0.5">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-muted">
                    {Editable({ state: { type: 'bullet', sectionIndex: i, bulletIndex: j }, value: bullet, className: 'text-[12px]' })}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  const c = clone(localData)
                  c.experience[i].bullets.push('')
                  onUpdate(c)
                }}
                className="text-[11px] text-muted hover:text-teal transition-colors mt-1 cursor-pointer"
              >+ Add bullet</button>
            </div>
          ))}
          <button
            onClick={() => {
              const c = clone(localData)
              c.experience.push({ company: '', title: '', startDate: '', endDate: '', current: false, bullets: [''] })
              onUpdate(c)
            }}
            className="w-full py-2 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors cursor-pointer mt-2"
          >+ Add experience</button>
        </div>
      )}

      {localData.education.length > 0 && (
        <div className="relative mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3 text-ink border-b border-border pb-1">Education</h2>
          {localData.education.map((edu, i) => (
            <div key={i} className="mb-2">
              <p className="text-[12px] font-semibold">{edu.institution}{edu.degree ? ` — ${edu.degree}` : ''}{edu.field ? ` in ${edu.field}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      {localData.skills.length > 0 && (
        <div className="relative mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2 text-ink border-b border-border pb-1">Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {localData.skills.map((skill, i) => (
              <span key={i} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">{skill.name}</span>
            ))}
          </div>
        </div>
      )}

      {SelectionToolbarComponent}
    </div>
  )
}
