import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IconUser, IconKey, IconBrandGoogle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import { useAuth } from '../hooks/useAuth'
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '../lib/queries'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { showToast } from '../components/ui/toast'
import api from '../lib/api'

export default function Settings() {
  const { user, setUser } = useAuth()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()
  const [searchParams] = useSearchParams()

  const [googleClientId, setGoogleClientId] = useState<string | null>(null)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

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

  const sectionClasses = 'bg-surface border border-border rounded-xl p-6 space-y-5'
  const sectionTitleClasses = 'flex items-center gap-2 text-sm font-semibold text-ink'
  const dividerClasses = 'border-t border-border'

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account</p>
          </div>
        </div>

        {/* Profile */}
        <div className={sectionClasses}>
          <div className={sectionTitleClasses}>
            <IconUser className="h-4 w-4 text-teal" />
            Profile
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="pt-2">
              <Button
                type="submit"
                size="sm"
                loading={updateProfile.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Connected Accounts */}
        <div className={sectionClasses}>
          <div className={sectionTitleClasses}>
            <IconBrandGoogle className="h-4 w-4 text-teal" />
            Connected Accounts
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBrandGoogle className="h-5 w-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-ink">Google</p>
                <p className="text-[11px] text-muted">
                  {user?.googleId ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {user?.googleId ? (
              <IconCircleCheck className="h-5 w-5 text-teal shrink-0" />
            ) : (
              <Button size="sm" variant="outline" onClick={handleGoogleLink}>
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Password */}
        <div className={sectionClasses}>
          <div className={sectionTitleClasses}>
            <IconKey className="h-4 w-4 text-teal" />
            Change Password
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
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
            <div className="pt-2">
              <Button
                type="submit"
                size="sm"
                loading={changePassword.isPending}
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>

        <div className={dividerClasses} />

        {/* Danger Zone */}
        <div className={`${sectionClasses} border-danger/20`}>
          <div className={`${sectionTitleClasses} text-danger`}>
            <IconAlertTriangle className="h-4 w-4" />
            Danger Zone
          </div>
          <p className="text-sm text-muted">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <div className="space-y-3">
            <Input
              label={'Type "delete" to confirm'}
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
              Delete Account
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
