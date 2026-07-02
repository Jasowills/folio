import { useState, useRef } from 'react'
import { useDiscoverPreferences, useUpdateDiscoverPreferences, useResumes, useUploadResume } from '../../lib/queries'

interface SetupCardProps {
  onComplete: () => void
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

export default function SetupCard({ onComplete }: SetupCardProps) {
  const { data: resumes } = useResumes()
  const updatePrefs = useUpdateDiscoverPreferences()
  const uploadResume = useUploadResume()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [resumeId, setResumeId] = useState('')
  const [preferredLocations, setPreferredLocations] = useState<string[]>([])
  const [isRemoteOnly, setIsRemoteOnly] = useState(true)
  const [experienceLevels, setExperienceLevels] = useState<string[]>([])
  const [minMatchScore, setMinMatchScore] = useState(60)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const bestResume = resumes?.sort((a, b) => (b.score || 0) - (a.score || 0))[0]

  const handleUploadResume = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadResume.mutateAsync(file)
    setResumeId(result._id)
    setUploading(false)
  }

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

  const toggleLocation = (loc: string) => {
    setPreferredLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    )
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
      resumeId: resumeId || bestResume?._id || '',
      preferredLocations,
      isRemoteOnly,
      experienceLevels,
      minimumMatchScore: minMatchScore,
      emailAlertsEnabled: emailAlerts,
    })
    setSaving(false)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-modal max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-display text-h3 text-ink mb-1">Set up your Discover feed</h2>
        <p className="text-sm text-muted mb-6">
          Tell us what you're looking for and we'll find roles that match your resume.
        </p>

        {/* Target roles */}
        <div className="mb-4">
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
        <div className="mb-4">
          <label className="label-uppercase text-muted mb-1.5 block">Resume to match against</label>
          {resumes && resumes.length > 0 ? (
            <select
              value={resumeId || bestResume?._id || ''}
              onChange={(e) => setResumeId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a resume</option>
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name || r.filename || 'Untitled'} {r.score ? `(${r.score}%)` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-paper border border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted mb-2">No resumes uploaded yet</p>
              <button
                type="button"
                onClick={handleUploadResume}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload your resume'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="label-uppercase text-muted mb-1.5 block">Location</label>
          <label className="flex items-center gap-2 text-sm text-ink mb-2 cursor-pointer">
            <input type="checkbox" checked={isRemoteOnly} onChange={(e) => setIsRemoteOnly(e.target.checked)} className="accent-teal" />
            Remote only
          </label>
          {!isRemoteOnly && (
            <input
              type="text"
              placeholder="City or country"
              className="input-field"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                  toggleLocation((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          )}
        </div>

        {/* Experience level */}
        <div className="mb-4">
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
        <div className="mb-4">
          <label className="label-uppercase text-muted mb-1.5 block">
            Minimum match score: {minMatchScore}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(Number(e.target.value))}
            className="w-full accent-teal"
          />
          <p className="text-[11px] text-muted mt-1">
            Jobs below this threshold still appear but are visually deprioritized.
          </p>
        </div>

        {/* Email alerts */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="accent-teal" />
            Receive daily email digest of new high-match jobs
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onComplete}
            className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || targetRoles.length === 0}
            className="px-5 py-2 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Start discovering'}
          </button>
        </div>
      </div>
    </div>
  )
}
