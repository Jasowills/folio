import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconLayoutDashboard, IconFileText, IconTargetArrow, IconMail, IconGlobe, IconMessage, IconFlask, IconChevronDown, IconUser, IconSettings, IconCreditCard, IconHelpCircle, IconLogout, IconMenu2, IconX, IconCompass } from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import { useResumes, useDiscoverFeedStats } from '../../lib/queries'
import { cn } from '../../lib/utils'

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { to: '/discover/feed', label: 'Discover', icon: IconCompass },
      { to: '/research', label: 'Research', icon: IconFlask },
    ],
  },
  {
    label: 'Documents',
    items: [
      { to: '/resumes', label: 'My Resumes', icon: IconFileText, badge: true },
      { to: '/cover-letter/new', label: 'Cover Letter', icon: IconMail },
      { to: '/portfolio', label: 'Portfolio', icon: IconGlobe },
    ],
  },
  {
    label: 'Interviews',
    items: [
      { to: '/ats', label: 'ATS Scorer', icon: IconTargetArrow },
      { to: '/interview/new', label: 'Interview Prep', icon: IconMessage },
    ],
  },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: resumes } = useResumes()
  const { data: feedStats } = useDiscoverFeedStats()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (loading) return null

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  // Full-screen mode for live interview — no sidebar
  if (/\/interview\/[^/]+\/live$/.test(location.pathname)) {
    return <>{children}</>
  }

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const resumeCount = resumes?.length ?? 0
  const newJobCount = feedStats?.newSinceVisit ?? 0

  return (
    <div className="flex min-h-screen bg-paper w-full overflow-x-hidden">
      {/* Mobile menu overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'w-[220px] min-w-[220px] bg-surface border-r border-border flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-transform duration-200',
        'lg:translate-x-0',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between gap-2.5 px-5 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-ink text-base font-bold tracking-tight">
              Folio
            </span>
            <span className="font-display text-teal text-xl font-bold">&amp;</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col px-3 py-3 overflow-y-auto">

          {navGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted/50 px-3 pb-1.5 select-none">
                {group.label}
              </span>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
                        isActive
                          ? 'bg-teal-light text-teal font-semibold'
                          : 'text-muted hover:text-ink hover:bg-paper-dark/50',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-teal' : 'text-muted group-hover:text-ink transition-colors')} />
                        <span className="flex-1">{item.label}</span>
                        {item.to === '/resumes' && resumeCount > 0 && (
                          <span className="text-[10px] font-medium bg-teal/10 text-teal px-1.5 py-0.5 rounded-full leading-none">
                            {resumeCount}
                          </span>
                        )}
                        {item.to === '/discover/feed' && newJobCount > 0 && (
                          <span className="text-[10px] font-medium bg-teal text-white px-1.5 py-0.5 rounded-full leading-none">
                            {newJobCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto pt-2">
            <NavLink
              to="/settings"
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
                  isActive
                    ? 'bg-teal-light text-teal font-semibold'
                    : 'text-muted hover:text-ink hover:bg-paper-dark/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <IconSettings className={cn('h-4 w-4 shrink-0', isActive ? 'text-teal' : 'text-muted group-hover:text-ink transition-colors')} />
                  <span>Settings</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-border shrink-0">
          <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-paper-dark/30 transition-colors">
                <div className="h-8 w-8 rounded-full bg-teal text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-ink truncate leading-tight">
                      {user.name}
                    </p>
                    <span className="text-[9px] font-semibold uppercase tracking-wider bg-amber/10 text-amber px-1 py-0.5 rounded">
                      {user.plan || 'Free'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate leading-tight mt-0.5">{user.email}</p>
                </div>
                <IconChevronDown className={cn(
                  'h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0',
                  menuOpen && 'rotate-180',
                )} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                side="top"
                sideOffset={4}
                className="z-50 min-w-[200px] bg-surface border border-border rounded-lg shadow-lg p-1.5"
              >
                <DropdownMenu.Item
                  onSelect={() => navigate('/settings')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <IconUser className="h-3.5 w-3.5 text-muted" />
                  Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => navigate('/settings')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <IconSettings className="h-3.5 w-3.5 text-muted" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {}}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <IconCreditCard className="h-3.5 w-3.5 text-muted" />
                  Billing
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onSelect={() => {}}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <IconHelpCircle className="h-3.5 w-3.5 text-muted" />
                  Help & Support
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onSelect={logout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-light cursor-pointer outline-none transition-colors"
                >
                  <IconLogout className="h-3.5 w-3.5" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>

      <main className="flex-1 lg:ml-[220px] flex flex-col min-h-screen min-w-0 max-w-full relative z-[1]">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-surface border border-border shadow-sm text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <IconMenu2 className="h-5 w-5" />
        </button>
        {children}
      </main>
    </div>
  )
}
