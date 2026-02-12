import { useState, useCallback } from 'react'
import { Outlet, NavLink, useParams, Navigate } from 'react-router-dom'
import './Layout.css'

const VALID_PLATFORMS = ['polymarket', 'hyperliquid'] as const
export type Platform = (typeof VALID_PLATFORMS)[number]

export function usePlatform(): Platform {
  const { platform } = useParams<{ platform: string }>()
  if (VALID_PLATFORMS.includes(platform as Platform)) return platform as Platform
  return 'polymarket'
}

const NAV_ITEMS = [
  { to: 'strategies', label: 'Strategies' },
  { to: 'trades',     label: 'Trades' },
  { to: 'positions',  label: 'Positions' },
  { to: 'pnl',        label: 'P&L' },
  { to: 'equity',     label: 'Equity' },
  { to: 'health',     label: 'Health' },
  { to: 'docs',       label: 'Docs' },
  { to: 'logs',       label: 'Logs' },
  { to: 'alerts',     label: 'Alerts' },
  { to: 'status',     label: 'Status' },
]

const PLATFORM_LABELS: Record<Platform, string> = {
  polymarket: 'Polymarket',
  hyperliquid: 'Hyperliquid',
}

function PlatformSection({
  platform,
  isActive,
  expanded,
  onToggle,
  onNavigate,
}: {
  platform: Platform
  isActive: boolean
  expanded: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className={`layout-nav-group ${isActive ? 'layout-nav-group-active' : ''}`}>
      <button className="layout-nav-section" onClick={onToggle}>
        <span className="layout-nav-section-label">{PLATFORM_LABELS[platform]}</span>
        <span className={`layout-nav-chevron ${expanded ? 'layout-nav-chevron-open' : ''}`}>&#9654;</span>
      </button>
      {expanded && (
        <ul className="layout-nav-links">
          {NAV_ITEMS.map(item => (
            <li key={item.to}>
              <NavLink
                to={`/${platform}/${item.to}`}
                className={({ isActive: linkActive }) =>
                  `layout-nav-link ${linkActive ? 'layout-nav-link-active' : ''}`
                }
                onClick={onNavigate}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Layout() {
  const platform = usePlatform()
  const { platform: rawPlatform } = useParams<{ platform: string }>()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<Platform, boolean>>({
    polymarket: platform === 'polymarket',
    hyperliquid: platform === 'hyperliquid',
  })

  const toggleSection = useCallback((p: Platform) => {
    setExpanded(prev => ({ ...prev, [p]: !prev[p] }))
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Redirect invalid platform params
  if (!VALID_PLATFORMS.includes(rawPlatform as Platform)) {
    return <Navigate to="/polymarket/strategies" replace />
  }

  return (
    <div className="layout">
      {/* Mobile hamburger */}
      <button
        className="layout-hamburger"
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label="Toggle navigation"
      >
        <span className="layout-hamburger-bar" />
        <span className="layout-hamburger-bar" />
        <span className="layout-hamburger-bar" />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && <div className="layout-backdrop" onClick={closeMobile} />}

      {/* Sidebar */}
      <aside className={`layout-sidebar ${mobileOpen ? 'layout-sidebar-open' : ''}`}>
        <div className="layout-logo">
          <h1 className="layout-logo-title">Trading Dashboard</h1>
          <p className="layout-logo-sub">Multi-Strategy Monitoring</p>
        </div>
        <nav className="layout-nav">
          {VALID_PLATFORMS.map(p => (
            <PlatformSection
              key={p}
              platform={p}
              isActive={platform === p}
              expanded={expanded[p]}
              onToggle={() => toggleSection(p)}
              onNavigate={closeMobile}
            />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
