import { useState, useEffect, useRef } from 'react'
import { IconPlus, IconX, IconAlertTriangle } from '@tabler/icons-react'
import SKILLS_DICT from '../../../data/skills'

interface Props {
  skills: string[]
  targetRole: { role: string; level: string; industry: string; jobDescription?: string } | null
  onSkillsChange: (skills: string[]) => void
  onDone: () => void
}

export default function Step6Skills({ skills, targetRole, onSkillsChange, onDone }: Props) {
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSearchSugg, setShowSearchSugg] = useState(false)

  const fetchedRef = useRef(false)

  // Suggest skills based on target role — local + AI
  useEffect(() => {
    if (!targetRole) return

    // Local suggestions from skills dict
    const roleWords = targetRole.role.toLowerCase().split(/[\s/]+/)
    const localMatches = SKILLS_DICT.filter(s => {
      const sl = s.toLowerCase()
      return roleWords.some(rw => sl.includes(rw)) && !skills.includes(s)
    })
    setSuggestions(localMatches.slice(0, 12))

    // AI-suggested skills (once per role)
    if (!fetchedRef.current && (targetRole.jobDescription || targetRole.industry)) {
      fetchedRef.current = true
      const token = localStorage.getItem('accessToken')
      fetch('/api/builder/suggest-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          resumeId: 'temp',
          targetRole: targetRole.role,
          level: targetRole.level,
          industry: targetRole.industry,
          existingSkills: skills,
          jobDescription: targetRole.jobDescription || undefined,
        }),
      })
        .then(r => r.json())
        .then((body: { data?: string[] }) => {
          if (body.data && Array.isArray(body.data)) {
            const newSkills = body.data.filter(s => !skills.includes(s))
            if (newSkills.length > 0) {
              setSuggestions(prev => {
                const merged = [...new Set([...newSkills, ...prev])]
                return merged.slice(0, 16)
              })
            }
          }
        })
        .catch(() => {})
    }
  }, [targetRole, skills])

  const filteredSearch = search.length > 0
    ? SKILLS_DICT.filter(s => s.toLowerCase().includes(search.toLowerCase()) && !skills.includes(s)).slice(0, 8)
    : []

  // JD keywords not in skills (if JD provided)
  const jdKeywords = targetRole?.jobDescription
    ? extractKeywords(targetRole.jobDescription).filter(k => !skills.some(s => s.toLowerCase() === k.toLowerCase()))
    : []

  return (
    <div className="p-6 space-y-4">
      {/* Already-accepted skills */}
      <div>
        <label className="text-[11px] text-muted mb-2 block font-medium">From what you&apos;ve told us:</label>
        <div className="flex flex-wrap gap-1.5">
          {skills.length === 0 && <span className="text-[11px] text-muted/50">Skills from earlier steps will appear here.</span>}
          {skills.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-teal/10 text-teal rounded-full">
              {s}
              <button onClick={() => onSkillsChange(skills.filter(x => x !== s))} className="hover:text-teal-dark">
                <IconX size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div>
          <label className="text-[11px] text-muted mb-2 block font-medium">We suggest adding these:</label>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => onSkillsChange([...skills, s])}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-muted border border-border rounded-full hover:border-teal/30 hover:text-teal transition-colors"
              >
                <IconPlus size={11} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Missing JD keywords */}
      {jdKeywords.length > 0 && (
        <div>
          <label className="text-[11px] text-danger mb-2 block font-medium flex items-center gap-1">
            <IconAlertTriangle size={12} />
            Suggested missing keywords
          </label>
          <div className="flex flex-wrap gap-1.5">
            {jdKeywords.slice(0, 8).map(k => (
              <button
                key={k}
                onClick={() => onSkillsChange([...skills, k])}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-danger border border-danger/30 rounded-full hover:bg-danger/5 transition-colors"
              >
                <IconPlus size={11} />
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <label className="text-[11px] text-muted mb-1.5 block font-medium">Search for a skill:</label>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setShowSearchSugg(true) }}
          onFocus={() => setShowSearchSugg(true)}
          onBlur={() => setTimeout(() => setShowSearchSugg(false), 200)}
          placeholder="Type to search..."
          className="w-full px-3 py-2 text-[12px] bg-paper border border-border rounded-lg focus:outline-none focus:border-teal transition-colors"
        />
        {showSearchSugg && filteredSearch.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 py-1 max-h-40 overflow-y-auto">
            {filteredSearch.map(s => (
              <button
                key={s}
                onMouseDown={() => { onSkillsChange([...skills, s]); setSearch(''); setShowSearchSugg(false) }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-dark transition-colors text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        disabled={skills.length === 0}
        className="w-full py-2.5 text-[13px] font-medium text-white bg-teal hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Done with skills →
      </button>
    </div>
  )
}

function extractKeywords(text: string): string[] {
  const common = ['react', 'python', 'javascript', 'typescript', 'node.js', 'aws', 'docker',
    'figma', 'sql', 'nosql', 'agile', 'scrum', 'leadership', 'communication',
    'machine learning', 'data analysis', 'product management', 'ui design', 'ux design',
    'api design', 'microservices', 'devops', 'ci/cd', 'testing', 'security',
    'blockchain', 'mobile', 'web', 'analytics', 'reporting',
  ]
  const lower = text.toLowerCase()
  return common.filter(k => lower.includes(k))
}
