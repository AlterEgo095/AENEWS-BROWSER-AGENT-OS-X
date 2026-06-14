'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, User, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';

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
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || (pathname.startsWith('/admin') ? 'Admin Panel' : 'Dashboard');
  const { connected } = useWebSocket();
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
        <button className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
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
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary/50 hover:text-foreground">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            3
          </span>
        </button>

        {/* User */}
        <button className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 transition-colors hover:border-primary/50">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
            {user?.firstName?.[0]?.toUpperCase() || 'A'}
          </div>
          {user && (
            <span className="hidden md:inline text-xs text-foreground">
              {user.firstName}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
