import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { ROLES, labelOf } from '../lib/format';
import { Icon } from './ui';

/**
 * Navigation, in the order a working day reaches for it. Each entry names
 * the permission it needs; entries the role lacks are not rendered at all,
 * rather than shown and refused.
 */
export const NAV = [
  {
    group: 'Today',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard', end: true },
      {
        to: '/reservations',
        label: 'Reservations',
        icon: 'reservations',
        permission: 'reservations:read',
      },
    ],
  },
  {
    group: 'Menu',
    items: [
      { to: '/menu', label: 'Dishes', icon: 'menu', permission: 'menu:availability' },
      { to: '/categories', label: 'Categories', icon: 'categories', permission: 'menu:write' },
    ],
  },
  {
    group: 'Spaces',
    items: [
      { to: '/rooms', label: 'Rooms & spaces', icon: 'rooms', permission: 'rooms:availability' },
    ],
  },
  {
    group: 'Website',
    items: [
      { to: '/content', label: 'Website content', icon: 'content', permission: 'content:write' },
      { to: '/media', label: 'Media library', icon: 'media', permission: 'media:write' },
      {
        to: '/promotions',
        label: 'Offers & events',
        icon: 'promotions',
        permission: 'promotions:write',
      },
      {
        to: '/testimonials',
        label: 'Testimonials',
        icon: 'testimonials',
        permission: 'testimonials:write',
      },
    ],
  },
  {
    group: 'Admin',
    items: [
      { to: '/users', label: 'Users & roles', icon: 'users', permission: 'users:manage' },
      { to: '/activity', label: 'Activity', icon: 'activity', permission: 'dashboard' },
    ],
  },
];

export function Sidebar({ onNavigate }) {
  const { can, user, logout } = useAuth();
  return (
    <div className="sidebar-inner">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          H
        </span>
        <span className="brand-text">
          <span className="brand-name">Hillsedge</span>
          <span className="brand-sub">Admin</span>
        </span>
      </div>

      <nav className="nav" aria-label="Admin sections">
        {NAV.map(({ group, items }) => {
          const visible = items.filter((item) => can(item.permission));
          if (!visible.length) return null;
          return (
            <div key={group} className="nav-group">
              <p className="nav-group-label">{group}</p>
              <ul>
                {visible.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <NavLink to="/account" className="nav-link nav-account" onClick={onNavigate}>
          <span className="avatar" aria-hidden="true">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="nav-account-text">
            <span className="nav-account-name">{user?.name}</span>
            <span className="nav-account-role">{labelOf(ROLES, user?.role)}</span>
          </span>
        </NavLink>
        <a className="nav-link" href="/" target="_blank" rel="noopener">
          <Icon name="external" />
          <span>View website</span>
        </a>
        <button type="button" className="nav-link" onClick={logout}>
          <Icon name="logout" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The signed-in frame: a fixed sidebar on wide screens, an off-canvas one
 * behind a top bar on phones and narrow tablets. On a dual-screen or
 * unfolded foldable the sidebar sits in the left segment (see admin.css).
 */
export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <button
          type="button"
          className="icon-btn topbar-menu"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(true)}
        >
          <Icon name="menuOpen" />
          <span className="sr-only">Open navigation</span>
        </button>
        <span className="topbar-brand">Hillsedge Admin</span>
      </header>
      <aside id="sidebar" className="sidebar" aria-label="Navigation">
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <main id="admin-main" className="main" tabIndex={-1}>
        {/* Inside the frame, so opening a screen for the first time keeps
            the navigation on screen while its code loads. */}
        <Suspense fallback={<div className="route-loading" role="status" aria-label="Loading" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default Layout;
