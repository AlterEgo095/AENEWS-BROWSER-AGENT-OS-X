'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Bot, Target, LayoutGrid, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent, Mission } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'agent' | 'mission' | 'cluster' | 'page';
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  badge?: string;
}

const CLUSTER_LABELS: Record<string, string> = {
  browser: 'Browser',
  computer: 'Computer',
  coding: 'Coding',
  office: 'Office',
  marketing: 'Marketing',
  business: 'Business',
  infrastructure: 'Infrastructure',
  security: 'Security',
  'meta-intelligence': 'Meta Intelligence',
  'llm-intelligence': 'LLM Intelligence',
  'intelligent-orchestration': 'Intelligent Orchestration',
  watchdog: 'Watchdog',
  'self-evolution': 'Self Evolution',
  certification: 'Certification',
};

// ─── Quick navigation pages ─────────────────────────────────────────
const QUICK_PAGES: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Dashboard', description: 'Main dashboard overview', link: '/', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-agents', type: 'page', title: 'Agent Management', description: 'Manage and monitor agents', link: '/agents', icon: <Bot className="h-4 w-4" /> },
  { id: 'page-missions', type: 'page', title: 'Mission Control', description: 'Mission planning & execution', link: '/missions', icon: <Target className="h-4 w-4" /> },
  { id: 'page-orchestration', type: 'page', title: 'Orchestration Hub', description: 'Agent collaboration & orchestration', link: '/orchestration', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-intelligence', type: 'page', title: 'Intelligence Center', description: 'Knowledge graph & learning', link: '/intelligence', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-swarm', type: 'page', title: 'Swarm Intelligence', description: 'Swarm coordination & consensus', link: '/swarm', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-security', type: 'page', title: 'Security Center', description: 'Security audit & threats', link: '/security', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-performance', type: 'page', title: 'Performance Monitor', description: 'System performance metrics', link: '/performance', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'page-live', type: 'page', title: 'Live Monitor', description: 'Real-time event stream', link: '/live', icon: <LayoutGrid className="h-4 w-4" /> },
];

// ─── Component ──────────────────────────────────────────────────────
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(QUICK_PAGES);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults(QUICK_PAGES);
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const performSearch = useCallback(async (q: string): Promise<SearchResult[]> => {
    const lower = q.toLowerCase();
    const out: SearchResult[] = [];

    // Search agents
    try {
      const agentsRes = await api.getAgents({ limit: 50 });
      const matchedAgents = agentsRes.data.filter(
        (a: Agent) =>
          a.name.toLowerCase().includes(lower) ||
          a.cluster.toLowerCase().includes(lower) ||
          a.description?.toLowerCase().includes(lower) ||
          a.capabilities.some((c) => c.toLowerCase().includes(lower))
      );
      for (const agent of matchedAgents.slice(0, 8)) {
        out.push({
          id: `agent-${agent.id}`,
          type: 'agent',
          title: agent.name,
          description: agent.description || `${CLUSTER_LABELS[agent.cluster] || agent.cluster} agent`,
          link: `/agents`,
          icon: <Bot className="h-4 w-4" />,
          badge: agent.status,
        });
      }
    } catch {
      // Agent search failed, continue
    }

    // Search missions
    try {
      const missionsRes = await api.getMissions({ limit: 50 });
      const matchedMissions = missionsRes.data.filter(
        (m: Mission) =>
          m.name.toLowerCase().includes(lower) ||
          m.description.toLowerCase().includes(lower) ||
          m.state.toLowerCase().includes(lower)
      );
      for (const mission of matchedMissions.slice(0, 8)) {
        out.push({
          id: `mission-${mission.id}`,
          type: 'mission',
          title: mission.name,
          description: mission.description.slice(0, 80) + (mission.description.length > 80 ? '...' : ''),
          link: `/missions`,
          icon: <Target className="h-4 w-4" />,
          badge: mission.state,
        });
      }
    } catch {
      // Mission search failed, continue
    }

    // Search clusters (from agent stats)
    try {
      const stats = await api.getAgentStats();
      const matchedClusters = stats.filter(
        (s) =>
          s.cluster.toLowerCase().includes(lower) ||
          (CLUSTER_LABELS[s.cluster]?.toLowerCase() || '').includes(lower)
      );
      for (const cluster of matchedClusters.slice(0, 5)) {
        out.push({
          id: `cluster-${cluster.cluster}`,
          type: 'cluster',
          title: CLUSTER_LABELS[cluster.cluster] || cluster.cluster,
          description: `${cluster.activeAgents} active / ${cluster.totalAgents} total agents`,
          link: `/agents`,
          icon: <LayoutGrid className="h-4 w-4" />,
          badge: `${cluster.totalAgents}`,
        });
      }
    } catch {
      // Cluster search failed, continue
    }

    // Also search quick pages
    const matchedPages = QUICK_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
    );
    for (const page of matchedPages) {
      if (!out.some((r) => r.id === page.id)) {
        out.push(page);
      }
    }

    return out;
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    router.push(result.link);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, missions, clusters..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <>
              {query.length < 2 && (
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Navigation
                </div>
              )}
              {results.map((result, index) => (
                <button
                  key={result.id}
                  data-index={index}
                  onClick={() => handleSelect(result)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-primary/10 text-foreground'
                      : 'text-foreground hover:bg-primary/5'
                  }`}
                >
                  <span className={`flex-shrink-0 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                    {result.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{result.title}</span>
                      {result.badge && (
                        <span className="flex-shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {result.badge}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{result.description}</p>
                  </div>
                  <span className={`flex-shrink-0 text-muted-foreground ${index === selectedIndex ? 'opacity-100' : 'opacity-0'}`}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : (
            <div className="py-8 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground/60">Try searching for agents, missions, or clusters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/10 px-1 py-0.5">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/10 px-1 py-0.5">↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/10 px-1 py-0.5">esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard Shortcut Hook ─────────────────────────────────────────
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpen]);
}
