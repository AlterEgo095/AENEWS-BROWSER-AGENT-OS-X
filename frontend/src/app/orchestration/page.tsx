'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Network,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Unplug,
  Layers,
  Zap,
  ArrowRight,
  Clock,
  TrendingUp,
  BarChart3,
  Target,
  GitBranch,
  Send,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

import {
  cn,
  clusterIcons,
  clusterColors,
  collaborationPatternColors,
  collaborationPatternIcons,
  clusterHealthStatusColors,
  clusterHealthDotColors,
  connectorModeColors,
  formatRelativeTime,
} from '@/lib/utils';
import type {
  ClusterHealthInfo,
  UnifiedConnectorInfo,
  OrchestrationStatistics,
  OrchestrationHistoryItem,
  CollaborationPattern,
  DecompositionResult,
  CollaborationResult,
  ClusterType,
} from '@/lib/types';
import { ClusterType as CT } from '@/lib/types';
import { useWebSocket } from '@/hooks/use-websocket';

// Cluster label map
const clusterLabels: Record<ClusterType, string> = {
  [CT.BROWSER]: 'Browser',
  [CT.COMPUTER]: 'Computer',
  [CT.CODING]: 'Coding',
  [CT.OFFICE]: 'Office',
  [CT.MARKETING]: 'Marketing',
  [CT.BUSINESS]: 'Business',
  [CT.INFRASTRUCTURE]: 'Infrastructure',
  [CT.SECURITY]: 'Security',
  [CT.META_INTELLIGENCE]: 'Meta Intelligence',
  [CT.LLM_INTELLIGENCE]: 'LLM Intelligence',
  [CT.INTELLIGENT_ORCHESTRATION]: 'Intelligent Orchestration',
  [CT.WATCHDOG]: 'Watchdog',
  [CT.SELF_EVOLUTION]: 'Self Evolution',
  [CT.CERTIFICATION]: 'Certification',
  [CT.STEALTH_OPS]: 'Stealth Ops',
};

// Pattern labels
const patternLabels: Record<CollaborationPattern, string> = {
  delegation: 'Delegation',
  handoff: 'Handoff',
  parallel: 'Parallel',
  pipeline: 'Pipeline',
  consensus: 'Consensus',
  swarm: 'Swarm',
};

// Status icon helper
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
    case 'connected':
    case 'completed':
    case 'active':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'degraded':
    case 'initializing':
    case 'coordinating':
    case 'running':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'critical':
    case 'error':
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'offline':
    case 'disconnected':
    case 'passive':
      return <Unplug className="h-4 w-4 text-gray-400" />;
    default:
      return <Activity className="h-4 w-4 text-slate-400" />;
  }
}

// ---------- Cluster Health Card ----------
function ClusterHealthCard({ info }: { info: ClusterHealthInfo }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{clusterIcons[info.cluster]}</span>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {clusterLabels[info.cluster] || info.cluster.replace(/-/g, ' ')}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {info.activeAgents}/{info.totalAgents} agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', clusterHealthDotColors[info.status])} />
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
              clusterHealthStatusColors[info.status]
            )}
          >
            {info.status}
          </span>
        </div>
      </div>
      {/* Health Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Health</span>
          <span className={cn(
            'font-semibold',
            info.health >= 90 ? 'text-emerald-400' : info.health >= 60 ? 'text-amber-400' : 'text-red-400'
          )}>
            {info.health}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              info.health >= 90 ? 'bg-emerald-400' : info.health >= 60 ? 'bg-amber-400' : 'bg-red-400'
            )}
            style={{ width: `${info.health}%` }}
          />
        </div>
      </div>
      {/* Stats Row */}
      <div className="mt-3 flex gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-emerald-400" />
          <span className="text-[11px] text-muted-foreground">{info.activeTasks} active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-cyan-400" />
          <span className="text-[11px] text-muted-foreground">{info.completedTasks} done</span>
        </div>
        {info.failedTasks > 0 && (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-[11px] text-red-400">{info.failedTasks} fail</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[10px] text-muted-foreground/60">avg {info.avgResponseTime}ms</span>
      </div>
    </div>
  );
}

// ---------- Connector Card ----------
function ConnectorCard({ connector }: { connector: UnifiedConnectorInfo }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            connector.status === 'connected' ? 'bg-emerald-500/15' :
            connector.status === 'error' ? 'bg-red-500/15' :
            connector.status === 'initializing' ? 'bg-amber-500/15' :
            'bg-gray-500/15'
          )}>
            <Cpu className={cn(
              'h-4 w-4',
              connector.status === 'connected' ? 'text-emerald-400' :
              connector.status === 'error' ? 'text-red-400' :
              connector.status === 'initializing' ? 'text-amber-400' :
              'text-gray-400'
            )} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{connector.name}</p>
            <p className="text-[10px] text-muted-foreground">{connector.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            connectorModeColors[connector.mode]
          )}>
            {connector.mode}
          </span>
          <StatusIcon status={connector.status} />
        </div>
      </div>
      {/* Health & Stats */}
      <div className="mt-2.5 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Health</span>
            <span className={cn(
              'font-semibold',
              connector.health >= 90 ? 'text-emerald-400' :
              connector.health >= 60 ? 'text-amber-400' :
              connector.health > 0 ? 'text-red-400' : 'text-gray-500'
            )}>
              {connector.health}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/5">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                connector.health >= 90 ? 'bg-emerald-400' :
                connector.health >= 60 ? 'bg-amber-400' :
                connector.health > 0 ? 'bg-red-400' : 'bg-gray-500'
              )}
              style={{ width: `${connector.health}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Hit Rate</p>
          <p className="text-xs font-semibold text-foreground">{connector.hitRate}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Execs</p>
          <p className="text-xs font-semibold text-foreground">{connector.totalExecutions.toLocaleString()}</p>
        </div>
      </div>
      {/* Capabilities */}
      <div className="mt-2 flex flex-wrap gap-1">
        {connector.capabilities.slice(0, 3).map((cap) => (
          <span key={cap} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {cap}
          </span>
        ))}
        {connector.capabilities.length > 3 && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            +{connector.capabilities.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Statistics Overview Card ----------
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'text-primary',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', color.replace('text-', 'bg-') + '/15')}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  );
}

// ---------- History Item ----------
function HistoryItem({ item }: { item: OrchestrationHistoryItem }) {
  const typeColors: Record<string, string> = {
    collaboration: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    decomposition: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    coordination: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  const statusColorMap: Record<string, string> = {
    completed: 'text-emerald-400',
    running: 'text-amber-400',
    failed: 'text-red-400',
    coordinating: 'text-amber-400',
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/20">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase', typeColors[item.type])}>
            {item.type}
          </span>
          {item.pattern && (
            <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase', collaborationPatternColors[item.pattern])}>
              {collaborationPatternIcons[item.pattern]} {patternLabels[item.pattern]}
            </span>
          )}
          <span className={cn('text-[10px] font-medium', statusColorMap[item.status] || 'text-slate-400')}>
            {item.status}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
        {formatRelativeTime(item.createdAt)}
      </span>
    </div>
  );
}

// ---------- Pattern Usage Bar ----------
function PatternUsageBar({ pattern, count, max }: { pattern: CollaborationPattern; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-28 shrink-0">
        <span className="text-sm">{collaborationPatternIcons[pattern]}</span>
        <span className="text-xs font-medium text-foreground">{patternLabels[pattern]}</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-white/5">
        <div
          className={cn('h-full rounded-full transition-all duration-500', collaborationPatternColors[pattern].split(' ')[0])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-12 text-right">{count}</span>
    </div>
  );
}

// ---------- Main Page ----------
export default function OrchestrationPage() {
  // Data states
  const [clusterHealth, setClusterHealth] = useState<ClusterHealthInfo[]>([]);
  const [connectors, setConnectors] = useState<UnifiedConnectorInfo[]>([]);
  const [stats, setStats] = useState<OrchestrationStatistics | null>(null);
  const [history, setHistory] = useState<OrchestrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [decomposeDesc, setDecomposeDesc] = useState('');
  const [decomposeObjectives, setDecomposeObjectives] = useState('');
  const [decomposeResult, setDecomposeResult] = useState<DecompositionResult | null>(null);
  const [decomposing, setDecomposing] = useState(false);

  const [collabPattern, setCollabPattern] = useState<CollaborationPattern>('pipeline');
  const [collabDesc, setCollabDesc] = useState('');
  const [collabObjectives, setCollabObjectives] = useState('');
  const [collabResult, setCollabResult] = useState<CollaborationResult | null>(null);
  const [launchingCollab, setLaunchingCollab] = useState(false);

  // Active section for tab-like navigation
  const [activeSection, setActiveSection] = useState<'overview' | 'decompose' | 'collaborate'>('overview');

  // WebSocket for live updates
  const { subscribe, unsubscribe, lastEvent } = useWebSocket();

  const handleOrchestrationEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    if (event.type === 'orchestration:collaboration' || event.type === 'orchestration:coordination') {
      // Refresh history on live events
      fetchHistory();
    }
  }, []);

  useEffect(() => {
    subscribe('orchestration:collaboration', handleOrchestrationEvent);
    subscribe('orchestration:coordination', handleOrchestrationEvent);
    return () => {
      unsubscribe('orchestration:collaboration', handleOrchestrationEvent);
      unsubscribe('orchestration:coordination', handleOrchestrationEvent);
    };
  }, [subscribe, unsubscribe, handleOrchestrationEvent]);

  // Log last event for debugging
  useEffect(() => {
    if (lastEvent?.type?.startsWith('orchestration:')) {
      // Live event received — could show toast
    }
  }, [lastEvent]);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.orchestration.getClusterHealth(),
        api.orchestration.getConnectors(),
        api.orchestration.getStatistics(),
        api.orchestration.getHistory(undefined, 10),
      ]);

      if (results[0].status === 'fulfilled') setClusterHealth(results[0].value);

      if (results[1].status === 'fulfilled') setConnectors(results[1].value);

      if (results[2].status === 'fulfilled') setStats(results[2].value);

      if (results[3].status === 'fulfilled') setHistory(results[3].value);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    try {
      const result = await api.orchestration.getHistory(undefined, 10);
      setHistory(result);
    } catch {
      // keep existing
    }
  }

  async function handleDecompose() {
    if (!decomposeDesc.trim()) return;
    setDecomposing(true);
    setDecomposeResult(null);
    try {
      const objectives = decomposeObjectives
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      const result = await api.orchestration.decompose(null, decomposeDesc, objectives);
      setDecomposeResult(result);
    } catch {
      // Decomposition failed
      setDecomposeResult(null);
    } finally {
      setDecomposing(false);
    }
  }

  async function handleCollaborate() {
    if (!collabDesc.trim()) return;
    setLaunchingCollab(true);
    setCollabResult(null);
    try {
      const objectives = collabObjectives
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      const result = await api.orchestration.collaborate(collabPattern, collabDesc, objectives);
      setCollabResult(result);
    } catch {
      // Collaboration failed
      setCollabResult(null);
    } finally {
      setLaunchingCollab(false);
    }
  }

  const healthyClusters = clusterHealth.filter((c) => c.status === 'healthy').length;
  const connectedConnectors = connectors.filter((c) => c.status === 'connected').length;
  const maxPatternUsage = stats ? Math.max(...Object.values(stats.patternUsage)) : 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-shimmer rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intelligent Orchestration</h1>
          <p className="text-sm text-muted-foreground">
            Phase 8 — Cluster health, connector management & multi-agent collaboration
          </p>
        </div>
        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {([
          { key: 'overview', label: 'Overview', icon: Network },
          { key: 'decompose', label: 'Decompose', icon: GitBranch },
          { key: 'collaborate', label: 'Collaborate', icon: Layers },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeSection === tab.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW SECTION ====== */}
      {activeSection === 'overview' && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Healthy Clusters"
              value={`${healthyClusters}/${clusterHealth.length}`}
              subtitle="System-wide health"
              icon={CheckCircle2}
              color="text-emerald-400"
            />
            <StatCard
              title="Connected"
              value={`${connectedConnectors}/${connectors.length}`}
              subtitle="Unified connectors"
              icon={Unplug}
              color="text-cyan-400"
            />
            <StatCard
              title="Active Collabs"
              value={stats?.activeCollaborations ?? 0}
              subtitle="Currently running"
              icon={Layers}
              color="text-violet-400"
            />
            <StatCard
              title="Total Coordinations"
              value={stats?.totalCoordinations?.toLocaleString() ?? '0'}
              subtitle="All time"
              icon={Network}
              color="text-orange-400"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Cluster Health */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Cluster Health
                </h3>
                <span className="text-xs text-muted-foreground">
                  {clusterHealth.length} clusters
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clusterHealth.map((info) => (
                  <ClusterHealthCard key={info.cluster} info={info} />
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Connector Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Connector Status
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {connectors.length} connectors
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 rounded-xl border border-border bg-card p-3">
                  {connectors.map((connector) => (
                    <ConnectorCard key={connector.id} connector={connector} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics & History Row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Pattern Usage */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Pattern Usage
                </h3>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                {stats && (Object.entries(stats.patternUsage) as [CollaborationPattern, number][]).map(
                  ([pattern, count]) => (
                    <PatternUsageBar key={pattern} pattern={pattern} count={count} max={maxPatternUsage} />
                  )
                )}
              </div>
              {/* Connector Hit Rates */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Connector Hit Rates
                  </h3>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="space-y-2">
                    {stats?.connectorStats
                      ?.sort((a, b) => b.hitRate - a.hitRate)
                      .slice(0, 6)
                      .map((cs) => (
                        <div key={cs.connectorId} className="flex items-center gap-3">
                          <span className="text-xs text-foreground w-32 truncate">{cs.connectorName}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all duration-500"
                              style={{ width: `${cs.hitRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-10 text-right">{cs.hitRate}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <div className="max-h-[460px] overflow-y-auto space-y-2 rounded-xl border border-border bg-card p-3">
                {history.map((item) => (
                  <HistoryItem key={item.id} item={item} />
                ))}
                {history.length === 0 && (
                  <div className="py-8 text-center">
                    <Activity className="mx-auto h-6 w-6 text-muted-foreground/30" />
                    <p className="mt-2 text-xs text-muted-foreground">No orchestration history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====== DECOMPOSE SECTION ====== */}
      {activeSection === 'decompose' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Input Form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Mission Decomposition</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Describe a mission and the orchestrator will decompose it into sub-tasks across clusters.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Mission Description
                </label>
                <textarea
                  value={decomposeDesc}
                  onChange={(e) => setDecomposeDesc(e.target.value)}
                  placeholder="e.g., Build and deploy a new authentication microservice with OAuth2 support..."
                  className="w-full rounded-lg border border-border bg-background/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Objectives (one per line)
                </label>
                <textarea
                  value={decomposeObjectives}
                  onChange={(e) => setDecomposeObjectives(e.target.value)}
                  placeholder={"Design API schema\nImplement OAuth2 flow\nWrite unit tests\nSecurity audit"}
                  className="w-full rounded-lg border border-border bg-background/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
              <button
                onClick={handleDecompose}
                disabled={decomposing || !decomposeDesc.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decomposing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
                Decompose Mission
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-foreground">Decomposition Result</h3>
            </div>
            {!decomposeResult ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground/20" />
                <p className="mt-4 text-sm text-muted-foreground">No decomposition yet</p>
                <p className="text-xs text-muted-foreground/70">Describe a mission and click Decompose</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-sm font-medium text-foreground">{decomposeResult.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="rounded-full border bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                      {decomposeResult.strategy}
                    </span>
                    {decomposeResult.estimatedDuration && (
                      <span className="text-xs text-muted-foreground">
                        Est. {decomposeResult.estimatedDuration}
                      </span>
                    )}
                  </div>
                </div>

                {/* Objectives */}
                {decomposeResult.objectives.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Objectives
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {decomposeResult.objectives.map((obj, i) => (
                        <span key={i} className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-foreground">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Tasks */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Sub-Tasks ({decomposeResult.subTasks.length})
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {decomposeResult.subTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-border bg-background/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{clusterIcons[task.cluster]}</span>
                            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          </div>
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize shrink-0',
                            task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            task.status === 'running' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            task.status === 'assigned' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          )}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', clusterColors[task.cluster])}>
                            {clusterLabels[task.cluster]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Effort: {task.estimatedEffort}
                          </span>
                          {task.dependencies.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Depends: {task.dependencies.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== COLLABORATE SECTION ====== */}
      {activeSection === 'collaborate' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Input Form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Launch Collaboration</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Select a collaboration pattern and describe the task to coordinate multiple agents.
            </p>
            <div className="space-y-4">
              {/* Pattern Selection */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Collaboration Pattern
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.entries(patternLabels) as [CollaborationPattern, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setCollabPattern(key)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                        collabPattern === key
                          ? cn(collaborationPatternColors[key], 'border-current')
                          : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      )}
                    >
                      <span>{collaborationPatternIcons[key]}</span>
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={collabDesc}
                  onChange={(e) => setCollabDesc(e.target.value)}
                  placeholder="e.g., Deploy microservice with full CI/CD pipeline..."
                  className="w-full rounded-lg border border-border bg-background/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Objectives (one per line)
                </label>
                <textarea
                  value={collabObjectives}
                  onChange={(e) => setCollabObjectives(e.target.value)}
                  placeholder={"Build\nTest\nDeploy"}
                  className="w-full rounded-lg border border-border bg-background/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={handleCollaborate}
                disabled={launchingCollab || !collabDesc.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {launchingCollab ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Launch Collaboration
              </button>
            </div>

            {/* Pattern Info Cards */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.entries(patternLabels) as [CollaborationPattern, string][]).map(([key, label]) => (
                <div
                  key={key}
                  className={cn(
                    'rounded-lg border border-border bg-background/30 p-2.5 text-center',
                    collabPattern === key && 'border-primary/40 bg-primary/5'
                  )}
                >
                  <span className="text-xl block">{collaborationPatternIcons[key]}</span>
                  <p className="text-[10px] font-medium text-foreground mt-1">{label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {key === 'delegation' && 'Assign to best agent'}
                    {key === 'handoff' && 'Sequential transfer'}
                    {key === 'parallel' && 'Concurrent execution'}
                    {key === 'pipeline' && 'Stage-based flow'}
                    {key === 'consensus' && 'Agreement-based'}
                    {key === 'swarm' && 'Distributed effort'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Collaboration Result */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-semibold text-foreground">Collaboration Result</h3>
            </div>
            {!collabResult ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="h-12 w-12 text-muted-foreground/20" />
                <p className="mt-4 text-sm text-muted-foreground">No collaboration launched</p>
                <p className="text-xs text-muted-foreground/70">Select a pattern and describe the task</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{collabResult.description}</p>
                    <span className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize',
                      collabResult.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      collabResult.status === 'running' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      collabResult.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    )}>
                      {collabResult.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', collaborationPatternColors[collabResult.pattern])}>
                      {collaborationPatternIcons[collabResult.pattern]} {patternLabels[collabResult.pattern]}
                    </span>
                  </div>
                </div>

                {/* Objectives */}
                {collabResult.objectives.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Objectives
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {collabResult.objectives.map((obj, i) => (
                        <span key={i} className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-foreground">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {collabResult.participants.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Participants
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {collabResult.participants.map((p) => (
                        <span key={p} className="rounded-lg border border-border bg-background/50 px-2.5 py-1 text-[11px] font-mono text-foreground">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Started: {collabResult.startedAt ? formatRelativeTime(collabResult.startedAt) : 'Pending'}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>Ended: {collabResult.completedAt ? formatRelativeTime(collabResult.completedAt) : 'In progress'}</span>
                </div>

                {/* Error */}
                {collabResult.error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs font-medium text-red-400">Error: {collabResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
