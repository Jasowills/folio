import { useState } from 'react'
import type { BasicsData } from '../types'

interface Props {
  data: BasicsData | null
  onSave: (data: BasicsData) => void
  onChange?: (partial: Partial<BasicsData>) => void
}

const COMMON_TITLES = [
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

export default function Step1Basics({ data, onSave, onChange }: Props) {
  const [name, setName] = useState(data?.name || '')
  const [headline, setHeadline] = useState(data?.headline || '')
  const [email, setEmail] = useState(data?.email || '')
  const [phone, setPhone] = useState(data?.phone || '')
  const [location, setLocation] = useState(data?.location || '')
  const [linkedin, setLinkedin] = useState(data?.linkedin || '')
  const [github, setGithub] = useState(data?.github || '')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const valid = name.trim().length > 0 && email.trim().length > 0

  const handleSubmit = () => {
    if (!valid) return
    onSave({ name: name.trim(), headline: headline.trim(), email: email.trim(), phone: phone.trim(), location: location.trim(), linkedin: linkedin.trim() || undefined, github: github.trim() || undefined })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && valid) handleSubmit()
  }

  const filteredTitles = COMMON_TITLES.filter(
    t => headline && t.toLowerCase().includes(headline.toLowerCase()) && t !== headline
  ).slice(0, 6)

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="text-[12px] text-muted mb-1.5 block">What&apos;s your name?</label>
        <input
          value={name}
          onChange={e => { const v = e.target.value; setName(v); onChange?.({ name: v }) }}
          onKeyDown={handleKeyDown}
          placeholder="James Okafor"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>

      <div className="relative">
        <label className="text-[12px] text-muted mb-1.5 block">What&apos;s your current or target job title?</label>
        <input
          value={headline}
          onChange={e => { const v = e.target.value; setHeadline(v); setShowSuggestions(true); onChange?.({ headline: v }) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Senior Product Designer"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        {showSuggestions && filteredTitles.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 py-1">
            {filteredTitles.map(t => (
              <button
                key={t}
                onMouseDown={() => { setHeadline(t); setShowSuggestions(false) }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark transition-colors text-ink"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => { const v = e.target.value; setEmail(v); onChange?.({ email: v }) }}
          onKeyDown={handleKeyDown}
          placeholder="james@example.com"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={e => { const v = e.target.value; setPhone(v); onChange?.({ phone: v }) }}
          placeholder="+1 555 0123"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Location</label>
        <input
          value={location}
          onChange={e => { const v = e.target.value; setLocation(v); onChange?.({ location: v }) }}
          placeholder="San Francisco, CA"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        <p className="text-[10px] text-muted/60 mt-1">City and country is enough — you don&apos;t need your full address.</p>
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">LinkedIn URL <span className="text-muted/50">(optional)</span></label>
        <input
          value={linkedin}
          onChange={e => { const v = e.target.value; setLinkedin(v); onChange?.({ linkedin: v }) }}
          placeholder="https://linkedin.com/in/jamesokar/"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>

      <div>
        <label className="text-[12px] text-muted mb-1.5 block">Portfolio or GitHub <span className="text-muted/50">(optional)</span></label>
        <input
          value={github}
          onChange={e => { const v = e.target.value; setGithub(v); onChange?.({ github: v }) }}
          placeholder="https://github.com/jamesokar/"
          className="w-full px-3 py-2 text-[13px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!valid}
        className="w-full mt-2 py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}
