import { useState, useEffect } from 'react'
import { useDiscoverPreferences, useUpdateDiscoverPreferences, useResumes } from '../../lib/queries'
import { IconX } from '@tabler/icons-react'

interface PreferencesPanelProps {
  onClose: () => void
}

const COMMON_ROLES = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer',
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'Product Designer', 'UX Designer', 'UI Designer', 'UX/UI Designer',
  'Product Manager', 'Senior Product Manager',
  'Data Scientist', 'Data Engineer', 'ML Engineer',
  'DevOps Engineer', 'SRE', 'Cloud Engineer',
  'Engineering Manager', 'Technical Lead',
  'Solutions Architect', 'Technical Writer',
  'Marketing Manager', 'Growth Marketer',
  'Sales Engineer', 'Account Executive',
]

export default function PreferencesPanel({ onClose }: PreferencesPanelProps) {
  const { data: prefs } = useDiscoverPreferences()
  const { data: resumes } = useResumes()
  const updatePrefs = useUpdateDiscoverPreferences()

  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [resumeId, setResumeId] = useState('')
  const [isRemoteOnly, setIsRemoteOnly] = useState(false)
  const [experienceLevels, setExperienceLevels] = useState<string[]>([])
  const [minMatchScore, setMinMatchScore] = useState(60)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [excludeApplied, setExcludeApplied] = useState(true)
  const [excludeRejected, setExcludeRejected] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!prefs) return
    setTargetRoles(prefs.targetRoles || [])
    setResumeId(prefs.resumeId || '')
    setIsRemoteOnly(prefs.isRemoteOnly || false)
    setExperienceLevels(prefs.experienceLevels || [])
    setMinMatchScore(prefs.minimumMatchScore ?? 60)
    setEmailAlerts(prefs.emailAlertsEnabled || false)
    setExcludeApplied(prefs.excludeApplied !== false)
    setExcludeRejected(prefs.excludeRejected || false)
  }, [prefs])

  const filteredSuggestions = COMMON_ROLES.filter(
    (r) => r.toLowerCase().includes(roleInput.toLowerCase()) && !targetRoles.includes(r),
  ).slice(0, 5)

  const addRole = (role: string) => {
    if (targetRoles.length >= 3 || targetRoles.includes(role)) return
    setTargetRoles([...targetRoles, role])
    setRoleInput('')
    setShowSuggestions(false)
  }

  const removeRole = (role: string) => {
    setTargetRoles(targetRoles.filter((r) => r !== role))
  }

  const toggleExpLevel = (level: string) => {
    setExperienceLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  const handleSave = async () => {
    setSaving(true)
    await updatePrefs.mutateAsync({
      targetRoles,
      resumeId,
      isRemoteOnly,
      experienceLevels,
      minimumMatchScore: minMatchScore,
      emailAlertsEnabled: emailAlerts,
      excludeApplied,
      excludeRejected,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
      <div className="w-full max-w-md bg-surface h-full shadow-modal overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display text-h4 text-ink">Preferences</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink transition-colors">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Target roles */}
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Target role (up to 3)</label>
            <div className="relative">
              <input
                type="text"
                value={roleInput}
                onChange={(e) => { setRoleInput(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g. Product Designer"
                className="input-field"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg shadow-sm max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((r) => (
                    <button
                      key={r}
                      onMouseDown={() => addRole(r)}
                      className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper-dark transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {targetRoles.map((r) => (
                <span key={r} className="badge badge-teal flex items-center gap-1">
                  {r}
                  <button onClick={() => removeRole(r)} className="hover:text-teal-dark">&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Resume</label>
            <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} className="input-field">
              <option value="">Select a resume</option>
              {resumes?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name || r.filename || 'Untitled'} {r.score ? `(${r.score}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Remote */}
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={isRemoteOnly} onChange={(e) => setIsRemoteOnly(e.target.checked)} className="accent-teal" />
            Remote only
          </label>

          {/* Experience level */}
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Experience level</label>
            <div className="flex flex-wrap gap-2">
              {['entry', 'associate', 'mid', 'senior', 'staff'].map((level) => (
                <button
                  key={level}
                  onClick={() => toggleExpLevel(level)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    experienceLevels.includes(level)
                      ? 'bg-teal-light text-teal border-teal/30'
                      : 'bg-surface text-muted border-border hover:text-ink'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Min match score */}
          <div>
            <label className="label-uppercase text-muted mb-1.5 block">Minimum match score: {minMatchScore}%</label>
            <input type="range" min={0} max={100} value={minMatchScore} onChange={(e) => setMinMatchScore(Number(e.target.value))} className="w-full accent-teal" />
          </div>

          {/* Exclude toggles */}
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={excludeApplied} onChange={(e) => setExcludeApplied(e.target.checked)} className="accent-teal" />
            Exclude companies I've applied to
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={excludeRejected} onChange={(e) => setExcludeRejected(e.target.checked)} className="accent-teal" />
            Exclude companies that rejected me
          </label>

          {/* Email alerts */}
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="accent-teal" />
            Daily email digest
          </label>
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
