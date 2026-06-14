'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, User, Wifi, WifiOff, LogOut, ChevronDown, X } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/store/auth-store';

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
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/login');
  };

  // Search navigation — maps queries to routes
  const searchRoutes: { keywords: string[]; path: string; label: string }[] = [
    { keywords: ['dashboard', 'home'], path: '/', label: 'Dashboard' },
    { keywords: ['agent', 'bot'], path: '/agents', label: 'Agent Management' },
    { keywords: ['mission', 'task'], path: '/missions', label: 'Mission Control' },
    { keywords: ['task'], path: '/tasks', label: 'Task Management' },
    { keywords: ['event', 'stream', 'log'], path: '/events', label: 'Event Stream' },
    { keywords: ['orchestrat', 'collaborat'], path: '/orchestration', label: 'Orchestration Hub' },
    { keywords: ['intelligenc', 'knowledge', 'learn'], path: '/intelligence', label: 'Intelligence Center' },
    { keywords: ['swarm', 'consensus', 'topology'], path: '/swarm', label: 'Swarm Intelligence' },
    { keywords: ['secur', 'audit', 'threat'], path: '/security', label: 'Security Center' },
    { keywords: ['perform', 'cpu', 'memory', 'profile'], path: '/performance', label: 'Performance Monitor' },
    { keywords: ['admin', 'config', 'user', 'setting'], path: '/admin', label: 'Admin Panel' },
    { keywords: ['live', 'monitor', 'stream'], path: '/live', label: 'Live Monitor' },
  ];

  const searchResults = searchQuery.length >= 2
    ? searchRoutes.filter(r =>
        r.keywords.some(k => k.includes(searchQuery.toLowerCase())) ||
        r.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">
          AENEWS Agent OS X &middot; Enterprise Admin Platform
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          {searchOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-card shadow-xl shadow-black/20">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {searchResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto p-1">
                  {searchResults.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => handleSearchSelect(r.path)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-colors"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No pages found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Type to search pages...
                </div>
              )}
            </div>
          )}
        </div>

        {/* WebSocket Status */}
        <div className={`flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary/50 hover:text-foreground"
            title="Notifications coming soon"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-card shadow-xl shadow-black/20">
              <div className="border-b border-border px-4 py-3">
                <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              </div>
              <div className="p-6 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-xs text-muted-foreground">Notifications coming soon</p>
                <p className="text-[10px] text-muted-foreground/60">Real-time alerts will appear here</p>
              </div>
            </div>
          )}
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
  );
}
