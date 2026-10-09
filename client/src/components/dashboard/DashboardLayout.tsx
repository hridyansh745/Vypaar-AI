import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, Bot, Building2, Calendar, ChevronLeft, ChevronRight, CircleHelp, Flame,
  LayoutDashboard, LogOut, Menu, Percent, Search, Settings, ShoppingCart, Truck, X,
} from 'lucide-react';
import { VyaparAILogo } from '../VyaparAILogo';
import { LanguageSelector } from '../LanguageSelector';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { buildNotifications } from '../../lib/demoData';
import { cn } from '../../lib/utils';

export const DASH_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav2.overview', end: true },
  { to: '/dashboard/company', icon: Building2, key: 'nav2.company' },
  { to: '/dashboard/sales', icon: ShoppingCart, key: 'nav2.sales' },
  { to: '/dashboard/offers', icon: Percent, key: 'nav2.offers' },
  { to: '/dashboard/orders', icon: Truck, key: 'nav2.orders' },
  { to: '/dashboard/assistant', icon: Bot, key: 'nav2.assistant' },
];

export function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(() => buildNotifications(t), [t]);
  const unread = notifications.filter((n) => !readIds.includes(n.id));

  const isDemo = Boolean(user?.demo);
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const onSignOut = async () => {
    await logout();
    toast.info(t('dash.signOut'));
    navigate('/login', { replace: true });
  };

  const sidebar = (mobile = false) => (
    <div className={cn('flex h-full flex-col bg-[#111111]', mobile ? 'w-72' : collapsed ? 'w-[72px]' : 'w-64')}>
      <div className={cn('flex items-center px-4 pb-3 pt-5', collapsed && !mobile && 'justify-center px-0')}>
        <NavLink to="/dashboard" aria-label="VyaparAI">
          <VyaparAILogo size={collapsed && !mobile ? 'sm' : 'md'} showWordmark={!collapsed || mobile} />
        </NavLink>
        {!mobile && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ms-auto hidden rounded-lg border border-line p-1.5 text-muted transition hover:border-brand/40 hover:text-brand lg:block"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
        {mobile && (
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t('common.close')} className="ms-auto rounded-lg p-2 text-muted hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mx-4 mb-3 h-px bg-line" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label={t('nav2.dashboard')}>
        {DASH_NAV.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed && !mobile ? t(key) : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand/12 text-brand shadow-[inset_0_0_0_1px_rgba(255,212,59,0.25)]'
                  : 'text-white/70 hover:bg-white/5 hover:text-white',
                collapsed && !mobile && 'justify-center px-0',
              )
            }
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {(!collapsed || mobile) && <span className="truncate">{t(key)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 my-2 h-px bg-line" />

      <div className="space-y-1 px-3 pb-4">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-brand/12 text-brand' : 'text-white/70 hover:bg-white/5 hover:text-white',
              collapsed && !mobile && 'justify-center px-0',
            )
          }
        >
          <Settings size={18} className="shrink-0" aria-hidden="true" />
          {(!collapsed || mobile) && <span>{t('nav2.settings')}</span>}
        </NavLink>
        <NavLink
          to="/dashboard/help"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-brand/12 text-brand' : 'text-white/70 hover:bg-white/5 hover:text-white',
              collapsed && !mobile && 'justify-center px-0',
            )
          }
        >
          <CircleHelp size={18} className="shrink-0" aria-hidden="true" />
          {(!collapsed || mobile) && <span>{t('nav2.help')}</span>}
        </NavLink>

        {(!collapsed || mobile) && (
          <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted">
            {t('common.tagline')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-e border-line lg:block">
        {sidebar(false)}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="animate-slide-in absolute inset-y-0 start-0 border-e border-line shadow-2xl">
            {sidebar(true)}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-line p-2 text-muted transition hover:text-white lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-semibold text-white">
                {t('dash2.welcomeBusiness', { business: user?.businessName || user?.name || '—' })}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Calendar size={12} aria-hidden="true" />
                {dateStr}
              </p>
            </div>

            {/* Search */}
            <div className="relative ms-auto hidden max-w-xs flex-1 sm:block">
              <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    navigate(`/dashboard/sales?q=${encodeURIComponent(query.trim())}`);
                    setQuery('');
                  }
                }}
                placeholder={t('dash2.searchPh')}
                aria-label={t('dash2.searchPh')}
                className="w-full rounded-xl border border-line bg-charcoal/80 py-2 pe-3 ps-9 text-sm text-white placeholder:text-muted/70 focus:border-brand/40 focus:outline-none"
              />
            </div>

            {isDemo && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">
                <Flame size={12} aria-hidden="true" />
                Demo
              </span>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={t('dash2.notifications')}
                aria-expanded={notifOpen}
                className="relative rounded-xl border border-line bg-charcoal/80 p-2 text-white/80 transition hover:border-line-strong hover:text-white"
              >
                <Bell size={17} aria-hidden="true" />
                {unread.length > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">
                    {unread.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="animate-slide-in absolute end-0 z-50 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-line bg-raised shadow-2xl shadow-black/60">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <p className="text-sm font-semibold text-white">{t('dash2.notifications')}</p>
                    <button
                      type="button"
                      onClick={() => setReadIds(notifications.map((n) => n.id))}
                      className="text-xs text-brand hover:underline"
                    >
                      {t('dash2.markAllRead')}
                    </button>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {unread.length === 0 && (
                      <li className="px-4 py-6 text-center text-sm text-muted">{t('dash2.allRead')}</li>
                    )}
                    {unread.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setReadIds((r) => [...r, n.id]);
                            setNotifOpen(false);
                            navigate(n.link);
                          }}
                          className="flex w-full items-start gap-2.5 border-b border-line/60 px-4 py-3 text-start transition last:border-0 hover:bg-white/5"
                        >
                          <span
                            className={cn(
                              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                              n.tone === 'danger' && 'bg-danger',
                              n.tone === 'warn' && 'bg-brand',
                              n.tone === 'info' && 'bg-info',
                              n.tone === 'success' && 'bg-success',
                            )}
                            aria-hidden="true"
                          />
                          <span className="text-xs leading-relaxed text-white/85">{t(n.key, n.params)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <LanguageSelector compact />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label={t('dash2.profile')}
                className="flex items-center gap-2 rounded-xl border border-line bg-charcoal/80 p-1.5 transition hover:border-line-strong"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-xs font-bold text-brand">
                  {(user?.name || 'U').slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate px-1 text-xs font-medium text-white/85 sm:block">
                  {user?.name}
                </span>
              </button>
              {profileOpen && (
                <div className="animate-slide-in absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-raised p-1.5 shadow-2xl shadow-black/60">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="font-mono text-[11px] text-muted">{user?.userId}</p>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <NavLink to="/dashboard/company" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/5">
                    {t('nav2.company')}
                  </NavLink>
                  <NavLink to="/dashboard/settings" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/5">
                    {t('nav2.settings')}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
                  >
                    <LogOut size={14} aria-hidden="true" />
                    {t('dash.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet context={{ rangeQuery: query }} />
        </main>

        <footer className="border-t border-line px-6 py-4 text-[11px] text-muted">
          VyaparAI · {t('common.tagline')}
          {isDemo && ` · ${t('common.demoMode')}`}
        </footer>
      </div>
    </div>
  );
}

export default DashboardLayout;
