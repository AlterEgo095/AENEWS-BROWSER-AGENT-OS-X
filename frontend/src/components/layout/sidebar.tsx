'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Activity,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Rocket,
  Network,
  BrainCircuit,
  Bug,
  Gauge,
  Shield,
  Settings,
  Radio,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/missions', label: 'Missions', icon: Rocket },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/events', label: 'Events', icon: Activity },
  { href: '/live', label: 'Live Monitor', icon: Radio },
];

const intelligenceItems = [
  { href: '/orchestration', label: 'Orchestration', icon: Network },
  { href: '/intelligence', label: 'Intelligence', icon: BrainCircuit },
  { href: '/swarm', label: 'Swarm', icon: Bug },
];

const systemItems = [
  { href: '/admin', label: 'Admin Panel', icon: Settings },
  { href: '/security', label: 'Security', icon: Shield },
  { href: '/performance', label: 'Performance', icon: Gauge },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4 shrink-0">
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Main Section */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Main
            </p>
          )}
          <div className="flex flex-col gap-1">
            {mainNavItems.map((item) => {
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
          </div>
        </div>

        {/* Intelligence Section */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Intelligence
            </p>
          )}
          <div className="flex flex-col gap-1">
            {intelligenceItems.map((item) => {
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
          </div>
        </div>

        {/* System Section */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              System
            </p>
          )}
          <div className="flex flex-col gap-1">
            {systemItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/admin' && pathname.startsWith('/admin'));
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
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border p-3">
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>

        {/* Version badge */}
        {!collapsed && (
          <div className="mt-2 rounded-lg border border-border bg-white/5 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">SYSTEM VERSION</p>
            <p className="text-xs font-bold text-foreground">v3.2.0-ga</p>
          </div>
        )}
      </div>
    </aside>
  );
}
