import { useState } from 'react'
import type { TargetRoleData } from '../types'

interface Props {
  data: TargetRoleData | null
  onSave: (data: TargetRoleData) => void
  onChange?: (partial: Partial<TargetRoleData>) => void
}

const COMMON_ROLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Product Designer', 'Senior Product Designer', 'UX Designer', 'UI Designer',
  'Product Manager', 'Senior Product Manager', 'Engineering Manager',
  'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'SRE', 'Cloud Architect',
  'Marketing Manager', 'Growth Lead', 'Content Strategist',
  'Sales Executive', 'Account Executive', 'Business Development',
  'Consultant', 'Analyst', 'Associate', 'Director', 'VP',
  'CEO', 'CTO', 'COO', 'Founder', 'Co-Founder',
  'Graphic Designer', 'Art Director', 'Creative Director',
  'Financial Analyst', 'Investment Analyst', 'Accountant',
  'HR Manager', 'Recruiter', 'Operations Manager',
]

const LEVELS = ['Entry Level', 'Associate', 'Mid Level', 'Senior', 'Staff / Principal']
const INDUSTRIES = ['Technology', 'Design', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Operations', 'Education', 'Legal', 'Other']

export default function Step2TargetRole({ data, onSave, onChange }: Props) {
  const [role, setRole] = useState(data?.role || '')
  const [level, setLevel] = useState(data?.level || '')
  const [industry, setIndustry] = useState(data?.industry || '')
  const [company, setCompany] = useState(data?.company || '')
  const [companyUrl, setCompanyUrl] = useState(data?.companyUrl || '')
  const [jobDescription, setJobDescription] = useState(data?.jobDescription || '')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const valid = role.trim().length > 0 && level.length > 0 && industry.length > 0

  const filteredRoles = COMMON_ROLES.filter(
    t => role && t.toLowerCase().includes(role.toLowerCase()) && t !== role
  ).slice(0, 6)

  return (
    <div className="p-6 space-y-4">
      <div className="relative">
        <label className="text-[12px] text-muted mb-1.5 block">What kind of role are you building this resume for?</label>
        <input
          value={role}
          onChange={e => { const v = e.target.value; setRole(v); setShowSuggestions(true); onChange?.({ role: v }) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Senior Product Designer"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        {showSuggestions && filteredRoles.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 py-1">
            {filteredRoles.map(t => (
              <button
                key={t}
                onMouseDown={() => { setRole(t); setShowSuggestions(false) }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark transition-colors text-ink"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-[12px] text-muted mb-2 block">What level?</label>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => { setLevel(l); onChange?.({ level: l }) }}
              className={`px-3 py-1.5 text-[11px] rounded-full border transition-colors ${
                level === l
                  ? 'bg-teal text-white border-teal'
                  : 'bg-white text-muted border-border hover:border-teal/30'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Which industry?</label>
        <select
          value={industry}
          onChange={e => { const v = e.target.value; setIndustry(v); onChange?.({ industry: v }) }}
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors appearance-none"
        >
          <option value="">Select an industry...</option>
          {INDUSTRIES.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Is this for a specific company? <span className="text-muted/50">(optional)</span></label>
        <input
          value={company}
          onChange={e => { const v = e.target.value; setCompany(v); onChange?.({ company: v }) }}
          placeholder="Figma"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        {company && (
          <input
            value={companyUrl}
            onChange={e => { const v = e.target.value; setCompanyUrl(v); onChange?.({ companyUrl: v }) }}
            placeholder="Company URL (optional)"
            className="w-full mt-2 px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
          />
        )}
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Any specific job description to tailor this to? <span className="text-muted/50">(optional)</span></label>
        <textarea
          value={jobDescription}
          onChange={e => { const v = e.target.value; setJobDescription(v); onChange?.({ jobDescription: v }) }}
          placeholder="Paste the full job description here. The AI will tailor every section to match the keywords and requirements."
          rows={4}
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors resize-none"
        />
      </div>

      <button
        onClick={() => onSave({ role: role.trim(), level, industry, company: company.trim() || undefined, companyUrl: companyUrl.trim() || undefined, jobDescription: jobDescription.trim() || undefined })}
        disabled={!valid}
        className="w-full mt-2 py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}
