import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  LayoutDashboard,
  FileText,
  Target,
  Mail,
  Globe,
  Download,
  Briefcase,
  MessageSquare,
  ChevronDown,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useResumes } from '../../lib/queries'
import { cn } from '../../lib/utils'

const mainNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/resumes', label: 'My Resumes', icon: FileText, badge: true },
  { to: '/ats', label: 'ATS Scorer', icon: Target },
  { to: '/cover-letter/new', label: 'Cover Letter', icon: Mail },
  { to: '/portfolio', label: 'Portfolio', icon: Globe },
]

function useExportLink() {
  const { data: resumes } = useResumes()
  const firstId = resumes?.[0]?._id
  return { to: firstId ? `/export/${firstId}` : null }
}

const comingSoonItems = [
  { label: 'Job Tracker', icon: Briefcase },
  { label: 'Interview Prep', icon: MessageSquare },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const { data: resumes } = useResumes()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) return null

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const resumeCount = resumes?.length ?? 0

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="w-[220px] min-w-[220px] bg-surface border-r border-border flex flex-col fixed top-0 left-0 bottom-0 z-10">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
          <span className="font-display text-teal text-xl font-bold">&amp;</span>
          <span className="font-display text-ink text-base font-bold tracking-tight">
            Folio
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-3 overflow-y-auto">
       
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
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
                  {/* {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal rounded-full" />
                  )} */}
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-teal' : 'text-muted group-hover:text-ink transition-colors')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && resumeCount > 0 && (
                    <span className="text-[10px] font-medium bg-teal/10 text-teal px-1.5 py-0.5 rounded-full leading-none">
                      {resumeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/60 px-3 pb-1 pt-4">
            Export
          </span>
          {(() => {
            const exportId = resumes?.[0]?._id
            const item = { icon: Download, label: 'Export Resume' }
            if (!exportId) {
              return (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted/40 cursor-not-allowed select-none">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              )
            }
            return (
              <NavLink
                to={`/export/${exportId}`}
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
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal rounded-full" />
                    )}
                    <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-teal' : 'text-muted group-hover:text-ink transition-colors')} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })()}

          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/60 px-3 pb-1 pt-4">
            Coming Soon
          </span>
          {comingSoonItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted/40 cursor-not-allowed select-none"
              title="Coming soon"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              <span className="ml-auto text-[9px] font-medium uppercase tracking-wider text-muted/30">
                Soon
              </span>
            </div>
          ))}
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
                <ChevronDown className={cn(
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
                  <User className="h-3.5 w-3.5 text-muted" />
                  Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => navigate('/settings')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-muted" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {}}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5 text-muted" />
                  Billing
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onSelect={() => {}}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink hover:bg-paper-dark/50 cursor-pointer outline-none transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-muted" />
                  Help & Support
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onSelect={logout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-light cursor-pointer outline-none transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>

      <main className="flex-1 ml-[220px] flex flex-col min-h-screen relative z-[1]">
        {children}
      </main>
    </div>
  )
}
