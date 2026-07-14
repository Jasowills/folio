import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconUser, IconKey, IconBrandGoogle, IconAlertTriangle, IconCircleCheck,
  IconPalette, IconDownload, IconBell, IconKeyboard,
  IconSun, IconMoon, IconDeviceDesktop,
  IconMail, IconShield, IconFileText, IconBrain, IconSparkles,
  IconLogout
} from '@tabler/icons-react'
import { useAuth } from '../hooks/useAuth'
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '../lib/queries'
import { useResumes } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { showToast } from '../components/ui/toast'
import api from '../lib/api'

type Tab = 'account' | 'appearance' | 'ai' | 'export' | 'notifications' | 'shortcuts' | 'danger'

interface TabDef {
  id: Tab
  label: string
  icon: typeof IconUser
  description: string
  danger?: boolean
}

const TABS: TabDef[] = [
  { id: 'account', label: 'Account', icon: IconUser, description: 'Profile and sign-in' },
  { id: 'appearance', label: 'Appearance', icon: IconPalette, description: 'Theme and display' },
  { id: 'ai', label: 'AI Assistant', icon: IconBrain, description: 'AI behavior and model' },
  { id: 'export', label: 'Export', icon: IconDownload, description: 'PDF and document settings' },
  { id: 'notifications', label: 'Notifications', icon: IconBell, description: 'Email and alerts' },
  { id: 'shortcuts', label: 'Shortcuts', icon: IconKeyboard, description: 'Keyboard shortcuts' },
  { id: 'danger', label: 'Danger Zone', icon: IconAlertTriangle, description: 'Delete and data', danger: true },
]

const SHORTCUTS = [
  { keys: ['⌘', 'S'], label: 'Save changes' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['⌘', 'Z'], label: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['⌘', 'E'], label: 'Export PDF' },
  { keys: ['⌘', '1'], label: 'Open Styles panel' },
  { keys: ['⌘', '2'], label: 'Open Sections panel' },
  { keys: ['⌘', '3'], label: 'Open AI panel' },
  { keys: ['⌘', '⌫'], label: 'Delete section' },
  { keys: ['Esc'], label: 'Close panels' },
]

const ACCENT_COLORS = [
  { name: 'Teal', value: '#0F6E56' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Burgundy', value: '#722F37' },
  { name: 'Forest', value: '#2D5A27' },
  { name: 'Amber', value: '#BA7517' },
  { name: 'Slate', value: '#475569' },
  { name: 'Plum', value: '#5B21B6' },
  { name: 'Cobalt', value: '#1E40AF' },
]

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-teal' : 'bg-border'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }: { icon: typeof IconUser; title: string; description: string }) {
  return (
    <div className="px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal/8 flex items-center justify-center">
          <Icon size={16} className="text-teal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-[11px] text-muted leading-tight">{description}</p>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, description, children, border = true }: {
  label: string
  description?: string
  children: React.ReactNode
  border?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-6 px-6 py-4 ${border ? 'border-b border-border-light' : ''}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {description && <p className="text-[11px] text-muted mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user, setUser, logout } = useAuth()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()
  const { data: resumes } = useResumes()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

  // Appearance state (localStorage-persisted)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (localStorage.getItem('settings:theme') as 'light' | 'dark' | 'system') || 'light'
  )
  const [accentColor, setAccentColor] = useState(() =>
    localStorage.getItem('settings:accent') || '#0F6E56'
  )
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() =>
    (localStorage.getItem('settings:fontSize') as 'sm' | 'md' | 'lg') || 'md'
  )
  const [compactMode, setCompactMode] = useState(() =>
    localStorage.getItem('settings:compact') === 'true'
  )

  // AI state (localStorage-persisted)
  const [aiStreaming, setAiStreaming] = useState(() =>
    localStorage.getItem('settings:aiStreaming') !== 'false'
  )
  const [aiAutoApply, setAiAutoApply] = useState(() =>
    localStorage.getItem('settings:aiAutoApply') === 'true'
  )
  const [aiModel, setAiModel] = useState(() =>
    localStorage.getItem('settings:aiModel') || 'qwen2.5:7b'
  )

  // Export state
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>(() =>
    (localStorage.getItem('settings:exportFormat') as 'pdf' | 'docx') || 'pdf'
  )
  const [exportQuality, setExportQuality] = useState<'standard' | 'high'>(() =>
    (localStorage.getItem('settings:exportQuality') as 'standard' | 'high') || 'standard'
  )

  // Notification state
  const [emailAnalysis, setEmailAnalysis] = useState(() =>
    localStorage.getItem('settings:notif:analysis') !== 'false'
  )
  const [emailWeekly, setEmailWeekly] = useState(() =>
    localStorage.getItem('settings:notif:weekly') !== 'false'
  )
  const [emailMarketing, setEmailMarketing] = useState(() =>
    localStorage.getItem('settings:notif:marketing') === 'true'
  )

  useEffect(() => {
    api.get('/auth/google-client-id').then(({ data }) => {
      setGoogleClientId(data.clientId || data.data?.clientId)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('linked') === 'success') {
      showToast('success', 'Google account linked')
      window.history.replaceState({}, '', '/settings')
    } else if (searchParams.get('linked') === 'failed') {
      showToast('error', 'Failed to link Google account')
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  const persistSetting = (key: string, value: string) => {
    localStorage.setItem(key, value)
  }

  const handleGoogleLink = () => {
    if (!googleClientId) return
    const redirectUri = `${window.location.origin}/auth/callback`
    const params = new URLSearchParams({
      response_type: 'id_token',
      client_id: googleClientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      state: 'link',
      nonce: Math.random().toString(36),
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await updateProfile.mutateAsync({ name, email })
      setUser(result)
      showToast('success', 'Profile updated')
    } catch {
      showToast('error', 'Failed to update profile')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match')
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('success', 'Password changed')
    } catch {
      showToast('error', 'Failed to change password')
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmDelete !== 'delete') return
    try {
      await deleteAccount.mutateAsync()
      localStorage.removeItem('accessToken')
      window.location.href = '/'
    } catch {
      showToast('error', 'Failed to delete account')
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const resumeCount = resumes?.length ?? 0
  const memberSince = user?._id
    ? new Date(parseInt(user._id.substring(0, 8), 16) * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Unknown'

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto"
      >
        {/* Page header */}
        <div className="mb-8">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-56 shrink-0">
            <div className="sticky top-6 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
                    activeTab === tab.id
                      ? tab.danger
                        ? 'bg-danger/8 text-danger'
                        : 'bg-teal/8 text-teal'
                      : 'text-muted hover:text-ink hover:bg-paper-dark'
                  }`}
                >
                  <tab.icon size={16} className={`shrink-0 ${
                    activeTab === tab.id
                      ? tab.danger ? 'text-danger' : 'text-teal'
                      : 'text-muted-light group-hover:text-muted'
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-[13px] font-medium leading-tight ${
                      activeTab === tab.id
                        ? tab.danger ? 'text-danger' : 'text-teal'
                        : 'text-ink'
                    }`}>{tab.label}</p>
                    <p className="text-[10px] text-muted leading-tight truncate">{tab.description}</p>
                  </div>
                </button>
              ))}

              <div className="border-t border-border my-3" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-muted hover:text-danger hover:bg-danger/5 transition-all duration-150"
              >
                <IconLogout size={16} className="shrink-0" />
                <span className="text-[13px] font-medium">Sign out</span>
              </button>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    {/* Account summary */}
                    <SectionCard>
                      <div className="px-6 py-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center text-teal font-display text-xl font-bold">
                          {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-ink truncate">{user?.name}</p>
                          <p className="text-[12px] text-muted truncate">{user?.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/8 text-teal">
                              Free Plan
                            </span>
                            <span className="text-[10px] text-muted">
                              Member since {memberSince}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    {/* Profile */}
                    <SectionCard>
                      <SectionHeader icon={IconUser} title="Profile" description="Your basic account information" />
                      <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                          <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[11px] text-muted">
                            {resumeCount} resume{resumeCount !== 1 ? 's' : ''} on your account
                          </p>
                          <Button type="submit" size="sm" loading={updateProfile.isPending}>
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </SectionCard>

                    {/* Connected Accounts */}
                    <SectionCard>
                      <SectionHeader icon={IconBrandGoogle} title="Connected Accounts" description="Link third-party sign-in providers" />
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-border/30 flex items-center justify-center">
                            <IconBrandGoogle size={16} className="text-muted" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-ink">Google</p>
                            <p className="text-[11px] text-muted">
                              {user?.googleId ? user.email : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        {user?.googleId ? (
                          <div className="flex items-center gap-1.5 text-teal">
                            <IconCircleCheck size={16} />
                            <span className="text-[11px] font-medium">Connected</span>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={handleGoogleLink}>
                            Connect
                          </Button>
                        )}
                      </div>
                    </SectionCard>

                    {/* Password */}
                    <SectionCard>
                      <SectionHeader icon={IconKey} title="Password" description="Change your sign-in password" />
                      <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                        <Input
                          label="Current Password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Input
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                        <div className="pt-2 flex justify-end">
                          <Button type="submit" size="sm" loading={changePassword.isPending}>
                            Update Password
                          </Button>
                        </div>
                      </form>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <SectionCard>
                      <SectionHeader icon={IconPalette} title="Theme" description="Choose your preferred color theme" />
                      <div className="p-6">
                        <p className="text-[11px] text-muted uppercase tracking-wider font-medium mb-3">Mode</p>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { value: 'light', label: 'Light', icon: IconSun, desc: 'Warm off-white' },
                            { value: 'dark', label: 'Dark', icon: IconMoon, desc: 'Easy on the eyes' },
                            { value: 'system', label: 'System', icon: IconDeviceDesktop, desc: 'Match OS setting' },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => { setTheme(opt.value); persistSetting('settings:theme', opt.value) }}
                              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                                theme === opt.value
                                  ? 'border-teal bg-teal/5'
                                  : 'border-border hover:border-teal/30 bg-white'
                              }`}
                            >
                              <opt.icon size={20} className={theme === opt.value ? 'text-teal' : 'text-muted'} />
                              <span className={`text-[12px] font-medium ${theme === opt.value ? 'text-teal' : 'text-ink'}`}>
                                {opt.label}
                              </span>
                              <span className="text-[10px] text-muted">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader icon={IconPalette} title="Accent Color" description="Primary color used throughout the interface" />
                      <div className="p-6">
                        <div className="flex flex-wrap gap-3">
                          {ACCENT_COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => { setAccentColor(c.value); persistSetting('settings:accent', c.value) }}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 transition-all duration-150 ${
                                accentColor === c.value
                                  ? 'border-current shadow-sm'
                                  : 'border-border hover:border-muted-light'
                              }`}
                              style={{ color: accentColor === c.value ? c.value : undefined }}
                            >
                              <div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: c.value }}
                              />
                              <span className="text-[12px] font-medium text-ink">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader icon={IconDeviceDesktop} title="Display" description="Text size and layout density" />
                      <SettingRow
                        label="Font Size"
                        description="Adjust the base text size across the app"
                      >
                        <div className="flex bg-paper-dark rounded-lg p-0.5">
                          {(['sm', 'md', 'lg'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => { setFontSize(s); persistSetting('settings:fontSize', s) }}
                              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                                fontSize === s
                                  ? 'bg-white text-ink shadow-sm'
                                  : 'text-muted hover:text-ink'
                              }`}
                            >
                              {s === 'sm' ? 'Small' : s === 'md' ? 'Default' : 'Large'}
                            </button>
                          ))}
                        </div>
                      </SettingRow>
                      <SettingRow label="Compact Mode" description="Reduce spacing and padding for a denser layout" border={false}>
                        <Toggle
                          checked={compactMode}
                          onChange={(v) => { setCompactMode(v); persistSetting('settings:compact', String(v)) }}
                        />
                      </SettingRow>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <SectionCard>
                      <SectionHeader icon={IconBrain} title="AI Model" description="Choose which model powers the AI assistant" />
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          {([
                            { value: 'qwen2.5:7b', label: 'Qwen 2.5 7B', desc: 'Fast, runs locally via Ollama', badge: 'Local' },
                            { value: 'llama3.1:8b', label: 'Llama 3.1 8B', desc: 'Alternative local model', badge: 'Local' },
                          ]).map((m) => (
                            <button
                              key={m.value}
                              onClick={() => { setAiModel(m.value); persistSetting('settings:aiModel', m.value) }}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                                aiModel === m.value
                                  ? 'border-teal bg-teal/5'
                                  : 'border-border hover:border-teal/30'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                aiModel === m.value ? 'bg-teal text-white' : 'bg-paper-dark text-muted'
                              }`}>
                                <IconBrain size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-medium text-ink">{m.label}</p>
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-teal/8 text-teal">
                                    {m.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted">{m.desc}</p>
                              </div>
                              {aiModel === m.value && (
                                <IconCircleCheck size={16} className="text-teal shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader icon={IconSparkles} title="Behavior" description="Control how the AI assistant behaves" />
                      <SettingRow
                        label="Streaming Responses"
                        description="Show tokens as they're generated instead of waiting for the full response"
                      >
                        <Toggle
                          checked={aiStreaming}
                          onChange={(v) => { setAiStreaming(v); persistSetting('settings:aiStreaming', String(v)) }}
                        />
                      </SettingRow>
                      <SettingRow
                        label="Auto-Apply Suggestions"
                        description="Automatically apply AI-suggested changes without confirmation"
                      >
                        <Toggle
                          checked={aiAutoApply}
                          onChange={(v) => { setAiAutoApply(v); persistSetting('settings:aiAutoApply', String(v)) }}
                        />
                      </SettingRow>
                      <SettingRow
                        label="Canvas Highlights"
                        description="Show animated highlights on changed sections"
                        border={false}
                      >
                        <Toggle
                          checked={true}
                          onChange={() => {}}
                        />
                      </SettingRow>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'export' && (
                  <div className="space-y-6">
                    <SectionCard>
                      <SectionHeader icon={IconDownload} title="PDF Export" description="Default settings for exported documents" />
                      <SettingRow label="Default Format" description="Choose your preferred export format">
                        <div className="flex bg-paper-dark rounded-lg p-0.5">
                          {(['pdf', 'docx'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => { setExportFormat(f); persistSetting('settings:exportFormat', f) }}
                              className={`px-3 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition-all ${
                                exportFormat === f
                                  ? 'bg-white text-ink shadow-sm'
                                  : 'text-muted hover:text-ink'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </SettingRow>
                      <SettingRow label="Quality" description="Higher quality produces larger files with better rendering">
                        <div className="flex bg-paper-dark rounded-lg p-0.5">
                          {([
                            { value: 'standard', label: 'Standard' },
                            { value: 'high', label: 'High DPI' },
                          ] as const).map((q) => (
                            <button
                              key={q.value}
                              onClick={() => { setExportQuality(q.value); persistSetting('settings:exportQuality', q.value) }}
                              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                                exportQuality === q.value
                                  ? 'bg-white text-ink shadow-sm'
                                  : 'text-muted hover:text-ink'
                              }`}
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                      </SettingRow>
                      <SettingRow
                        label="Include Page Numbers"
                        description="Add page numbers to the footer of exported PDFs"
                        border={false}
                      >
                        <Toggle checked={true} onChange={() => {}} />
                      </SettingRow>
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader icon={IconFileText} title="Data Export" description="Download your data" />
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-medium text-ink">Export all resumes</p>
                            <p className="text-[11px] text-muted mt-0.5">
                              Download {resumeCount} resume{resumeCount !== 1 ? 's' : ''} as JSON
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => showToast('success', 'Export started — check your email')}
                          >
                            Request Export
                          </Button>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <SectionCard>
                      <SectionHeader icon={IconMail} title="Email Notifications" description="What emails we send you" />
                      <SettingRow
                        label="Resume Analysis Complete"
                        description="Get notified when your resume analysis finishes"
                      >
                        <Toggle
                          checked={emailAnalysis}
                          onChange={(v) => { setEmailAnalysis(v); persistSetting('settings:notif:analysis', String(v)) }}
                        />
                      </SettingRow>
                      <SettingRow
                        label="Weekly Digest"
                        description="A weekly summary of tips and activity"
                      >
                        <Toggle
                          checked={emailWeekly}
                          onChange={(v) => { setEmailWeekly(v); persistSetting('settings:notif:weekly', String(v)) }}
                        />
                      </SettingRow>
                      <SettingRow
                        label="Product Updates"
                        description="New features and improvements"
                        border={false}
                      >
                        <Toggle
                          checked={emailMarketing}
                          onChange={(v) => { setEmailMarketing(v); persistSetting('settings:notif:marketing', String(v)) }}
                        />
                      </SettingRow>
                    </SectionCard>

                    <SectionCard>
                      <SectionHeader icon={IconBell} title="In-App Alerts" description="Notifications within the app" />
                      <SettingRow
                        label="Red Flag Warnings"
                        description="Alert when issues are detected in your resume"
                      >
                        <Toggle checked={true} onChange={() => {}} />
                      </SettingRow>
                      <SettingRow
                        label="AI Suggestion Tips"
                        description="Show contextual tips for improving your resume"
                        border={false}
                      >
                        <Toggle checked={true} onChange={() => {}} />
                      </SettingRow>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'shortcuts' && (
                  <div className="space-y-6">
                    <SectionCard>
                      <SectionHeader icon={IconKeyboard} title="Keyboard Shortcuts" description="Speed up your workflow with shortcuts" />
                      <div className="divide-y divide-border-light">
                        {SHORTCUTS.map((s, i) => (
                          <div key={i} className="flex items-center justify-between px-6 py-3">
                            <p className="text-[13px] text-ink">{s.label}</p>
                            <div className="flex items-center gap-1">
                              {s.keys.map((k, j) => (
                                <span key={j}>
                                  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-medium text-ink bg-paper-dark border border-border rounded shadow-[0_1px_0_var(--color-border)]">
                                    {k}
                                  </kbd>
                                  {j < s.keys.length - 1 && (
                                    <span className="text-[10px] text-muted-light mx-0.5">+</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'danger' && (
                  <div className="space-y-6">
                    <SectionCard className="border-danger/20">
                      <SectionHeader icon={IconShield} title="Export Data" description="Download a copy of all your data before deleting" />
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] text-ink">Download your data</p>
                          <p className="text-[11px] text-muted mt-0.5">
                            Includes {resumeCount} resume{resumeCount !== 1 ? 's' : ''}, cover letters, and ATS history
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => showToast('success', 'Export requested — check your email')}
                        >
                          Download
                        </Button>
                      </div>
                    </SectionCard>

                    <SectionCard className="border-danger/20">
                      <div className="px-6 py-4 border-b border-danger/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-danger/8 flex items-center justify-center">
                            <IconAlertTriangle size={16} className="text-danger" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-danger">Delete Account</h3>
                            <p className="text-[11px] text-muted leading-tight">Permanently remove your account and all data</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="bg-danger/5 border border-danger/10 rounded-lg p-4">
                          <p className="text-[12px] text-danger/80 leading-relaxed">
                            This action is irreversible. All your resumes, cover letters, ATS history, and account data will be permanently deleted.
                          </p>
                        </div>
                        <Input
                          label='Type "delete" to confirm'
                          value={confirmDelete}
                          onChange={(e) => setConfirmDelete(e.target.value)}
                          placeholder="delete"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={confirmDelete !== 'delete'}
                          onClick={handleDeleteAccount}
                          loading={deleteAccount.isPending}
                        >
                          Delete Account Permanently
                        </Button>
                      </div>
                    </SectionCard>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
