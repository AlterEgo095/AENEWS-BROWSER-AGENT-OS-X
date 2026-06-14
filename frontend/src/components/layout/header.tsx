'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/agents': 'Agent Management',
  '/missions': 'Mission Control',
  '/tasks': 'Task Management',
  '/events': 'Event Stream',
  '/login': 'Authentication',
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">
          AENEWS Agent OS X &middot; Multi-Cluster AI Agent Platform
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

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary/50 hover:text-foreground">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            3
          </span>
        </button>

        {/* User */}
        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary/50">
          <User className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
