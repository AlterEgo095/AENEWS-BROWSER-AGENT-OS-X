'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Activity,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Rocket,
  Network,
  BrainCircuit,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/missions', label: 'Missions', icon: Rocket },
  { href: '/orchestration', label: 'Orchestration', icon: Network },
  { href: '/intelligence', label: 'Intelligence', icon: BrainCircuit },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/events', label: 'Events', icon: Activity },
  { href: '/login', label: 'Login', icon: LogIn },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <Hexagon className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="truncate text-sm font-bold text-foreground">AENEWS</h1>
              <p className="truncate text-[10px] text-muted-foreground">Agent OS X</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-sidebar-foreground group-hover:text-foreground'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Version badge */}
      {!collapsed && (
        <div className="absolute bottom-14 left-0 right-0 px-4">
          <div className="rounded-lg border border-border bg-white/5 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">SYSTEM VERSION</p>
            <p className="text-xs font-bold text-foreground">v3.0.0-alpha</p>
          </div>
        </div>
      )}
    </aside>
  );
}
