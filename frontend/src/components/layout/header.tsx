'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, User, Wifi, WifiOff, LogOut, ChevronDown } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/store/auth-store';
import { SearchDialog, useSearchShortcut } from '@/components/layout/search-dialog';
import { NotificationPanel, NotificationBadge } from '@/components/layout/notification-panel';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agent Management',
  '/missions': 'Mission Control',
  '/tasks': 'Task Management',
  '/events': 'Event Stream',
  '/login': 'Authentication',
  '/orchestration': 'Orchestration Hub',
  '/intelligence': 'Intelligence Center',
  '/swarm': 'Swarm Intelligence',
  '/security': 'Security Center',
  '/performance': 'Performance Monitor',
  '/admin': 'Admin Panel',
  '/admin/users': 'User Management',
  '/admin/infrastructure': 'Infrastructure',
  '/admin/config': 'Configuration',
  '/admin/analytics': 'Analytics',
  '/live': 'Live Monitor',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || (pathname.startsWith('/admin') ? 'Admin Panel' : 'Dashboard');
  const { connected } = useWebSocket();
  const { user, hydrate, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search keyboard shortcut (Cmd+K / Ctrl+K)
  const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
  useSearchShortcut(handleOpenSearch);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            AENEWS Agent OS X &middot; Enterprise Admin Platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* WebSocket Status */}
          <div className={`flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{connected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary/50 hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <NotificationBadge />
            </button>

            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          {/* User Menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 transition-colors hover:border-primary/50"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                {user?.firstName?.[0]?.toUpperCase() || 'A'}
              </div>
              {user && (
                <span className="hidden md:inline text-xs text-foreground">
                  {user.firstName}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/20">
                {/* User info */}
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {user?.firstName?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user ? `${user.firstName} ${user.lastName}` : 'Admin User'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user?.email || 'admin@aenews.io'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); router.push('/admin'); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Dialog (rendered as portal overlay) */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
