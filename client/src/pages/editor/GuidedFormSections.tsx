import { useState } from 'react'
import type { LocalData, SkillEntry } from './types'
import { SECTION_TIPS } from './types'
import { cn } from '../../lib/utils'
import BulletSuggestions from './BulletSuggestions'
import { IconInfoCircle, IconWand, IconPlus, IconX, IconChevronDown, IconSparkles } from '@tabler/icons-react'

interface Props {
  localData: LocalData
  onUpdate: (data: LocalData) => void
  onUpdateLocal: <K extends keyof LocalData>(key: K, value: LocalData[K]) => void
  onUpdateContact: (field: keyof LocalData['contact'], value: string) => void
  onUpdateExperience: (index: number, field: string, value: string | boolean) => void
  onUpdateBullet: (jobIdx: number, bulletIdx: number, value: string) => void
  onAddBullet: (jobIdx: number) => void
  onAddBulletText: (jobIdx: number, text: string) => void
  onAddExperience: () => void
  onRemoveExperience: (index: number) => void
  onUpdateEducation: (index: number, field: string, value: string) => void
  onAddEducation: () => void
  onRemoveEducation: (index: number) => void
  onOpenAiDrawer: (jobIdx: number, bulletIdx: number) => void
  expandedJobs: Set<number>
  onToggleJobExpanded: (index: number) => void
  onSkillChange: (skills: SkillEntry[]) => void
  onAddCertification: () => void
  onUpdateCertification: (index: number, field: string, value: string) => void
  onRemoveCertification: (index: number) => void
  onAddLanguage: () => void
  onUpdateLanguage: (index: number, value: string) => void
  onRemoveLanguage: (index: number) => void
  onAddLink: () => void
  onUpdateLink: (index: number, field: string, value: string) => void
  onRemoveLink: (index: number) => void
  redFlags: Array<{ message: string; severity: 'low' | 'medium' | 'high'; section?: string }>
  activeTab: string
}

interface WithExpanded extends Props {
  expandedJobs: Set<number>
  onToggleJobExpanded: (index: number) => void
}

function TipPanel({ section }: { section: string }) {
  const [open, setOpen] = useState(false)
  const tips = SECTION_TIPS[section]
  if (!tips) return null
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 text-[10px] font-medium transition-colors cursor-pointer',
          open ? 'text-teal' : 'text-muted hover:text-ink',
        )}
      >
        <IconInfoCircle className="h-3 w-3" />
        Tips for this section
        <IconChevronDown className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-teal-light/10 border border-teal/20 space-y-1.5">
          {tips.map((tip, i) => (
            <p key={i} className="text-[11px] text-muted leading-relaxed pl-3 border-l-2 border-teal/30">{tip}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillsInput({ localData, onChange }: { localData: LocalData; onChange: (skills: SkillEntry[]) => void }) {
  const [input, setInput] = useState('')
  const [showProficiency, setShowProficiency] = useState(false)
  const [groupByCategory, setGroupByCategory] = useState(false)
  const skillCategories = [...new Set(localData.skills.filter(s => s.category).map(s => s.category!))]

  function addSkill() {
    const trimmed = input.trim()
    if (!trimmed) return
    const existing = localData.skills.find(s => s.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return
    onChange([...localData.skills, { name: trimmed, category: '', proficiency: 'proficient' }])
    setInput('')
  }

  function removeSkill(index: number) {
    onChange(localData.skills.filter((_, i) => i !== index))
  }

  function setSkillCategory(index: number, category: string) {
    const updated = [...localData.skills]
    updated[index] = { ...updated[index], category }
    onChange(updated)
  }

  function setSkillProficiency(index: number, proficiency: 'learning' | 'proficient' | 'expert') {
    const updated = [...localData.skills]
    updated[index] = { ...updated[index], proficiency }
    onChange(updated)
  }

  const groupedSkills = groupByCategory
    ? skillCategories.map(cat => ({
        category: cat,
        skills: localData.skills.filter(s => s.category === cat),
      })).concat(
        localData.skills.some(s => !s.category)
          ? [{ category: 'Other', skills: localData.skills.filter(s => !s.category) }]
          : [],
      )
    : [{ category: '', skills: localData.skills }]

  return (
    <div className="p-5 space-y-3">
      <TipPanel section="skills" />
      <div className="flex gap-2">
        <input
          className="flex-1 bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
          placeholder="Type a skill and press Enter"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
        />
        <button
          onClick={addSkill}
          disabled={!input.trim()}
          className="px-2.5 py-1 rounded-lg bg-teal text-white text-[11px] font-medium hover:bg-teal-dark disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          Add
        </button>
      </div>

      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={groupByCategory}
            onChange={e => setGroupByCategory(e.target.checked)}
            className="rounded border-border"
          />
          Group by category
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showProficiency}
            onChange={e => setShowProficiency(e.target.checked)}
            className="rounded border-border"
          />
          Show proficiency
        </label>
      </div>

      {groupedSkills.map((group, gi) => (
        <div key={gi}>
          {group.category && (
            <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">{group.category}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {group.skills.map((skill, i) => {
              const globalIdx = localData.skills.indexOf(skill)
              return (
                <div key={i} className="group relative flex items-center gap-1 px-2 py-1 rounded-full text-[11px]" style={{ backgroundColor: '#0F6E561A', color: '#0F6E56' }}>
                  <span>{skill.name}</span>
                  {groupByCategory && (
                    <input
                      className="w-16 bg-transparent border-0 border-b border-teal/30 text-[9px] text-muted placeholder:text-muted/50 focus:outline-none"
                      placeholder="Category"
                      value={skill.category || ''}
                      onChange={e => setSkillCategory(globalIdx, e.target.value)}
                    />
                  )}
                  {showProficiency && (
                    <div className="flex gap-0.5 ml-0.5">
                      {(['learning', 'proficient', 'expert'] as const).map((level, li) => (
                        <button
                          key={level}
                          onClick={() => setSkillProficiency(globalIdx, level)}
                          className={cn(
                            'h-2 w-2 rounded-full transition-colors cursor-pointer',
                            skill.proficiency === level ? 'bg-teal' : 'bg-border hover:bg-muted',
                          )}
                          title={level}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => removeSkill(globalIdx)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all ml-0.5 cursor-pointer"
                  >
                    <IconX className="h-2.5 w-2.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {localData.skills.length > 0 && (
        <button className="flex items-center gap-1 text-[10px] text-muted hover:text-teal transition-colors cursor-pointer">
          <IconSparkles className="h-3 w-3" />
          Suggest missing skills
        </button>
      )}
    </div>
  )
}

export function SummarySection({ localData, onUpdateLocal, onUpdateContact }: {
  localData: LocalData
  onUpdateLocal: <K extends keyof LocalData>(key: K, value: LocalData[K]) => void
  onUpdateContact: (field: keyof LocalData['contact'], value: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-[1_1_50%] min-h-0 p-5 flex flex-col">
        <TipPanel section="summary" />
        <label className="label-uppercase text-muted block mb-2 shrink-0">Professional Summary</label>
        <textarea
          className="input-editorial resize-none flex-1 min-h-0"
          placeholder="Write a brief summary of your professional background..."
          value={localData.summary}
          onChange={e => onUpdateLocal('summary', e.target.value)}
        />
      </div>
      <div className="flex-[1_1_50%] min-h-0 p-5 flex flex-col gap-4 overflow-y-auto border-t border-border">
        <div>
          <label className="label-uppercase text-muted block mb-1.5">Name</label>
          <input
            className="input-editorial"
            placeholder="Your full name"
            value={localData.name}
            onChange={e => onUpdateLocal('name', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">Email</label>
          <input
            className="input-editorial"
            type="email"
            placeholder="email@example.com"
            value={localData.contact.email}
            onChange={e => onUpdateContact('email', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">Phone</label>
          <input
            className="input-editorial"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={localData.contact.phone}
            onChange={e => onUpdateContact('phone', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">Location</label>
          <input
            className="input-editorial"
            placeholder="City, State"
            value={localData.contact.location}
            onChange={e => onUpdateContact('location', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">LinkedIn</label>
          <input
            className="input-editorial"
            placeholder="linkedin.com/in/yourprofile"
            value={localData.contact.linkedin || ''}
            onChange={e => onUpdateContact('linkedin', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">Website</label>
          <input
            className="input-editorial"
            placeholder="yourwebsite.com"
            value={localData.contact.website || ''}
            onChange={e => onUpdateContact('website', e.target.value)}
          />
        </div>
        <div>
          <label className="label-uppercase text-muted block mb-1.5">GitHub</label>
          <input
            className="input-editorial"
            placeholder="github.com/yourhandle"
            value={localData.contact.github || ''}
            onChange={e => onUpdateContact('github', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export function ExperienceSection({
  localData, expandedJobs, onToggleJobExpanded, onUpdateExperience, onUpdateBullet, onAddBullet, onAddBulletText, onAddExperience, onRemoveExperience, onOpenAiDrawer, redFlags,
}: WithExpanded) {
  return (
    <div className="p-4 space-y-3">
      <TipPanel section="experience" />
      {localData.experience.map((exp, i) => {
        const isOpen = expandedJobs.has(i)
        const hasFlagged = redFlags.some(rf => rf.section?.toLowerCase() === 'experience')
        return (
          <div key={i} className={cn('rounded-lg border border-border bg-paper overflow-hidden transition-shadow', hasFlagged && 'border-amber/40')}>
            <div className="flex items-center">
              <button
                onClick={() => onToggleJobExpanded(i)}
                className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-paper-dark/30 transition-colors cursor-pointer min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink truncate">{exp.title || 'Job Title'}</p>
                  <p className="text-[11px] text-muted truncate">
                    {exp.company || 'Company'}{exp.startDate || exp.endDate ? ` · ${exp.startDate || ''}${exp.startDate && (exp.endDate || exp.current) ? ' — ' : ''}${exp.current ? 'Present' : exp.endDate || ''}` : ''}
                  </p>
                </div>
                <IconChevronDown className={cn('h-3.5 w-3.5 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              <button
                onClick={() => onRemoveExperience(i)}
                className="p-3 text-muted hover:text-danger transition-colors shrink-0 cursor-pointer"
                title="Remove experience"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </div>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <BulletSuggestions
                    jobTitle={exp.title}
                    onTitleChange={t => onUpdateExperience(i, 'title', t)}
                    onAddBullet={b => onAddBulletText(i, b)}
                  />
                  <div>
                    <label className="label-uppercase text-muted block mb-1">Company</label>
                    <input
                      className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                      placeholder="Company name"
                      value={exp.company}
                      onChange={e => onUpdateExperience(i, 'company', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-uppercase text-muted block mb-1">Start Date</label>
                    <input
                      className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                      placeholder="e.g. Jan 2020"
                      value={exp.startDate}
                      onChange={e => onUpdateExperience(i, 'startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label-uppercase text-muted block mb-1">End Date</label>
                    <input
                      className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                      placeholder="e.g. Dec 2022"
                      value={exp.current ? '' : exp.endDate}
                      onChange={e => onUpdateExperience(i, 'endDate', e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={e => onUpdateExperience(i, 'current', e.target.checked)}
                    className="rounded border-border"
                  />
                  I currently work here
                </label>
                <div>
                  <label className="label-uppercase text-muted block mb-1">Bullets</label>
                  <div className="space-y-1.5">
                    {exp.bullets.map((bullet, j) => (
                      <div key={j} className="flex items-center gap-2 px-2 py-1 rounded group">
                        <span className="text-muted text-xs shrink-0">•</span>
                        <input
                          className="flex-1 bg-transparent border-0 border-b border-border py-1 text-[12px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                          placeholder="Describe your responsibility or achievement..."
                          value={bullet}
                          onChange={e => onUpdateBullet(i, j, e.target.value)}
                        />
                        <button
                          title="Rewrite with AI"
                          onClick={() => onOpenAiDrawer(i, j)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-teal transition-all shrink-0 cursor-pointer"
                        >
                          <IconWand className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onAddBullet(i)}
                    className="mt-2 text-[11px] text-muted hover:text-ink transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <IconPlus className="h-3 w-3" />
                    Add bullet
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <button
        onClick={onAddExperience}
        className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add experience
      </button>
    </div>
  )
}

export function EducationSection({ localData, onAddEducation, onRemoveEducation, onUpdateEducation }: Props) {
  return (
    <div className="p-4 space-y-3">
      <TipPanel section="education" />
      {localData.education.map((edu, i) => (
        <div key={i} className="rounded-lg border border-border bg-paper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Education {i + 1}</p>
            <button
              onClick={() => onRemoveEducation(i)}
              className="p-1 text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label className="label-uppercase text-muted block mb-1">Institution</label>
            <input
              className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
              placeholder="University or school name"
              value={edu.institution}
              onChange={e => onUpdateEducation(i, 'institution', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-uppercase text-muted block mb-1">Degree</label>
              <input
                className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                placeholder="e.g. Bachelor of Science"
                value={edu.degree}
                onChange={e => onUpdateEducation(i, 'degree', e.target.value)}
              />
            </div>
            <div>
              <label className="label-uppercase text-muted block mb-1">Field</label>
              <input
                className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
                placeholder="e.g. Computer Science"
                value={edu.field}
                onChange={e => onUpdateEducation(i, 'field', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onAddEducation}
        className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add education
      </button>
    </div>
  )
}

export function SkillsSection({ localData, onSkillChange }: { localData: LocalData; onSkillChange: (skills: SkillEntry[]) => void }) {
  return <SkillsInput localData={localData} onChange={onSkillChange} />
}

export function CertificationsSection({ localData, onAddCertification, onUpdateCertification, onRemoveCertification }: Props) {
  return (
    <div className="p-4 space-y-3">
      <TipPanel section="certifications" />
      {localData.certifications.map((cert, i) => (
        <div key={i} className="rounded-lg border border-border bg-paper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Certification {i + 1}</p>
            <button
              onClick={() => onRemoveCertification(i)}
              className="p-1 text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label className="label-uppercase text-muted block mb-1">Name</label>
            <input
              className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
              placeholder="Certification name"
              value={cert.name}
              onChange={e => onUpdateCertification(i, 'name', e.target.value)}
            />
          </div>
          <div>
            <label className="label-uppercase text-muted block mb-1">Issuer</label>
            <input
              className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
              placeholder="Issuing organization"
              value={cert.issuer}
              onChange={e => onUpdateCertification(i, 'issuer', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button
        onClick={onAddCertification}
        className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add certification
      </button>
    </div>
  )
}

export function LanguagesSection({ localData, onAddLanguage, onUpdateLanguage, onRemoveLanguage }: Props) {
  return (
    <div className="p-4 space-y-3">
      <TipPanel section="languages" />
      {localData.languages.map((lang, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="text-muted text-xs">•</span>
          <input
            className="flex-1 bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
            placeholder="Language"
            value={lang}
            onChange={e => onUpdateLanguage(i, e.target.value)}
          />
          <button
            onClick={() => onRemoveLanguage(i)}
            className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition-all cursor-pointer"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={onAddLanguage}
        className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add language
      </button>
    </div>
  )
}

export function LinksSection({ localData, onAddLink, onUpdateLink, onRemoveLink }: Props) {
  return (
    <div className="p-4 space-y-3">
      <TipPanel section="links" />
      {localData.links.map((link, i) => (
        <div key={i} className="rounded-lg border border-border bg-paper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Link {i + 1}</p>
            <button
              onClick={() => onRemoveLink(i)}
              className="p-1 text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label className="label-uppercase text-muted block mb-1">Title</label>
            <input
              className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
              placeholder="e.g. Portfolio, GitHub, LinkedIn"
              value={link.title}
              onChange={e => onUpdateLink(i, 'title', e.target.value)}
            />
          </div>
          <div>
            <label className="label-uppercase text-muted block mb-1">URL</label>
            <input
              className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
              placeholder="https://"
              value={link.url}
              onChange={e => onUpdateLink(i, 'url', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button
        onClick={onAddLink}
        className="w-full py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Add link
      </button>
    </div>
  )
}
