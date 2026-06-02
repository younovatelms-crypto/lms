// src/components/shared/SidebarLayout.jsx
// Youva OS — Shared Sidebar Layout v2.0
//
// ✅ FIXES & ADDITIONS vs v1:
//   1. Mobile profile dropdown — click avatar in topbar → shows name/role/logout card
//   2. Submenu support — nav items with `children[]` expand inline (accordion style)
//   3. Mobile nav — hamburger opens full sidebar overlay; backdrop click closes
//   4. Submenu active state — parent link highlights when any child is active
//   5. Keyboard nav — Escape closes mobile sidebar AND profile dropdown
//   6. Click-outside closes profile dropdown (useClickOutside hook)
//   7. Route change auto-closes mobile sidebar AND profile dropdown
//   8. Collapsed sidebar shows submenu in tooltip-style flyout (desktop)
//   9. Mobile: collapse toggle hidden; sidebar always full-width when open
//  10. Smooth CSS transitions with prefers-reduced-motion support

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout, logoutUser, selectCurrentUser } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';

// ─── Role → brand colour ──────────────────────────────────────────────────────
const ROLE_COLOR = {
  admin:   '#3f7da0',
  trainer: '#3f7da0',
  trainee: '#3f7da0',
  hr:      '#3f7da0',
};

// ─── Internal context (avoids prop-drilling collapsed + brandColor) ───────────
const SidebarCtx = createContext({ collapsed: false, brandColor: '#6366F1' });

// ─── Tiny hook: run callback when user clicks outside a ref ──────────────────
function useClickOutside(ref, callback, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, callback, enabled]);
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, className = '', style = {} }) => (
  <i
    className={`ti ti-${name} ${className}`}
    style={{ fontSize: size, lineHeight: 1, display: 'inline-block', ...style }}
    aria-hidden="true"
  />
);

// ─── Single flat nav link (no children) ──────────────────────────────────────
const FlatLink = ({ item, closeMobile }) => {
  const { collapsed, brandColor } = useContext(SidebarCtx);
  return (
    <NavLink
      to={item.to}
      onClick={closeMobile}
      title={collapsed ? item.label : undefined}
      className="yn-navlink"
      style={({ isActive }) => ({
        '--active-bg':     isActive ? 'rgba(255,255,255,0.17)' : 'transparent',
        '--active-border': isActive ? '#ffffff'        : 'transparent',
        '--active-color':  isActive ? '#ffffff'         : '#c5d3e4',
      })}
    >
      <span className="yn-navlink-icon">
        <Icon name={item.icon} size={17} />
      </span>
      {!collapsed && (
        <>
          <span className="yn-navlink-text">{item.label}</span>
          {item.badge > 0 && (
            <span className="yn-badge">{item.badge > 99 ? '99+' : item.badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
};

// ─── Submenu parent + children ────────────────────────────────────────────────
// On desktop-collapsed: shows flyout on hover
// On desktop-expanded: accordion expand/collapse
// On mobile: accordion (collapsed prop ignored)
const SubMenu = ({ item, closeMobile }) => {
  const { collapsed, brandColor } = useContext(SidebarCtx);
  const location = useLocation();

  // Is any child currently active?
  const hasActiveChild = item.children.some(c =>
    location.pathname.startsWith(c.to)
  );

  const [open, setOpen] = useState(hasActiveChild);

  // Auto-open when navigating to a child
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const toggle = () => setOpen(o => !o);

  if (collapsed) {
    // Collapsed desktop: flyout on hover
    return (
      <div className="yn-submenu-flyout-wrap">
        <button
          className="yn-navlink yn-navlink-btn"
          title={item.label}
          style={{
            '--active-bg':     hasActiveChild ? 'rgba(255,255,255,0.17)' : 'transparent',
            '--active-border': hasActiveChild ? '#ffffff'        : 'transparent',
            '--active-color':  hasActiveChild ? '#f1f5f9'         : '#94a3b8',
          }}
        >
          <span className="yn-navlink-icon">
            <Icon name={item.icon} size={17} />
          </span>
        </button>
        {/* Flyout panel */}
        <div className="yn-flyout">
          <p className="yn-flyout-title">{item.label}</p>
          {item.children.map(c => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={closeMobile}
              className="yn-flyout-link"
              style={({ isActive }) => ({
                color:      isActive ? '#ffffff'  : '#c5d3e4',
                background: isActive ? 'rgba(255,255,255,0.17)' : 'transparent',
              })}
            >
              <Icon name={c.icon} size={14} style={{ marginRight: 8 }} />
              {c.label}
              {c.badge > 0 && (
                <span className="yn-badge" style={{ marginLeft: 'auto' }}>
                  {c.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  // Expanded desktop or mobile: accordion
  return (
    <div className="yn-submenu-wrap">
      <button
        className="yn-navlink yn-navlink-btn"
        onClick={toggle}
        aria-expanded={open}
        style={{
          '--active-bg':     hasActiveChild ? 'rgba(255,255,255,0.17)' : 'transparent',
          '--active-border': hasActiveChild ? '#ffffff'        : 'transparent',
          '--active-color':  hasActiveChild ? '#ffffff'         : '#c5d3e4',
        }}
      >
        <span className="yn-navlink-icon">
          <Icon name={item.icon} size={17} />
        </span>
        <span className="yn-navlink-text">{item.label}</span>
        {item.badge > 0 && (
          <span className="yn-badge">{item.badge}</span>
        )}
        <Icon
          name="chevron-down"
          size={14}
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Children */}
      <div
        className="yn-submenu-children"
        style={{ maxHeight: open ? `${item.children.length * 44}px` : '0px' }}
      >
        {item.children.map(c => (
          <NavLink
            key={c.to}
            to={c.to}
            onClick={closeMobile}
            className="yn-sub-link"
            style={({ isActive }) => ({
              color:      isActive ? '#ffffff'         : '#c5d3e4',
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #ffffff' : '2px solid transparent',
            })}
          >
            <Icon name={c.icon} size={14} style={{ marginRight: 8, flexShrink: 0 }} />
            <span className="yn-sub-link-text">{c.label}</span>
            {c.badge > 0 && (
              <span className="yn-badge" style={{ marginLeft: 'auto' }}>{c.badge}</span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

// ─── Nav section group ────────────────────────────────────────────────────────
const NavSection = ({ group, closeMobile }) => {
  const { collapsed } = useContext(SidebarCtx);
  const items = group.items || [group];
  return (
    <div className="yn-nav-section">
      {!collapsed && group.label && (
        <p className="yn-section-label">{group.label}</p>
      )}
      {items.map(item =>
        item.children?.length ? (
          <SubMenu key={item.label || item.to} item={item} closeMobile={closeMobile} />
        ) : (
          <FlatLink key={item.to} item={item} closeMobile={closeMobile} />
        )
      )}
    </div>
  );
};

// ─── Profile dropdown (topbar avatar click) ───────────────────────────────────
const ProfileDropdown = ({ user, brandColor, onLogout, loggingOut, onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="yn-profile-dropdown" role="menu" aria-label="User menu">
      {/* Header */}
      <div className="yn-profile-header" style={{ borderBottom: `3px solid ${brandColor}` }}>
        <div className="yn-profile-avatar" style={{ background: brandColor }}>
          {user?.name?.slice(0, 2).toUpperCase() || 'YN'}
        </div>
        <div className="yn-profile-info">
          <p className="yn-profile-name">{user?.name || 'User'}</p>
          <p className="yn-profile-role">{user?.role}</p>
          <p className="yn-profile-email">{user?.email || ''}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="yn-profile-actions">
        <button
          className="yn-profile-action"
          onClick={() => { navigate(`/${user?.role}/settings`); onClose(); }}
          role="menuitem"
        >
          <Icon name="settings" size={15} />
          <span>Settings</span>
        </button>
        <button
          className="yn-profile-action"
          onClick={() => { navigate(`/${user?.role}/profile`); onClose(); }}
          role="menuitem"
        >
          <Icon name="user-circle" size={15} />
          <span>My Profile</span>
        </button>
        {user?.isMentor && (
          <div className="yn-profile-mentor-badge">
            <Icon name="award" size={13} />
            <span>Mentor</span>
          </div>
        )}
      </div>

      <div className="yn-profile-divider" />

      <button
        className="yn-profile-logout"
        onClick={onLogout}
        disabled={loggingOut}
        role="menuitem"
      >
        <Icon name="logout" size={15} />
        <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
      </button>
    </div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function SidebarLayout({
  navItems,
  brandColor,
title = 'YouVA OS',
  pageTitle,
}) {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useAppSelector(selectCurrentUser);

  const resolvedColor = brandColor || ROLE_COLOR[user?.role] || '#6366F1';
  const initials      = user?.name?.slice(0, 2).toUpperCase() || 'YN';

  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen,setProfileOpen]= useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef  = useRef(null);
  const sidebarRef  = useRef(null);

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Escape key handler
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click-outside closes profile dropdown
  useClickOutside(profileRef, () => setProfileOpen(false), profileOpen);

  // Derived page title
  const currentLabel = (() => {
    if (pageTitle) return pageTitle;
    const allItems = navItems.flatMap(g => {
      const items = g.items || [g];
      return items.flatMap(i => i.children?.length ? i.children : [i]);
    });
    const match = allItems
      .filter(i => i.to)
      .sort((a, b) => b.to.length - a.to.length) // longest match first
      .find(i => location.pathname.startsWith(i.to));
    return match?.label || title;
  })();

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setProfileOpen(false);
    try {
      await dispatch(logoutUser());
    } finally {
      dispatch(logout());
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    }
  }, [dispatch, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarCtx.Provider value={{ collapsed, brandColor: resolvedColor }}>
      <style>{buildCSS(resolvedColor)}</style>

      <div className="yn-shell">

        {/* ── Mobile backdrop ── */}
        {mobileOpen && (
          <div
            className="yn-backdrop"
            onClick={closeMobile}
            role="presentation"
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          ref={sidebarRef}
          className={[
            'yn-sidebar',
            collapsed  ? 'yn-collapsed'    : '',
            mobileOpen ? 'yn-mobile-open'  : '',
          ].join(' ')}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Brand row */}
          <div className="yn-brand">
            <div className="yn-brand-logo">Y</div>
            {!collapsed && (
              <div className="yn-brand-text-container">
                <div className="yn-brand-main">YouVA OS</div>
                <div className="yn-brand-sub">{user?.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard` : 'Dashboard'}</div>
              </div>
            )}
            {/* Desktop: collapse toggle */}
            <button
              className="yn-collapse-btn yn-desktop-only"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={15} />
            </button>
            {/* Mobile: close button */}
            <button
              className="yn-collapse-btn yn-mobile-only"
              onClick={closeMobile}
              aria-label="Close navigation"
            >
              <Icon name="x" size={15} />
            </button>
          </div>

          {/* Nav scroll */}
          <div className="yn-nav-scroll">
            {navItems.map((group, gi) => (
              <NavSection key={gi} group={group} closeMobile={closeMobile} />
            ))}
          </div>

          {/* User footer (collapsed: just avatar) */}
          <div className="yn-sidebar-footer">
            {!collapsed ? (
              <div className="yn-footer-user">
                <div className="yn-footer-avatar" style={{ background: resolvedColor }}>
                  {initials}
                </div>
                <div className="yn-footer-info">
                  <p className="yn-footer-name">{user?.name || 'User'}</p>
                  <p className="yn-footer-role">{user?.role}</p>
                </div>
                <button
                  className="yn-footer-logout"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <Icon name="logout" size={16} />
                </button>
              </div>
            ) : (
              <button
                className="yn-footer-logout yn-footer-logout-solo"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <Icon name="logout" size={16} />
              </button>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="yn-main">

          {/* Top bar */}
          <header className="yn-topbar">
            <div className="yn-topbar-left">
              {/* Hamburger (mobile) */}
              <button
                className="yn-hamburger"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
              >
                <Icon name="menu-2" size={20} />
              </button>
              <h1 className="yn-page-title">{currentLabel}</h1>
            </div>

            <div className="yn-topbar-right">
              <button className="yn-icon-btn" aria-label="Search">
                <Icon name="search" size={16} />
              </button>
              <button className="yn-icon-btn yn-notif-wrap" aria-label="Notifications">
                <Icon name="bell" size={16} />
                <span className="yn-notif-dot" />
              </button>

              {/* Profile avatar + dropdown */}
              <div ref={profileRef} className="yn-profile-wrap">
                <button
                  className="yn-topbar-avatar"
                  style={{ background: resolvedColor }}
                  onClick={() => setProfileOpen(p => !p)}
                  aria-label="Open user menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  {initials}
                  <span
                    className="yn-avatar-caret"
                    style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <Icon name="chevron-down" size={10} />
                  </span>
                </button>

                {profileOpen && (
                  <ProfileDropdown
                    user={user}
                    brandColor={resolvedColor}
                    onLogout={handleLogout}
                    loggingOut={loggingOut}
                    onClose={() => setProfileOpen(false)}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="yn-content" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarCtx.Provider>
  );
}

// ─── CSS factory (injects brand color as CSS variable) ───────────────────────
function buildCSS(brandColor) {
  return `
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --yn-brand:    ${brandColor};
  --yn-sidebar:  #1f3d63;
  --yn-sidebar2: #26486f;
  --yn-sidebar-active: #48617f;
  --yn-text-1:   #ffffff;
  --yn-text-2:   #c5d3e4;
  --yn-text-3:   #9badc4;
  --yn-border:   rgba(255,255,255,0.14);
  --yn-page-bg:  #f5f8fc;
  --yn-line:     #dbe3ed;
  --yn-radius:   8px;
  --yn-font:     'Public Sans', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }

.yn-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: var(--yn-font);
  background: var(--yn-page-bg);
}

/* ── Backdrop ────────────────────────────────────────────────────────────── */
.yn-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(3px);
  z-index: 40;
  animation: yn-fade-in 0.2s ease;
}
@keyframes yn-fade-in { from { opacity:0 } to { opacity:1 } }

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.yn-sidebar {
  width: 228px;
  background: var(--yn-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 50;
  position: relative;
  border-right: 1px solid #c9d7e6;
}
.yn-sidebar.yn-collapsed { width: 64px; }

/* Brand */
.yn-brand {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 20px 20px 18px;
  border-bottom: 1px solid var(--yn-border);
  flex-shrink: 0;
}
.yn-brand-logo {
  display: none;
}
.yn-brand-text-container {
  flex: 1; 
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.yn-brand-main {
  color: var(--yn-text-1);
  font-weight: 800; 
  font-size: 20px;
  letter-spacing: 0;
  line-height: 1;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
}
.yn-brand-sub {
  color: var(--yn-text-3);
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.3px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
}
.yn-collapse-btn {
  background: none; border: none; cursor: pointer;
  color: #d7e2ef;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.yn-collapse-btn:hover { color: #fff; background: rgba(255,255,255,0.10); }

/* Nav scroll */
.yn-nav-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 12px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--yn-sidebar2) transparent;
}
.yn-nav-scroll::-webkit-scrollbar { width: 4px; }
.yn-nav-scroll::-webkit-scrollbar-thumb { background: var(--yn-sidebar2); border-radius: 4px; }

.yn-nav-section { padding: 4px 0; }
.yn-section-label {
  font-size: 12px; font-weight: 500; letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--yn-text-3);
  padding: 12px 16px 8px;
  white-space: nowrap; overflow: hidden;
}

/* Flat nav link */
.yn-navlink {
  display: flex; align-items: center;
  gap: 12px;
  padding: 11px 16px;
  text-decoration: none;
  font-size: 15px; font-weight: 700;
  white-space: nowrap; overflow: hidden;
  border-left: 0 solid transparent;
  background: var(--active-bg, transparent);
  color: var(--active-color, #94a3b8);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  cursor: pointer;
  width: 100%;
  font-family: var(--yn-font);
}
.yn-navlink:hover { background: rgba(255,255,255,0.08); color: #ffffff; }
.yn-navlink-btn { border: none; text-align: left; }
.yn-navlink-icon { width: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #7eb8d8; }
.yn-navlink:hover .yn-navlink-icon { color: #ffffff; }
.yn-navlink[style*="rgba(255,255,255,0.17)"] .yn-navlink-icon { color: #ffffff; }
.yn-navlink-text { flex: 1; overflow: hidden; text-overflow: ellipsis; }

/* Badge pill */
.yn-badge {
  font-size: 11px; font-weight: 800;
  background: #ef3b45; color: #fff;
  border-radius: 99px; padding: 1px 6px;
  flex-shrink: 0;
}

/* Submenu accordion */
.yn-submenu-wrap { position: relative; }
.yn-submenu-children {
  overflow: hidden;
  transition: max-height 0.25s cubic-bezier(0.4,0,0.2,1);
}
.yn-sub-link {
  display: flex; align-items: center;
  padding: 9px 14px 9px 52px;
  font-size: 14px; font-weight: 650;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap; overflow: hidden;
  font-family: var(--yn-font);
}
.yn-sub-link:hover { background: rgba(255,255,255,0.08); color: #ffffff; }
.yn-sub-link-text { overflow: hidden; text-overflow: ellipsis; flex: 1; }

/* Collapsed flyout */
.yn-submenu-flyout-wrap { position: relative; }
.yn-flyout {
  position: absolute;
  left: 100%; top: 0;
  background: #1f3d63;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  min-width: 180px;
  padding: 8px 0;
  z-index: 100;
  box-shadow: 0 16px 40px rgba(31,61,99,0.28);
  opacity: 0; pointer-events: none;
  transform: translateX(6px);
  transition: opacity 0.15s, transform 0.15s;
}
.yn-submenu-flyout-wrap:hover .yn-flyout {
  opacity: 1; pointer-events: auto; transform: translateX(2px);
}
.yn-flyout-title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.7px;
  text-transform: uppercase; color: var(--yn-text-3);
  padding: 4px 14px 8px;
}
.yn-flyout-link {
  display: flex; align-items: center;
  padding: 9px 14px;
  font-size: 13px; font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
  font-family: var(--yn-font);
}
.yn-flyout-link:hover { background: rgba(255,255,255,0.06); }

/* Sidebar footer */
.yn-sidebar-footer {
  border-top: 1px solid var(--yn-border);
  padding: 14px 12px;
  flex-shrink: 0;
}
.yn-footer-user {
  display: flex; align-items: center; gap: 10px; min-width: 0;
}
.yn-footer-avatar {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700;
}
.yn-footer-info { flex: 1; min-width: 0; overflow: hidden; }
.yn-footer-name {
  margin: 0; color: var(--yn-text-1);
  font-size: 13px; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.yn-footer-role {
  margin: 0; color: var(--yn-text-3);
  font-size: 11px; text-transform: capitalize; margin-top: 1px;
}
.yn-footer-logout {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.16);
  color: #ffffff;
  width: 34px; height: 34px;
  border-radius: 8px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.yn-footer-logout:hover:not(:disabled) { background: rgba(255,255,255,0.18); }
.yn-footer-logout:disabled { opacity: 0.6; cursor: not-allowed; }
.yn-footer-logout-solo { width: 100%; border-radius: 8px; }

/* ── Main area ───────────────────────────────────────────────────────────── */
.yn-main {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; min-width: 0;
}

/* Top bar */
.yn-topbar {
  height: 72px;
  background: #fff;
  border-bottom: 1px solid var(--yn-line);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 30px; flex-shrink: 0; z-index: 30;
}
.yn-topbar-left  { display: flex; align-items: center; gap: 12px; }
.yn-topbar-right { display: flex; align-items: center; gap: 14px; }

.yn-hamburger {
  display: none;
  background: none; border: none; cursor: pointer;
  color: #64748B; padding: 6px;
  border-radius: 8px;
  align-items: center; justify-content: center;
  transition: background 0.15s;
}
.yn-hamburger:hover { background: #F1F5F9; }

.yn-page-title {
  font-size: 18px; font-weight: 800; color: #050a16; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 280px;
}

.yn-icon-btn {
  width: 36px; height: 36px;
  background: none; border: none;
  border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: background 0.15s;
}
.yn-icon-btn:hover { background: #edf3f9; }

.yn-notif-wrap { position: relative; }
.yn-notif-dot {
  position: absolute; top: 8px; right: 8px;
  width: 7px; height: 7px;
  background: #EF4444; border-radius: 50%;
  border: 2px solid #fff;
}

/* Profile avatar + caret */
.yn-profile-wrap { position: relative; }
.yn-topbar-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 99px;
  border: none;
  cursor: pointer;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  font-family: var(--yn-font);
  transition: opacity 0.15s;
}

.yn-topbar-avatar:hover { opacity: 0.88; }
.yn-avatar-initials {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
}
.yn-avatar-caret { display: none; }

/* Profile dropdown */
.yn-profile-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 240px;
  background: #ffffff;
  border: 1px solid var(--yn-line);
  border-radius: var(--yn-radius);
  box-shadow: 0 18px 45px rgba(31,61,99,0.18);
  z-index: 200;
  animation: yn-dropdown-in 0.18s cubic-bezier(0.34,1.3,0.64,1);
  overflow: hidden;
}
@keyframes yn-dropdown-in {
  from { opacity:0; transform: scale(0.9) translateY(-6px); }
  to   { opacity:1; transform: scale(1)   translateY(0); }
}
.yn-profile-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
}
.yn-profile-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: 700;
  flex-shrink: 0;
}
.yn-profile-info { min-width: 0; }
.yn-profile-name {
  margin: 0; color: #172033;
  font-size: 14px; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.yn-profile-role {
  margin: 0; color: var(--yn-brand);
  font-size: 12px; text-transform: capitalize;
  font-weight: 600; margin-top: 2px;
}
.yn-profile-email {
  margin: 0; color: #657691;
  font-size: 11px; margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.yn-profile-actions { padding: 8px 8px 0; }
.yn-profile-action {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 10px; border: none; border-radius: 8px;
  background: none; cursor: pointer; color: #657691;
  font-size: 13px; font-weight: 500; font-family: var(--yn-font);
  text-align: left; transition: background 0.15s, color 0.15s;
}
.yn-profile-action:hover { background: #f4f8fc; color: #172033; }
.yn-profile-mentor-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(${brandColor.slice(1).match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.18);
  color: var(--yn-brand);
  padding: 4px 10px; border-radius: 99px;
  font-size: 11px; font-weight: 700;
  margin: 6px 10px 2px;
}
.yn-profile-divider {
  height: 1px; background: var(--yn-line); margin: 8px 0;
}
.yn-profile-logout {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 12px 18px 14px;
  border: none; background: none; cursor: pointer;
  color: #d92d28; font-size: 13px; font-weight: 700;
  font-family: var(--yn-font); text-align: left;
  transition: background 0.15s;
}
.yn-profile-logout:hover:not(:disabled) { background: #fff0f0; }
.yn-profile-logout:disabled { opacity: 0.6; cursor: not-allowed; }

/* Page content */
.yn-content { flex: 1; overflow-y: auto; overflow-x: hidden; background: var(--yn-page-bg); }

/* ── Visibility helpers ───────────────────────────────────────────────────── */
.yn-desktop-only { display: flex; }
.yn-mobile-only  { display: none; }

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .yn-sidebar {
    position: fixed; top: 0; left: 0; height: 100%;
    width: 260px !important;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
  }
  .yn-sidebar.yn-mobile-open { transform: translateX(0); }

  .yn-brand {
    padding: 16px 20px 14px;
  }
  .yn-brand-main {
    font-size: 18px;
  }
  .yn-brand-sub {
    font-size: 11px;
  }

  .yn-hamburger { display: flex; }
  .yn-desktop-only { display: none; }
  .yn-mobile-only  { display: flex; }
  .yn-main { width: 100%; }
  .yn-topbar {
    height: 62px;
    padding: 0 16px;
  }
  .yn-page-title {
    max-width: calc(100vw - 170px);
    font-size: 16px;
  }
  .yn-topbar-right {
    gap: 8px;
  }
  .yn-icon-btn {
    width: 34px;
    height: 34px;
  }
  .yn-topbar-avatar {
    width: 38px;
    height: 38px;
    font-size: 13px;
  }

  /* Profile dropdown: full-width on mobile */
  .yn-profile-dropdown {
    width: min(280px, calc(100vw - 24px));
    right: 0;
  }
}

@media (max-width: 420px) {
  .yn-topbar {
    padding: 0 12px;
  }
  .yn-icon-btn[aria-label="Search"] {
    display: none;
  }
  .yn-page-title {
    max-width: calc(100vw - 126px);
  }
}

/* ── Reduced motion ─────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .yn-sidebar, .yn-backdrop, .yn-profile-dropdown, .yn-submenu-children {
    transition: none; animation: none;
  }
}
`;
}
