// src/components/shared/SidebarLayout.jsx
// Younovate LMS — Shared Sidebar Layout
// Features: collapse/expand · mobile overlay · Tabler icons · role-based brand color
// Used by AdminLayout, TrainerLayout, TraineeLayout, HRLayout

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout, logoutUser, selectCurrentUser } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';

// ─── Tabler icon CDN (loaded once, all icons available) ───────────────────────
const TABLER_CDN = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/tabler-icons.min.css';

// ─── Role brand color map ─────────────────────────────────────────────────────
const ROLE_COLOR = {
  admin:   '#6366F1',
  trainer: '#0D9488',
  trainee: '#2563EB',
  hr:      '#7C3AED',
};

// ─── Icon component using Tabler webfont ──────────────────────────────────────
const Icon = ({ name, size = 18, style = {} }) => (
  <i
    className={`ti ti-${name}`}
    style={{ fontSize: size, lineHeight: 1, ...style }}
    aria-hidden="true"
  />
);

// ─── Nav section with optional label ─────────────────────────────────────────
const NavSection = ({ label, children, collapsed }) => (
  <div style={s.navSection}>
    {!collapsed && label && (
      <p style={s.navLabel}>{label}</p>
    )}
    {children}
  </div>
);

// ─── Individual nav link ──────────────────────────────────────────────────────
const SideLink = ({ to, icon, label, badge, collapsed, brandColor, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={({ isActive }) => ({
      ...s.navLink,
      background:    isActive ? `${brandColor}20` : 'transparent',
      borderLeft:    isActive ? `3px solid ${brandColor}` : '3px solid transparent',
      color:         isActive ? '#f1f5f9' : '#94a3b8',
    })}
  >
    <Icon name={icon} size={18} style={{ flexShrink: 0, width: 20, textAlign: 'center' }} />
    {!collapsed && (
      <>
        <span style={s.navLinkText}>{label}</span>
        {badge != null && badge > 0 && (
          <span style={s.badge}>{badge > 99 ? '99+' : badge}</span>
        )}
      </>
    )}
  </NavLink>
);

// ─── Main Layout Component ────────────────────────────────────────────────────
export default function SidebarLayout({
  navItems,           // Array of nav item groups or flat items
  brandColor,         // Override — defaults to role color
  title = 'Younovate',
  pageTitle,          // Optional static page title in topbar
}) {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAppSelector(selectCurrentUser);

  const resolvedColor = brandColor || ROLE_COLOR[user?.role] || '#6366F1';
  const initials      = user?.name?.slice(0, 2).toUpperCase() || 'YN';

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);

  // Inject Tabler icon CSS once
  useEffect(() => {
    if (!document.getElementById('tabler-icons-css')) {
      const link  = document.createElement('link');
      link.id     = 'tabler-icons-css';
      link.rel    = 'stylesheet';
      link.href   = TABLER_CDN;
      document.head.appendChild(link);
    }
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Derive current page title from navItems + location
  const currentLabel = (() => {
    if (pageTitle) return pageTitle;
    const flat = navItems.flatMap(g => g.items || [g]);
    const match = flat.find(item => location.pathname.startsWith(item.to));
    return match?.label || title;
  })();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await dispatch(logoutUser());
    } finally {
      dispatch(logout());
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    }
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <style>{CSS}</style>

      <div className="yn-shell">

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className="yn-overlay"
            onClick={closeMobile}
            role="presentation"
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`yn-sidebar${collapsed ? ' yn-collapsed' : ''}${mobileOpen ? ' yn-mobile-open' : ''}`}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Brand row */}
          <div className="yn-brand-row">
            <div className="yn-logo" style={{ background: resolvedColor }} aria-hidden="true">
              Y
            </div>
            {!collapsed && (
              <span className="yn-brand-name">{title}</span>
            )}
            <button
              className="yn-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
            </button>
          </div>

          {/* Nav items */}
          <div className="yn-nav-scroll">
            {navItems.map((group, gi) => {
              const items = group.items || [group];
              return (
                <NavSection key={gi} label={group.label} collapsed={collapsed}>
                  {items.map(item => (
                    <SideLink
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      collapsed={collapsed}
                      brandColor={resolvedColor}
                    />
                  ))}
                </NavSection>
              );
            })}
          </div>

          {/* User area */}
          <div className="yn-user-area">
            {!collapsed && (
              <div className="yn-user-row">
                <div
                  className="yn-avatar"
                  style={{ background: resolvedColor }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="yn-user-info">
                  <p className="yn-user-name">{user?.name || 'User'}</p>
                  <p className="yn-user-role">{user?.role}</p>
                </div>
              </div>
            )}
            <button
              className="yn-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="logout" size={16} />
              {!collapsed && (
                <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
              )}
            </button>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="yn-main">

          {/* Top bar */}
          <header className="yn-topbar">
            <div className="yn-topbar-left">
              {/* Hamburger — mobile only */}
              <button
                className="yn-hamburger"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
              >
                <Icon name="menu-2" size={20} />
              </button>
              <h1 className="yn-page-title">{currentLabel}</h1>
            </div>

            <div className="yn-topbar-right">
              <button className="yn-icon-btn" aria-label="Search">
                <Icon name="search" size={16} />
              </button>
              <button className="yn-icon-btn yn-notif-btn" aria-label="Notifications">
                <Icon name="bell" size={16} />
                <span className="yn-notif-dot" aria-label="You have notifications" />
              </button>
              <div
                className="yn-topbar-avatar"
                style={{ background: resolvedColor }}
                role="img"
                aria-label={`Logged in as ${user?.name}`}
              >
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="yn-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  navSection:  { padding: '6px 0' },
  navLabel: {
    fontSize:      10,
    fontWeight:    700,
    color:         '#475569',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    padding:       '4px 14px 6px',
    whiteSpace:    'nowrap',
    overflow:      'hidden',
  },
  navLink: {
    display:        'flex',
    alignItems:     'center',
    gap:            10,
    padding:        '10px 14px',
    textDecoration: 'none',
    fontSize:       13,
    fontWeight:     500,
    transition:     'all .15s',
    whiteSpace:     'nowrap',
    overflow:       'hidden',
    borderRight:    'none',
    borderTop:      'none',
    borderBottom:   'none',
    cursor:         'pointer',
  },
  navLinkText: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
  badge: {
    fontSize:     10,
    fontWeight:   700,
    background:   '#ef4444',
    color:        '#fff',
    borderRadius: 10,
    padding:      '1px 6px',
    flexShrink:   0,
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .yn-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: #F8FAFC;
  }

  /* ── Overlay (mobile) ─────────────────────────────────────────────────── */
  .yn-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 40;
    backdrop-filter: blur(2px);
  }

  /* ── Sidebar ──────────────────────────────────────────────────────────── */
  .yn-sidebar {
    width: 224px;
    background: #0F172A;
    display: flex;
    flex-direction: column;
    transition: width 0.25s ease;
    flex-shrink: 0;
    overflow: hidden;
    z-index: 50;
  }

  .yn-sidebar.yn-collapsed { width: 64px; }

  /* Brand */
  .yn-brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }

  .yn-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    letter-spacing: -0.5px;
  }

  .yn-brand-name {
    color: #f1f5f9;
    font-weight: 700;
    font-size: 15px;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .yn-collapse-btn {
    background: none;
    border: none;
    color: #475569;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }
  .yn-collapse-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.06); }

  /* Nav scroll area */
  .yn-nav-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: #1e293b transparent;
  }
  .yn-nav-scroll::-webkit-scrollbar { width: 4px; }
  .yn-nav-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

  /* User area */
  .yn-user-area {
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 12px 12px 14px;
    flex-shrink: 0;
  }

  .yn-user-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    min-width: 0;
  }

  .yn-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .yn-user-info { min-width: 0; overflow: hidden; }
  .yn-user-name {
    margin: 0;
    color: #f1f5f9;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .yn-user-role {
    margin: 0;
    color: #64748b;
    font-size: 11px;
    text-transform: capitalize;
    margin-top: 1px;
  }

  .yn-logout-btn {
    width: 100%;
    padding: 9px 10px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.18);
    color: #fca5a5;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s;
  }
  .yn-logout-btn:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
  .yn-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Main area ────────────────────────────────────────────────────────── */
  .yn-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  /* Top bar */
  .yn-topbar {
    height: 54px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
    z-index: 30;
  }

  .yn-topbar-left { display: flex; align-items: center; gap: 12px; }

  .yn-hamburger {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: #64748b;
    padding: 4px;
    border-radius: 6px;
    align-items: center;
    justify-content: center;
  }
  .yn-hamburger:hover { background: #f1f5f9; }

  .yn-page-title {
    font-size: 16px;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
  }

  .yn-topbar-right { display: flex; align-items: center; gap: 8px; }

  .yn-icon-btn {
    width: 34px;
    height: 34px;
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    transition: background 0.15s;
  }
  .yn-icon-btn:hover { background: #f1f5f9; }

  .yn-notif-btn { position: relative; }
  .yn-notif-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 7px;
    height: 7px;
    background: #ef4444;
    border-radius: 50%;
    border: 1.5px solid #fff;
  }

  .yn-topbar-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Page content */
  .yn-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* ── Mobile responsive ────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .yn-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 224px !important;   /* always full width when open */
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }

    .yn-sidebar.yn-mobile-open {
      transform: translateX(0);
    }

    /* Hide desktop collapse button on mobile */
    .yn-collapse-btn { display: none; }

    /* Show hamburger */
    .yn-hamburger { display: flex; }

    /* Main fills full width */
    .yn-main { width: 100%; }
  }

  /* ── Reduce motion ────────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .yn-sidebar, .yn-collapse-btn, .yn-logout-btn { transition: none; }
  }
`;