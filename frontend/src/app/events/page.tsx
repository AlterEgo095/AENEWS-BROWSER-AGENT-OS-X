'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Filter,
  Info,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { mockEvents } from '@/lib/mock-data';
import { cn, severityColors, formatRelativeTime } from '@/lib/utils';
import type { Event, EventSeverity } from '@/lib/types';
import { EventSeverity as ES } from '@/lib/types';

const severityOptions: { value: EventSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severity' },
  ...Object.values(ES).map((s) => ({ value: s, label: s })),
];

const namespaceOptions = [
  '',
  'agent.lifecycle',
  'agent.registry',
  'task.execution',
  'infrastructure',
  'security',
  'system',
];

const severityIcons: Record<EventSeverity, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: ShieldAlert,
};

const severityBgColors: Record<EventSeverity, string> = {
  info: 'bg-blue-500/10',
  warning: 'bg-amber-500/10',
  error: 'bg-red-500/10',
  critical: 'bg-red-600/20',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | ''>('');
  const [namespaceFilter, setNamespaceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter, namespaceFilter]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params: { severity?: string; namespace?: string } = {};
      if (severityFilter) params.severity = severityFilter;
      if (namespaceFilter) params.namespace = namespaceFilter;
      const result = await api.getEvents(params);
      setEvents(result.data || []);
    } catch {
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !searchQuery ||
      event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.namespace.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const infoCount = events.filter((e) => e.severity === 'info').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;
  const errorCount = events.filter((e) => e.severity === 'error').length;
  const criticalCount = events.filter((e) => e.severity === 'critical').length;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Stream</h1>
          <p className="text-sm text-muted-foreground">
            Real-time event monitoring and audit trail
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Severity Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-blue-400">Info</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-400">{infoCount}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-400">Warning</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-400">{warningCount}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-400">Error</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-400">{errorCount}</p>
        </div>
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-300" />
            <p className="text-xs text-red-300">Critical</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-300">{criticalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events by type, source, namespace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {namespaceOptions.map((ns) => (
              <option key={ns} value={ns}>
                {ns || 'All Namespaces'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | '')}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {severityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {(severityFilter || namespaceFilter || searchQuery) && (
          <button
            onClick={() => {
              setSeverityFilter('');
              setNamespaceFilter('');
              setSearchQuery('');
            }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Filter className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Event List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto space-y-2">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No events found</p>
          <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false);
  const SeverityIcon = severityIcons[event.severity];

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/20',
        severityBgColors[event.severity]
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            severityBgColors[event.severity]
          )}
        >
          <SeverityIcon
            className={cn(
              'h-4 w-4',
              event.severity === 'info'
                ? 'text-blue-400'
                : event.severity === 'warning'
                ? 'text-amber-400'
                : event.severity === 'error'
                ? 'text-red-400'
                : 'text-red-300'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{event.type}</p>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                severityColors[event.severity]
              )}
            >
              {event.severity}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{event.namespace}</span>
            <span className="text-[10px] text-muted-foreground/60">from {event.source}</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(event.createdAt)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="rounded-lg bg-background/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">
              Payload
            </p>
            <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
          {event.tenantId && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Tenant: <span className="font-mono">{event.tenantId}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
