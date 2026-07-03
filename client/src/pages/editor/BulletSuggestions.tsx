import { useState, useEffect, useRef } from 'react'
import { IconPlus, IconLoader2 } from '@tabler/icons-react'
import { cn } from '../../lib/utils'

const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'Engineering Manager', 'Senior Engineering Manager',
  'Product Manager', 'Senior Product Manager', 'Product Owner',
  'Data Scientist', 'Senior Data Scientist', 'Machine Learning Engineer',
  'DevOps Engineer', 'Senior DevOps Engineer', 'SRE',
  'UX Designer', 'UI Designer', 'Product Designer', 'Senior Product Designer',
  'Design Lead', 'Creative Director', 'Art Director',
  'Technical Writer', 'Content Strategist', 'Copywriter',
  'Marketing Manager', 'Senior Marketing Manager', 'Growth Lead',
  'Sales Manager', 'Account Executive', 'BDR', 'SDR',
  'Consultant', 'Senior Consultant', 'Managing Consultant',
  'Project Manager', 'Senior Project Manager', 'Program Manager',
  'Business Analyst', 'Senior Business Analyst',
  'Data Analyst', 'Senior Data Analyst', 'Business Intelligence Analyst',
  'Solutions Architect', 'Enterprise Architect', 'Technical Architect',
  'CTO', 'VP of Engineering', 'VP of Product', 'CEO', 'COO',
  'Chief of Staff', 'Operations Manager',
  'Financial Analyst', 'Investment Analyst', 'Accountant',
  'HR Manager', 'HR Business Partner', 'Recruiter',
  'Customer Success Manager', 'Account Manager',
  'QA Engineer', 'SDET', 'Test Engineer',
  'Security Engineer', 'Security Analyst',
  'Database Administrator', 'Systems Administrator',
  'Network Engineer', 'Cloud Engineer', 'Platform Engineer',
  'Research Scientist', 'Research Assistant', 'Postdoctoral Researcher',
  'Professor', 'Associate Professor', 'Teaching Assistant',
  'Intern', 'Graduate Intern', 'Summer Associate',
].sort()

const LEVEL_KEYWORDS: Record<string, string> = {
  senior: 'Senior', lead: 'Senior', staff: 'Senior', principal: 'Senior',
  vp: 'Executive', chief: 'Executive', director: 'Executive', head: 'Executive',
  junior: 'Entry', associate: 'Entry', intern: 'Entry', graduate: 'Entry',
}

function detectLevel(title: string): string {
  const lower = title.toLowerCase()
  for (const [keyword, level] of Object.entries(LEVEL_KEYWORDS)) {
    if (lower.includes(keyword)) return level
  }
  return 'Mid'
}

interface Props {
  jobTitle: string
  onTitleChange: (title: string) => void
  onAddBullet: (bullet: string) => void
}

const SUGGESTION_CACHE = new Map<string, string[]>()

const SUGGESTION_PROMPTS: Record<string, string[]> = {
  'Software Engineer': [
    'Designed and implemented a microservices architecture that reduced API latency by 40%',
    'Led a team of 4 engineers to migrate legacy monolith to cloud-native infrastructure on AWS',
    'Built CI/CD pipelines using GitHub Actions, reducing deployment time from 2 hours to 15 minutes',
    'Optimized database queries resulting in 60% improvement in page load times',
    'Mentored 3 junior engineers through structured code reviews and pair programming sessions',
  ],
  'Senior Software Engineer': [
    'Architected and delivered a distributed event-driven system processing 10M+ events daily',
    'Reduced system downtime from 99.5% to 99.99% through comprehensive observability and automated recovery',
    'Led cross-functional migration of 12 microservices from EC2 to Kubernetes, saving $200K/year in infrastructure costs',
    'Established engineering standards and code review processes adopted by 50+ engineers across 8 teams',
    'Drove technical strategy for platform re-architecture, improving developer velocity by 3x',
  ],
  'Product Manager': [
    'Launched 3 major product features that drove 35% increase in monthly active users',
    'Owned product roadmap for B2B SaaS platform serving 500+ enterprise customers',
    'Conducted 50+ user interviews per quarter, translating insights into prioritized feature backlog',
    'Collaborated with engineering to reduce feature delivery time from 6 weeks to 2 weeks',
    'Defined and tracked OKRs that improved net revenue retention from 90% to 120%',
  ],
  'Senior Product Manager': [
    'Defined product strategy for $15M ARR platform, delivering 40% YoY revenue growth',
    'Led 3 cross-functional product teams through complete product lifecycle from discovery to launch',
    'Established data-driven decision-making framework adopted across the entire product organization',
    'Negotiated strategic partnerships with 5 key vendors, reducing COGS by 25%',
    'Mentored 2 product managers through promotion track, one promoted to Senior PM within 18 months',
  ],
  'Engineering Manager': [
    'Managed and grew a team of 8 engineers, achieving 95% retention rate over 2 years',
    'Improved sprint velocity by 60% through implementation of agile best practices and team restructuring',
    'Drove engineering roadmap aligned with business goals, delivering 30+ features on schedule',
    'Reduced production incidents by 70% through investment in testing infrastructure and on-call processes',
    'Built performance review system that identified and developed 3 engineers for promotion',
  ],
  'Data Scientist': [
    'Developed ML models predicting customer churn with 94% accuracy, saving $2M annually',
    'Built real-time recommendation engine that increased conversion rate by 22%',
    'Designed A/B testing framework used across 15 product teams, improving experiment velocity by 3x',
    'Created automated reporting dashboard used by C-suite for weekly business reviews',
    'Reduced fraud detection false positive rate from 8% to 2% through ensemble modeling approach',
  ],
}

function getFallbackSuggestions(title: string): string[] {
  const level = detectLevel(title)
  const prefix = level === 'Senior' || level === 'Executive'
    ? 'Led the design and implementation of '
    : level === 'Entry'
    ? 'Assisted in the development of '
    : 'Developed and maintained '
  return [
    `${prefix}key features for the ${title} team, improving user satisfaction by 25%`,
    `Collaborated with cross-functional teams to deliver projects on time and under budget`,
    `Optimised existing processes resulting in 30% efficiency improvement`,
    `Documented and maintained technical specifications for ${title.toLowerCase()} projects`,
    `Participated in agile ceremonies including daily standups, sprint planning, and retrospectives`,
  ]
}

export default function BulletSuggestions({ jobTitle, onTitleChange, onAddBullet }: Props) {
  const [inputValue, setInputValue] = useState(jobTitle)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredTitles, setFilteredTitles] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(jobTitle)
  }, [jobTitle])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInputChange(value: string) {
    setInputValue(value)
    setShowSuggestions(false)
    onTitleChange(value)

    if (value.length > 0) {
      const matches = JOB_TITLES.filter(t => t.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
      setFilteredTitles(matches)
      setShowDropdown(matches.length > 0)
      setSelectedIdx(-1)
    } else {
      setFilteredTitles([])
      setShowDropdown(false)
    }

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    suggestionTimerRef.current = setTimeout(() => {
      if (value.length > 2) {
        loadSuggestions(value)
      }
    }, 800)
  }

  function selectTitle(title: string) {
    setInputValue(title)
    setShowDropdown(false)
    onTitleChange(title)
    loadSuggestions(title)
  }

  function loadSuggestions(title: string) {
    const cached = SUGGESTION_CACHE.get(title.toLowerCase())
    if (cached) {
      setSuggestions(cached)
      setShowSuggestions(true)
      return
    }

    setLoading(true)
    const matched = SUGGESTION_PROMPTS[title] || getFallbackSuggestions(title)
    setTimeout(() => {
      SUGGESTION_CACHE.set(title.toLowerCase(), matched)
      setSuggestions(matched)
      setShowSuggestions(true)
      setLoading(false)
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, filteredTitles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault()
      selectTitle(filteredTitles[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <label className="label-uppercase text-muted block mb-1">Job Title</label>
        <input
          ref={inputRef}
          className="w-full bg-transparent border-0 border-b border-border py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:outline-none focus:border-teal transition-colors"
          placeholder="e.g. Senior Software Engineer"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowDropdown(filteredTitles.length > 0)}
        />
        {showDropdown && filteredTitles.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
            {filteredTitles.map((title, i) => (
              <button
                key={title}
                onClick={() => selectTitle(title)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer',
                  i === selectedIdx ? 'bg-teal-light/20 text-teal' : 'text-ink hover:bg-paper-dark',
                )}
              >
                {title}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="border border-border rounded-lg bg-paper overflow-hidden">
          <div className="px-3 py-2 bg-paper-dark border-b border-border">
            <p className="text-[10px] font-medium text-muted">
              Suggestions for <span className="text-ink">{inputValue || jobTitle}</span>
              {loading && <IconLoader2 className="h-3 w-3 inline ml-1 animate-spin text-teal" />}
            </p>
          </div>
          <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 group hover:bg-paper-dark transition-colors">
                <p className="flex-1 text-[11px] text-muted leading-relaxed">{s}</p>
                <button
                  onClick={() => onAddBullet(s)}
                  className="shrink-0 p-0.5 rounded text-muted hover:text-teal hover:bg-teal-light/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer mt-0.5"
                  title="Add bullet"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
