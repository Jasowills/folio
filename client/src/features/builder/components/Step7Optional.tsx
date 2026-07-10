import { useState } from 'react'
import type { OptionalData } from '../types'

interface Props {
  data: OptionalData | null
  onSave: (data: OptionalData) => void
  onChange?: (data: OptionalData) => void
}

export default function Step7Optional({ data, onSave, onChange }: Props) {
  const [certOn, setCertOn] = useState(data?.certifications || false)
  const [langOn, setLangOn] = useState(data?.languages || false)
  const [projOn, setProjOn] = useState(data?.projects || false)
  const [volOn, setVolOn] = useState(data?.volunteer || false)
  const [awdOn, setAwdOn] = useState(data?.awards || false)

  const [certData, setCertData] = useState(data?.certificationsData || [{ name: '', issuer: '', date: '' }])
  const [langData, setLangData] = useState(data?.languagesData || [''])
  const [projData, setProjData] = useState(data?.projectsData || [{ name: '', description: '', url: '', rawNotes: '' }])
  const [volData, setVolData] = useState(data?.volunteerData || [{ organization: '', role: '', description: '' }])
  const [awdData, setAwdData] = useState(data?.awardsData || [{ title: '', issuer: '', date: '' }])

  const buildData = () => ({
    certifications: certOn, certificationsData: certOn ? certData : [],
    languages: langOn, languagesData: langOn ? langData : [],
    projects: projOn, projectsData: projOn ? projData : [],
    volunteer: volOn, volunteerData: volOn ? volData : [],
    awards: awdOn, awardsData: awdOn ? awdData : [],
  })

  const fireOnChange = () => onChange?.(buildData())

  const handleSave = () => {
    onSave(buildData())
  }

  const toggleSection = (
    setter: (v: boolean) => void,
    current: boolean,
  ) => {
    const next = !current
    setter(next)
    onChange?.({
      ...buildData(),
      certifications: setter === setCertOn ? next : certOn,
      languages: setter === setLangOn ? next : langOn,
      projects: setter === setProjOn ? next : projOn,
      volunteer: setter === setVolOn ? next : volOn,
      awards: setter === setAwdOn ? next : awdOn,
    })
  }

  return (
    <div className="p-6 space-y-3">
      {/* Certifications */}
      <SectionToggle label="Certifications" desc="AWS, Google, PMP and other credentials." enabled={certOn} onToggle={() => toggleSection(setCertOn, certOn)}>
        {certData.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input value={c.name} onChange={e => setCertData(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="AWS Solutions Architect" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
            <input value={c.issuer} onChange={e => setCertData(prev => prev.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} placeholder="Issuer" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
          </div>
        ))}
        <button onClick={() => setCertData(prev => [...prev, { name: '', issuer: '', date: '' }])} className="text-[10px] text-teal">+ Add certification</button>
      </SectionToggle>

      {/* Languages */}
      <SectionToggle label="Languages" desc="If you speak more than one language." enabled={langOn} onToggle={() => toggleSection(setLangOn, langOn)}>
        <input value={langData[0]} onChange={e => setLangData([e.target.value])} placeholder="English (Native), Spanish (Professional)" className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
      </SectionToggle>

      {/* Projects */}
      <SectionToggle label="Projects" desc="Side projects, open source, freelance work." enabled={projOn} onToggle={() => toggleSection(setProjOn, projOn)}>
        {projData.map((p, i) => (
          <div key={i} className="space-y-2">
            <input value={p.name} onChange={e => setProjData(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Project name" className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
            <textarea value={p.rawNotes} onChange={e => setProjData(prev => prev.map((x, j) => j === i ? { ...x, rawNotes: e.target.value } : x))} placeholder="Describe the project in plain language — the AI will write the description." rows={2} className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal resize-none" />
          </div>
        ))}
        <button onClick={() => setProjData(prev => [...prev, { name: '', description: '', url: '', rawNotes: '' }])} className="text-[10px] text-teal">+ Add project</button>
      </SectionToggle>

      {/* Volunteer */}
      <SectionToggle label="Volunteer" desc="Community involvement and volunteer roles." enabled={volOn} onToggle={() => toggleSection(setVolOn, volOn)}>
        {volData.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v.organization} onChange={e => setVolData(prev => prev.map((x, j) => j === i ? { ...x, organization: e.target.value } : x))} placeholder="Organization" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
            <input value={v.role} onChange={e => setVolData(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Role" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
          </div>
        ))}
        <button onClick={() => setVolData(prev => [...prev, { organization: '', role: '', description: '' }])} className="text-[10px] text-teal">+ Add volunteer role</button>
      </SectionToggle>

      {/* Awards */}
      <SectionToggle label="Awards" desc="Industry recognition, hackathon wins, publications." enabled={awdOn} onToggle={() => toggleSection(setAwdOn, awdOn)}>
        {awdData.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input value={a.title} onChange={e => setAwdData(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Award title" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
            <input value={a.issuer} onChange={e => setAwdData(prev => prev.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} placeholder="Issuer" className="flex-1 px-2.5 py-1.5 text-[12px] bg-white border border-border rounded-lg focus:outline-none focus:border-teal" />
          </div>
        ))}
        <button onClick={() => setAwdData(prev => [...prev, { title: '', issuer: '', date: '' }])} className="text-[10px] text-teal">+ Add award</button>
      </SectionToggle>

      <button
        onClick={handleSave}
        className="w-full mt-4 py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark rounded-lg transition-colors"
      >
        Done →
      </button>
    </div>
  )
}

function SectionToggle({
  label, desc, enabled, onToggle, children,
}: {
  label: string; desc: string; enabled: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="p-4 bg-paper rounded-xl border border-border">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-[12px] font-medium text-ink">{label}</span>
          <p className="text-[10px] text-muted/60">{desc}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-teal' : 'bg-border/60'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {enabled && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}
