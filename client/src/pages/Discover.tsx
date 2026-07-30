import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDiscoverPreferences } from '../lib/queries'
import DiscoverFeed from '../components/discover/DiscoverFeed'
import DiscoverTracker from '../components/discover/DiscoverTracker'
import SetupCard from '../components/discover/SetupCard'
import PreferencesPanel from '../components/discover/PreferencesPanel'
import { IconSettings } from '@tabler/icons-react'
import { cn } from '../lib/utils'

export default function Discover() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: prefs, isLoading: prefsLoading } = useDiscoverPreferences()
  const [tab, setTab] = useState<'feed' | 'tracker'>(
    location.pathname.includes('tracker') ? 'tracker' : 'feed',
  )
  const [showPrefs, setShowPrefs] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    const target = location.pathname.includes('tracker') ? 'tracker' : 'feed'
    setTab(target)
  }, [location.pathname])

  useEffect(() => {
    if (!prefsLoading && prefs === null) {
      setShowSetup(true)
    }
  }, [prefsLoading, prefs])

  const switchTab = (t: 'feed' | 'tracker') => {
    setTab(t)
    navigate(t === 'tracker' ? '/discover/tracker' : '/discover/feed', { replace: true })
  }

  const isFeed = tab === 'feed'

  return (
    <div className={cn(
      'flex flex-col min-h-0',
      isFeed ? 'flex-1 max-h-screen overflow-hidden' : 'page-container',
    )}>
      {/* Tab strip */}
      <div className={cn(
        'flex items-center justify-between shrink-0',
        isFeed ? 'px-4 sm:px-6 pt-3 sm:pt-4 pb-2' : 'mb-6',
      )}>
        <div className="flex items-center gap-1 bg-paper border border-border rounded-lg p-1">
          <button
            onClick={() => switchTab('feed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'feed'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => switchTab('tracker')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'tracker'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Tracker
          </button>
        </div>
        {isFeed && (
          <button
            onClick={() => setShowPrefs(true)}
            className="p-2 text-muted hover:text-ink transition-colors rounded-lg hover:bg-paper-dark/50"
            title="Preferences"
          >
            <IconSettings className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={cn(isFeed ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : '')}>
        {isFeed ? (
          <DiscoverFeed />
        ) : (
          <DiscoverTracker />
        )}
      </div>

      {/* Setup overlay */}
      {showSetup && (
        <SetupCard
          onComplete={() => setShowSetup(false)}
        />
      )}

      {/* Preferences panel */}
      {showPrefs && (
        <PreferencesPanel
          onClose={() => setShowPrefs(false)}
        />
      )}
    </div>
  )
}
