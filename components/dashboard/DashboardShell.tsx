'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Client } from '@/types'

interface Props {
  profile: Profile | null
  client: Client | null
  allClients: Client[] | null
  children: React.ReactNode
}

export default function DashboardShell({ profile, client, allClients, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile?.role === 'admin'
  const displayClient = client || allClients?.[0]

  useEffect(() => {
    const saved = localStorage.getItem('omni-theme') as 'dark'|'light' || 'dark'
    setTheme(saved)
    document.body.classList.toggle('light', saved === 'light')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.classList.toggle('light', next === 'light')
    localStorage.setItem('omni-theme', next)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const nav = [
    { label: 'Overview',         icon: '⬡', href: '/dashboard' },
    { label: 'Category Scores',  icon: '📊', href: '/dashboard/scores' },
    { label: 'Fix Progress',     icon: '🔧', href: '/dashboard/fixes', badge: '4' },
    { label: 'KPI Tracker',      icon: '📈', href: '/dashboard/kpis' },
    { label: 'Reports Archive',  icon: '📰', href: '/dashboard/reports' },
  ]

  const adminNav = [
    { label: 'All Clients',  icon: '🏢', href: '/dashboard' },
    { label: 'Run Scan',     icon: '⚡', href: '/dashboard/scan' },
    { label: 'Email Reports',icon: '📬', href: '/dashboard/emails' },
    { label: 'Settings',     icon: '⚙',  href: '/dashboard/settings' },
  ]

  const s: Record<string, React.CSSProperties> = {
    overlay: { display: sidebarOpen ? 'block' : 'none', position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', zIndex: 199 },
    sidebar: { width: 240, minWidth: 240, flexShrink: 0, background: 'var(--n2)',
      borderRight: '1px solid var(--b)', display: 'flex', flexDirection: 'column' },
    logo: { padding: '20px 24px 16px', borderBottom: '1px solid var(--b)',
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
    mark: { width: 32, height: 32, borderRadius: 8, background: 'var(--teal)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 13, color: 'var(--navy)', flexShrink: 0 },
    navArea: { flex: 1, padding: '6px 10px', overflowY: 'auto', display: 'flex',
      flexDirection: 'column', gap: 1 },
    secLabel: { fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--tx3)', padding: '12px 10px 5px', fontWeight: 600 },
    footer: { padding: 10, borderTop: '1px solid var(--b)', flexShrink: 0 },
    main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
    topbar: { background: 'var(--n2)', borderBottom: '1px solid var(--b)', padding: '0 22px',
      minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexWrap: 'wrap' as const, paddingTop: 8, paddingBottom: 8,
      position: 'sticky' as const, top: 0, zIndex: 50 },
    content: { flex: 1, padding: 22, display: 'flex', flexDirection: 'column',
      gap: 18, minWidth: 0, width: '100%', overflowX: 'hidden' },
  }

  return (
    <>
      {/* Mobile overlay */}
      <div style={s.overlay} onClick={() => setSidebarOpen(false)} />

      <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
        {/* Sidebar */}
        <nav style={{
          ...s.sidebar,
          ...(typeof window !== 'undefined' && window.innerWidth <= 900 ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          } : {}),
        }}>
          <div style={s.logo}>
            <div style={s.mark}>OS</div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem' }}>
              Omni<span style={{ color: 'var(--teal)' }}>scient</span>
            </div>
          </div>

          {displayClient && (
            <div style={{ margin: 12, padding: '12px 14px', background: 'var(--n3)',
              border: '1px solid var(--b)', borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--tx3)', marginBottom: 3 }}>Active Client</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)',
                marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayClient.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--tx2)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--yellow)' }} />
                {displayClient.tier.charAt(0).toUpperCase() + displayClient.tier.slice(1)} · {displayClient.status}
              </div>
            </div>
          )}

          <div style={s.navArea}>
            {!isAdmin && (
              <>
                <div style={s.secLabel as React.CSSProperties}>Dashboard</div>
                {nav.map(item => (
                  <NavItem key={item.href} {...item}
                    active={typeof window !== 'undefined' && window.location.pathname === item.href}
                    onClick={() => { router.push(item.href); setSidebarOpen(false) }} />
                ))}
              </>
            )}
            {isAdmin && (
              <>
                <div style={s.secLabel as React.CSSProperties}>Admin</div>
                {adminNav.map(item => (
                  <NavItem key={item.href} {...item}
                    active={typeof window !== 'undefined' && window.location.pathname === item.href}
                    onClick={() => { router.push(item.href); setSidebarOpen(false) }} />
                ))}
              </>
            )}
          </div>

          <div style={s.footer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
              borderRadius: 8, cursor: 'pointer' }} onClick={handleSignOut}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,var(--blue),var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 700 }}>
                {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)' }}>
                  {profile?.full_name || profile?.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)' }}>
                  {isAdmin ? 'Agency Admin' : 'Client'} · Sign out
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main */}
        <div style={s.main}>
          {/* Topbar */}
          <div style={s.topbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ display: 'none', width: 36, height: 36, background: 'var(--n3)',
                  border: '1px solid var(--b)', borderRadius: 8, alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: 'var(--tx2)', fontSize: '1.125rem',
                  flexShrink: 0 }} id="menu-btn">
                ☰
              </button>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem',
                  color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAdmin ? 'Admin Dashboard' : displayClient?.name || 'Dashboard'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)' }}>
                  {isAdmin
                    ? `${allClients?.length || 0} active clients`
                    : displayClient?.locations?.map(l => l.city).join(' · ')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--n3)',
                border: '1px solid var(--b)', borderRadius: 999, padding: '4px 11px',
                fontSize: '0.6875rem', color: 'var(--tx2)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)',
                  animation: 'pulse 2s infinite' }} />
                Live
              </div>
              <button onClick={toggleTheme}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--n3)',
                  border: '1px solid var(--b2)', borderRadius: 999, padding: '6px 14px',
                  fontFamily: 'var(--fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--tx2)',
                  cursor: 'pointer', flexShrink: 0 }}>
                {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>

          {/* Page content */}
          <div style={s.content}>{children}</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { #menu-btn { display: flex !important; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </>
  )
}

function NavItem({ label, icon, badge, active, onClick }: {
  label: string; icon: string; badge?: string; active?: boolean; onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
      borderRadius: 8, color: active ? 'var(--teal)' : 'var(--tx2)', fontSize: '0.875rem',
      fontWeight: 500, cursor: 'pointer', border: '1px solid',
      borderColor: active ? 'rgba(46,196,182,0.2)' : 'transparent',
      background: active ? 'var(--td)' : 'transparent',
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: '0.9375rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
      {badge && (
        <span style={{ marginLeft: 'auto', background: 'var(--teal)', color: 'var(--navy)',
          fontSize: '0.5625rem', fontWeight: 800, padding: '2px 6px', borderRadius: 999 }}>
          {badge}
        </span>
      )}
    </div>
  )
}
