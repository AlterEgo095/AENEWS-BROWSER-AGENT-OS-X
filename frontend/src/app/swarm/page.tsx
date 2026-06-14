'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Bug,
  Network,
  Vote,
  HardDrive,
  Brain,
  RefreshCw,
  GitBranch,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  Minus,
  Play,
  Target,
  TrendingUp,
  Save,
  RotateCcw,
  Eye,
  Plus,
  ShieldAlert,
  FileText,
  Clock,
  Activity,
  Zap,
  CircleDot,
  Unplug,
  Plug,
} from 'lucide-react';
import type {
  SwarmInfo,
  SwarmMetrics,
  SwarmTopologyType,
  ConsensusSession,
  CollaborationSession,
  WorkingMemorySession,
  FeedbackLoopParams,
  FeedbackAdjustment,
  TopologyInfo,
  DAGExecution,
  DAGTrace,
} from '@/lib/types';

// ─── Default empty data shapes ───────────────────────────────────

const defaultSwarmMetrics: SwarmMetrics = {
  totalSwarms: 0,
  activeSwarms: 0,
  avgConvergenceScore: 0,
  totalEmergentBehaviors: 0,
  totalPheromoneTrails: 0,
  topologyDistribution: { star: 0, mesh: 0, ring: 0, tree: 0, custom: 0 } as Record<SwarmTopologyType, number>,
};

const defaultSwarms: SwarmInfo[] = [];

const defaultConsensusSessions: ConsensusSession[] = [];

const defaultCollaborations: CollaborationSession[] = [];


const defaultMemorySessions: WorkingMemorySession[] = [];

const defaultFeedbackParams: FeedbackLoopParams = {
  id: '',
  version: 0,
  parameters: {},
  learningRate: 0,
  decayRate: 0,
  momentum: 0,
  lastAdjustmentAt: '',
};

const defaultFeedbackAdjustments: FeedbackAdjustment[] = [];

const defaultTopologies: TopologyInfo[] = [];

const defaultDAGExecutions: DAGExecution[] = [];

const defaultDAGTrace: DAGTrace | null = null;

// ─── Sub-Components ───────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-primary' }: {
  label: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    active: { color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle2 },
    running: { color: 'bg-emerald-500/15 text-emerald-400', icon: Activity },
    converging: { color: 'bg-cyan-500/15 text-cyan-400', icon: Target },
    completed: { color: 'bg-blue-500/15 text-blue-400', icon: CheckCircle2 },
    failed: { color: 'bg-red-500/15 text-red-400', icon: XCircle },
    voting: { color: 'bg-amber-500/15 text-amber-400', icon: Vote },
    pending: { color: 'bg-slate-500/15 text-slate-400', icon: Clock },
    timeout: { color: 'bg-orange-500/15 text-orange-400', icon: AlertTriangle },
    paused: { color: 'bg-yellow-500/15 text-yellow-400', icon: Minus },
    initializing: { color: 'bg-purple-500/15 text-purple-400', icon: Sparkles },
    partial: { color: 'bg-amber-500/15 text-amber-400', icon: AlertTriangle },
  };
  const c = config[status] || config.pending;
  const IconComp = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', c.color)}>
      <IconComp className="h-3 w-3" />
      {status}
    </span>
  );
}

function TopologyBadge({ type }: { type: SwarmTopologyType }) {
  const config: Record<SwarmTopologyType, { color: string; icon: string }> = {
    star: { color: 'bg-amber-500/15 text-amber-400', icon: '★' },
    mesh: { color: 'bg-emerald-500/15 text-emerald-400', icon: '⬡' },
    ring: { color: 'bg-purple-500/15 text-purple-400', icon: '◎' },
    tree: { color: 'bg-cyan-500/15 text-cyan-400', icon: '♧' },
    custom: { color: 'bg-pink-500/15 text-pink-400', icon: '✦' },
  };
  const c = config[type];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', c.color)}>
      {c.icon} {type}
    </span>
  );
}

function ConvergenceRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} className={color} />
      </svg>
      <span className={cn('absolute text-[9px] font-bold', color)}>{pct}%</span>
    </div>
  );
}

// ─── Tab Configuration ───────────────────────────────────────────

type TabKey = 'overview' | 'swarm' | 'consensus' | 'persistence' | 'memory' | 'feedback' | 'topology' | 'dag';

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'swarm', label: 'Swarm', icon: Bug },
  { key: 'consensus', label: 'Consensus', icon: Vote },
  { key: 'persistence', label: 'Persistence', icon: HardDrive },
  { key: 'memory', label: 'Working Memory', icon: Brain },
  { key: 'feedback', label: 'Feedback Loop', icon: RefreshCw },
  { key: 'topology', label: 'Topology', icon: Network },
  { key: 'dag', label: 'DAG Orchestrator', icon: GitBranch },
];

// ─── Main Page ───────────────────────────────────────────────────

export default function SwarmPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [swarmMetrics, setSwarmMetrics] = useState<SwarmMetrics>(defaultSwarmMetrics);
  const [swarms, setSwarms] = useState<SwarmInfo[]>(defaultSwarms);
  const [consensusSessions, setConsensusSessions] = useState<ConsensusSession[]>(defaultConsensusSessions);
  const [collaborations, setCollaborations] = useState<CollaborationSession[]>(defaultCollaborations);
  const [memorySessions, setMemorySessions] = useState<WorkingMemorySession[]>(defaultMemorySessions);
  const [feedbackParams, setFeedbackParams] = useState<FeedbackLoopParams>(defaultFeedbackParams);
  const [feedbackAdjustments, setFeedbackAdjustments] = useState<FeedbackAdjustment[]>(defaultFeedbackAdjustments);
  const [topologies, setTopologies] = useState<TopologyInfo[]>(defaultTopologies);
  const [dagExecutions, setDAGExecutions] = useState<DAGExecution[]>(defaultDAGExecutions);
  const [dagTrace, setDAGTrace] = useState<DAGTrace | null>(defaultDAGTrace);

  // UI states
  const [selectedDAG, setSelectedDAG] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const results = await Promise.allSettled([
        api.swarm.getSwarmMetrics(),
        api.swarm.getSwarms(),
        api.swarm.getConsensusResults(),
        api.swarm.getCollaborations(),
        api.swarm.getMemorySessions(),
        api.swarm.getFeedbackParams(),
        api.swarm.getFeedbackAdjustments(),
        api.swarm.getTopologies(),
        api.swarm.getDAGResults(),
      ]);

      if (results[0].status === 'fulfilled') setSwarmMetrics(results[0].value.data ?? defaultSwarmMetrics);
      if (results[1].status === 'fulfilled') setSwarms(results[1].value.data ?? defaultSwarms);
      if (results[2].status === 'fulfilled') setConsensusSessions(results[2].value.data ?? defaultConsensusSessions);
      if (results[3].status === 'fulfilled') setCollaborations(results[3].value.data ?? defaultCollaborations);
      if (results[4].status === 'fulfilled') setMemorySessions(results[4].value.data ?? defaultMemorySessions);
      if (results[5].status === 'fulfilled') setFeedbackParams(results[5].value.data ?? defaultFeedbackParams);
      if (results[6].status === 'fulfilled') setFeedbackAdjustments(results[6].value.data ?? defaultFeedbackAdjustments);
      if (results[7].status === 'fulfilled') setTopologies(results[7].value.data ?? defaultTopologies);
      if (results[8].status === 'fulfilled') setDAGExecutions(results[8].value.data ?? defaultDAGExecutions);

      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleAction(actionId: string, fn: () => Promise<unknown>) {
    setActionLoading(actionId);
    try {
      await fn();
    } catch {
        setError('Failed to load swarm data from the server');
    }
    setActionLoading(null);
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Bug className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Swarm Intelligence</h1>
            <p className="text-sm text-muted-foreground">Swarm OS — Phase 10</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <Activity className="h-3 w-3" />
            {swarmMetrics.activeSwarms} active swarms
          </span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error && swarmMetrics.totalSwarms === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Retry</button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'swarm' && renderSwarm()}
          {activeTab === 'consensus' && renderConsensus()}
          {activeTab === 'persistence' && renderPersistence()}
          {activeTab === 'memory' && renderMemory()}
          {activeTab === 'feedback' && renderFeedbackLoop()}
          {activeTab === 'topology' && renderTopology()}
          {activeTab === 'dag' && renderDAG()}
        </>
      )}
    </div>
  );

  // ─── Overview Tab ───────────────────────────────────────────────

  function renderOverview() {
    return (
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total Swarms" value={swarmMetrics.totalSwarms} sub={`${swarmMetrics.activeSwarms} active`} icon={Bug} color="text-emerald-400" />
          <StatCard label="Convergence" value={`${(swarmMetrics.avgConvergenceScore * 100).toFixed(0)}%`} sub="avg score" icon={Target} color="text-cyan-400" />
          <StatCard label="Emergent" value={swarmMetrics.totalEmergentBehaviors} sub="behaviors" icon={Sparkles} color="text-amber-400" />
          <StatCard label="Pheromones" value={swarmMetrics.totalPheromoneTrails} sub="active trails" icon={Activity} color="text-pink-400" />
          <StatCard label="Consensus" value={consensusSessions.length} sub={`${consensusSessions.filter(c => c.status === 'voting').length} voting`} icon={Vote} color="text-purple-400" />
          <StatCard label="Topologies" value={topologies.length} sub={`${topologies.filter(t => t.metrics.isConnected).length} connected`} icon={Network} color="text-blue-400" />
          <StatCard label="DAG Runs" value={dagExecutions.length} sub={`${dagExecutions.filter(d => d.status === 'running').length} running`} icon={GitBranch} color="text-orange-400" />
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Swarms Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bug className="h-4 w-4 text-primary" /> Active Swarms
            </h3>
            <div className="space-y-3">
              {swarms.filter(s => s.status === 'active' || s.status === 'converging').slice(0, 4).map((swarm) => (
                <div key={swarm.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <ConvergenceRing score={swarm.convergenceScore} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{swarm.name}</span>
                      <TopologyBadge type={swarm.topology} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{swarm.agentIds.length} agents</span>
                      <span>{swarm.iterationsCompleted} iterations</span>
                      <span>{swarm.emergentBehaviors.length} emergent</span>
                    </div>
                  </div>
                  <StatusBadge status={swarm.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Topology Distribution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Network className="h-4 w-4 text-primary" /> Topology Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(swarmMetrics.topologyDistribution).map(([type, count]) => {
                const maxCount = Math.max(...Object.values(swarmMetrics.topologyDistribution));
                const width = Math.max(10, (count / maxCount) * 100);
                const colors: Record<string, string> = { star: 'bg-amber-500', mesh: 'bg-emerald-500', ring: 'bg-purple-500', tree: 'bg-cyan-500', custom: 'bg-pink-500' };
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground capitalize">{type}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={cn('h-full rounded-full transition-all', colors[type] || 'bg-primary')} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Consensus & Collaboration Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Consensus */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Vote className="h-4 w-4 text-primary" /> Recent Consensus
            </h3>
            <div className="space-y-2">
              {consensusSessions.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <StatusBadge status={session.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{session.topic}</p>
                    <p className="text-[10px] text-muted-foreground">{session.participantIds.length} participants</p>
                  </div>
                  {session.byzantineDetected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                      <ShieldAlert className="h-3 w-3" /> Byzantine
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Loop Status */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <RefreshCw className="h-4 w-4 text-primary" /> Feedback Loop
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-foreground">v{feedbackParams.version}</p>
                <p className="text-[10px] text-muted-foreground">Version</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{feedbackParams.learningRate}</p>
                <p className="text-[10px] text-muted-foreground">Learning Rate</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-cyan-400">{feedbackParams.momentum}</p>
                <p className="text-[10px] text-muted-foreground">Momentum</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {feedbackAdjustments.slice(0, 2).map((adj) => (
                <div key={adj.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2 text-xs">
                  <span className="text-foreground">{adj.parameter}</span>
                  <span className="text-muted-foreground">{adj.oldValue} → <span className={adj.newValue > adj.oldValue ? 'text-emerald-400' : 'text-red-400'}>{adj.newValue}</span></span>
                  {adj.rolledBack && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">rolled back</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Swarm Tab ──────────────────────────────────────────────────

  function renderSwarm() {
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Swarms" value={swarmMetrics.totalSwarms} icon={Bug} color="text-emerald-400" />
          <StatCard label="Active" value={swarmMetrics.activeSwarms} icon={Activity} color="text-cyan-400" />
          <StatCard label="Avg Convergence" value={`${(swarmMetrics.avgConvergenceScore * 100).toFixed(0)}%`} icon={Target} color="text-amber-400" />
          <StatCard label="Emergent Behaviors" value={swarmMetrics.totalEmergentBehaviors} icon={Sparkles} color="text-pink-400" />
        </div>

        {/* Create Swarm */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plus className="h-4 w-4 text-primary" /> Create New Swarm
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Swarm name"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Objective"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <select className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="mesh">Mesh</option>
              <option value="star">Star</option>
              <option value="ring">Ring</option>
              <option value="tree">Tree</option>
              <option value="custom">Custom</option>
            </select>
            <button
              onClick={() => handleAction('create-swarm', () => api.swarm.createSwarm({ name: 'New Swarm', objective: 'Custom objective', topology: 'mesh', agentIds: [] }))}
              disabled={actionLoading === 'create-swarm'}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'create-swarm' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        {/* Swarm List */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Active Swarms</h3>
          <div className="space-y-3">
            {swarms.map((swarm) => (
              <div key={swarm.id} className="rounded-lg border border-border/50 bg-white/5 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ConvergenceRing score={swarm.convergenceScore} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{swarm.name}</span>
                        <TopologyBadge type={swarm.topology} />
                        <StatusBadge status={swarm.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{swarm.objective}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {swarm.status === 'active' && (
                      <button
                        onClick={() => handleAction(`exec-${swarm.id}`, () => api.swarm.executeSwarm(swarm.id))}
                        disabled={actionLoading === `exec-${swarm.id}`}
                        className="flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" /> Execute
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Agents: </span>
                    <span className="text-foreground">{swarm.agentIds.length}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Iterations: </span>
                    <span className="text-foreground">{swarm.iterationsCompleted}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Emergent: </span>
                    <span className="text-foreground">{swarm.emergentBehaviors.length}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Pheromones: </span>
                    <span className="text-foreground">{Object.keys(swarm.pheromoneTrails).length}</span>
                  </div>
                </div>

                {/* Pheromone Trails */}
                {Object.keys(swarm.pheromoneTrails).length > 0 && (
                  <div className="mt-3 rounded-lg bg-white/5 p-3">
                    <p className="mb-2 text-[10px] font-medium text-muted-foreground">PHEROMONE TRAILS</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(swarm.pheromoneTrails).map(([trail, strength]) => (
                        <span
                          key={trail}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            strength >= 0.8 ? 'bg-emerald-500/15 text-emerald-400' : strength >= 0.5 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                          )}
                        >
                          {trail} ({(strength * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergent Behaviors */}
                {swarm.emergentBehaviors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {swarm.emergentBehaviors.map((beh) => (
                      <span key={beh} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                        ✦ {beh}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Consensus Tab ──────────────────────────────────────────────

  function renderConsensus() {
    const completed = consensusSessions.filter(s => s.status === 'completed');
    const voting = consensusSessions.filter(s => s.status === 'voting');
    const byzantineCount = consensusSessions.filter(s => s.byzantineDetected).length;

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Sessions" value={consensusSessions.length} icon={Vote} color="text-purple-400" />
          <StatCard label="Currently Voting" value={voting.length} icon={Activity} color="text-amber-400" />
          <StatCard label="Completed" value={completed.length} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Byzantine Detected" value={byzantineCount} icon={ShieldAlert} color="text-red-400" />
        </div>

        {/* Initiate Consensus */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plus className="h-4 w-4 text-primary" /> Initiate Consensus
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Topic"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Proposer agent ID"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Threshold:</span>
              <input
                type="number"
                defaultValue={0.75}
                min={0}
                max={1}
                step={0.05}
                className="w-20 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleAction('init-consensus', () => api.swarm.initiateConsensus({ topic: 'New Vote', proposerId: 'agent-1', participantIds: ['agent-1', 'agent-2'] }))}
              disabled={actionLoading === 'init-consensus'}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'init-consensus' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}
              Initiate
            </button>
          </div>
        </div>

        {/* Consensus Sessions */}
        <div className="space-y-4">
          {consensusSessions.map((session) => (
            <div key={session.id} className={cn(
              'rounded-xl border bg-card p-5',
              session.byzantineDetected ? 'border-red-500/30' : 'border-border'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={session.status} />
                    <span className="text-sm font-medium text-foreground">{session.topic}</span>
                    {session.byzantineDetected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                        <ShieldAlert className="h-3 w-3" /> Byzantine Fault
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Proposed by <span className="text-foreground">{session.proposerId}</span> · {session.participantIds.length} participants · Threshold {Math.round(session.consensusThreshold * 100)}%
                  </p>
                </div>
                {session.status === 'voting' && (
                  <button
                    onClick={() => handleAction(`run-${session.id}`, () => api.swarm.runConsensus(session.id))}
                    disabled={actionLoading === `run-${session.id}`}
                    className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" /> Run
                  </button>
                )}
              </div>

              {/* Vote Breakdown */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">{session.votesFor}</p>
                  <p className="text-[10px] text-muted-foreground">For</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-red-400">{session.votesAgainst}</p>
                  <p className="text-[10px] text-muted-foreground">Against</p>
                </div>
                <div className="rounded-lg bg-slate-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-slate-400">{session.abstentions}</p>
                  <p className="text-[10px] text-muted-foreground">Abstain</p>
                </div>
              </div>

              {/* Byzantine Agents */}
              {session.byzantineDetected && session.byzantineAgents.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] font-medium text-red-400">BYZANTINE AGENTS DETECTED</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {session.byzantineAgents.map(agent => (
                      <span key={agent} className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">{agent}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dissent Records */}
              {session.dissentRecords.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[10px] font-medium text-muted-foreground">DISSENT RECORDS</p>
                  <div className="space-y-2">
                    {session.dissentRecords.map((dissent, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                        <div>
                          <p className="text-xs text-foreground"><span className="font-medium">{dissent.agentId}</span>: {dissent.reason}</p>
                          {dissent.alternativeProposal && (
                            <p className="mt-1 text-[10px] text-muted-foreground">Alternative: {dissent.alternativeProposal}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Persistence Tab ────────────────────────────────────────────

  function renderPersistence() {
    const activeColabs = collaborations.filter(c => c.status === 'active');
    const totalCheckpoints = collaborations.reduce((sum, c) => sum + c.checkpoints.length, 0);

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Active Collaborations" value={activeColabs.length} icon={HardDrive} color="text-emerald-400" />
          <StatCard label="Total Sessions" value={collaborations.length} icon={FileText} color="text-blue-400" />
          <StatCard label="Checkpoints" value={totalCheckpoints} icon={Save} color="text-amber-400" />
          <StatCard label="Recovery Available" value={totalCheckpoints > 0 ? 'Yes' : 'No'} icon={RotateCcw} color="text-cyan-400" />
        </div>

        {/* Active Collaborations */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" /> Active Collaborations
          </h3>
          {activeColabs.length > 0 ? (
            <div className="space-y-3">
              {activeColabs.map((colab) => (
                <div key={colab.id} className="rounded-lg border border-border/50 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={colab.status} />
                      <span className="text-sm font-medium text-foreground">{colab.name}</span>
                    </div>
                    <button
                      onClick={() => handleAction(`checkpoint-${colab.id}`, () => api.swarm.createCheckpoint(colab.id, `Checkpoint ${colab.checkpoints.length + 1}`))}
                      disabled={actionLoading === `checkpoint-${colab.id}`}
                      className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" /> Checkpoint
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {colab.participantIds.length} participants · Last activity {new Date(colab.lastActivityAt).toLocaleTimeString()}
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground">SHARED WORKSPACE</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(colab.sharedWorkspace).map(([key, value]) => (
                        <span key={key} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-foreground">
                          {key}: <span className="text-primary">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Checkpoints */}
                  {colab.checkpoints.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] text-muted-foreground">CHECKPOINTS</p>
                      <div className="space-y-1">
                        {colab.checkpoints.map((cp) => (
                          <div key={cp.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                            <div className="flex items-center gap-2">
                              <Save className="h-3 w-3 text-amber-400" />
                              <span className="text-xs text-foreground">{cp.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{new Date(cp.createdAt).toLocaleTimeString()}</span>
                              <button
                                onClick={() => handleAction(`recover-${cp.id}`, () => api.swarm.recoverCheckpoint(colab.id, cp.id))}
                                disabled={actionLoading === `recover-${cp.id}`}
                                className="flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 hover:bg-cyan-500/25 disabled:opacity-50"
                              >
                                <RotateCcw className="h-2.5 w-2.5" /> Recover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active collaborations</p>
          )}
        </div>

        {/* History */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Collaboration History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left">Name</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-right">Participants</th>
                  <th className="pb-2 text-right">Checkpoints</th>
                  <th className="pb-2 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {collaborations.map((colab) => (
                  <tr key={colab.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{colab.name}</td>
                    <td className="py-2"><StatusBadge status={colab.status} /></td>
                    <td className="py-2 text-right text-foreground">{colab.participantIds.length}</td>
                    <td className="py-2 text-right text-foreground">{colab.checkpoints.length}</td>
                    <td className="py-2 text-right text-muted-foreground">{new Date(colab.lastActivityAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Working Memory Tab ─────────────────────────────────────────

  function renderMemory() {
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Memory Sessions" value={memorySessions.length} icon={Brain} color="text-purple-400" />
          <StatCard label="Active Sessions" value={memorySessions.filter(s => s.participants.length > 0).length} icon={Activity} color="text-emerald-400" />
          <StatCard label="Total Participants" value={memorySessions.reduce((sum, s) => sum + s.participants.length, 0)} icon={Bug} color="text-cyan-400" />
          <StatCard label="Blackboard Keys" value={memorySessions.reduce((sum, s) => sum + Object.keys(s.blackboard).length, 0)} icon={FileText} color="text-amber-400" />
        </div>

        {/* Create Session */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plus className="h-4 w-4 text-primary" /> Create Memory Session
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Session name"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Participant IDs (comma-separated)"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => handleAction('create-mem', () => api.swarm.createMemorySession({ name: 'New Session', participants: [] }))}
              disabled={actionLoading === 'create-mem'}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'create-mem' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="space-y-4">
          {memorySessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{session.name}</h4>
                  <p className="text-xs text-muted-foreground">{session.participants.length} participants · Updated {new Date(session.updatedAt).toLocaleTimeString()}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Active</span>
              </div>

              {/* Blackboard */}
              <div className="mt-4 rounded-lg bg-white/5 p-3">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">BLACKBOARD (SHARED)</p>
                <div className="space-y-1">
                  {Object.entries(session.blackboard).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-xs">
                      <span className="font-medium text-foreground">{key}</span>
                      <span className="text-primary">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scratchpads */}
              <div className="mt-3 rounded-lg bg-white/5 p-3">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">SCRATCHPADS (PRIVATE)</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(session.scratchpads).map(([agentId, data]) => (
                    <div key={agentId} className="rounded-lg border border-border/50 bg-white/5 p-2">
                      <p className="text-[10px] font-medium text-primary">{agentId}</p>
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(data).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Workspace */}
              <div className="mt-3 rounded-lg bg-white/5 p-3">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">SHARED WORKSPACE</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(session.sharedWorkspace).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                      <span className="text-xs text-muted-foreground">{key}:</span>
                      <span className="text-xs font-medium text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Feedback Loop Tab ──────────────────────────────────────────

  function renderFeedbackLoop() {
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Config Version" value={`v${feedbackParams.version}`} icon={Zap} color="text-cyan-400" />
          <StatCard label="Learning Rate" value={feedbackParams.learningRate} icon={TrendingUp} color="text-emerald-400" />
          <StatCard label="Decay Rate" value={feedbackParams.decayRate} icon={ArrowDownRight} color="text-amber-400" />
          <StatCard label="Momentum" value={feedbackParams.momentum} icon={Activity} color="text-pink-400" />
        </div>

        {/* Current Parameters */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="h-4 w-4 text-primary" /> Current Parameters
          </h3>
          <div className="space-y-3">
            {Object.entries(feedbackParams.parameters).map(([param, value]) => {
              const width = Math.max(10, value * 100);
              const colors: Record<string, string> = {
                exploration_rate: 'bg-purple-500',
                exploitation_rate: 'bg-emerald-500',
                convergence_threshold: 'bg-cyan-500',
                max_iterations: 'bg-amber-500',
                adaptation_speed: 'bg-pink-500',
              };
              return (
                <div key={param}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{param.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-all', colors[param] || 'bg-primary')} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs">
            <span className="text-muted-foreground">Last Adjustment</span>
            <span className="font-semibold text-foreground">{new Date(feedbackParams.lastAdjustmentAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Run Feedback Cycle */}
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('run-cycle', () => api.swarm.runFeedbackCycle())}
            disabled={actionLoading === 'run-cycle'}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading === 'run-cycle' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run Feedback Cycle
          </button>
        </div>

        {/* Adjustment History */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Adjustment History
          </h3>
          <div className="space-y-2">
            {feedbackAdjustments.map((adj) => (
              <div key={adj.id} className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                adj.rolledBack ? 'border-red-500/20 bg-red-500/5' : 'border-border/50 bg-white/5'
              )}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{adj.parameter.replace(/_/g, ' ')}</span>
                    {adj.rolledBack && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">rolled back</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{adj.reason}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">{adj.oldValue}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-emerald-400">{adj.newValue}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(adj.appliedAt).toLocaleTimeString()}</p>
                </div>
                {!adj.rolledBack && (
                  <button
                    onClick={() => handleAction(`rollback-${adj.id}`, () => api.swarm.rollbackAdjustment(adj.id))}
                    disabled={actionLoading === `rollback-${adj.id}`}
                    className="flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" /> Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Topology Tab ───────────────────────────────────────────────

  function renderTopology() {
    const totalNodes = topologies.reduce((sum, t) => sum + t.nodes.length, 0);
    const totalEdges = topologies.reduce((sum, t) => sum + t.edges.length, 0);
    const isolatedNodes = topologies.reduce((sum, t) => sum + t.metrics.isolatedNodes, 0);

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Topologies" value={topologies.length} icon={Network} color="text-emerald-400" />
          <StatCard label="Total Nodes" value={totalNodes} icon={CircleDot} color="text-cyan-400" />
          <StatCard label="Total Edges" value={totalEdges} icon={GitBranch} color="text-amber-400" />
          <StatCard label="Isolated Nodes" value={isolatedNodes} icon={Unplug} color="text-red-400" />
        </div>

        {/* Create Topology */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plus className="h-4 w-4 text-primary" /> Create Topology
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Topology name"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <select className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="star">Star</option>
              <option value="mesh">Mesh</option>
              <option value="ring">Ring</option>
              <option value="tree">Tree</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="number"
              defaultValue={4}
              min={2}
              max={20}
              placeholder="Node count"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => handleAction('create-topo', () => api.swarm.createTopology({ name: 'New Topology', type: 'mesh', nodeCount: 4 }))}
              disabled={actionLoading === 'create-topo'}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'create-topo' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        {/* Topology Cards */}
        <div className="space-y-4">
          {topologies.map((topo) => (
            <div key={topo.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TopologyBadge type={topo.type} />
                  <span className="text-sm font-semibold text-foreground">{topo.name}</span>
                  {topo.metrics.isConnected ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Connected</span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">Disconnected</span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{topo.nodes.length}</p>
                  <p className="text-[10px] text-muted-foreground">Nodes</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{topo.edges.length}</p>
                  <p className="text-[10px] text-muted-foreground">Edges</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{topo.metrics.avgDegree.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Degree</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{topo.metrics.clusteringCoeff.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Clustering</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{topo.metrics.diameter}</p>
                  <p className="text-[10px] text-muted-foreground">Diameter</p>
                </div>
              </div>

              {/* Nodes */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">NODES</p>
                <div className="flex flex-wrap gap-2">
                  {topo.nodes.map((node) => (
                    <div key={node.id} className={cn(
                      'flex items-center gap-2 rounded-lg border p-2',
                      node.isolated ? 'border-red-500/30 bg-red-500/5' : 'border-border/50 bg-white/5'
                    )}>
                      <CircleDot className={cn('h-3 w-3', node.isolated ? 'text-red-400' : 'text-emerald-400')} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{node.agentId}</p>
                        <p className="text-[9px] text-muted-foreground">{node.id}</p>
                      </div>
                      {node.isolated ? (
                        <button
                          onClick={() => handleAction(`restore-${node.id}`, () => api.swarm.restoreNode(topo.id, node.id))}
                          disabled={actionLoading === `restore-${node.id}`}
                          className="ml-1 flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Plug className="h-2.5 w-2.5" /> Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(`isolate-${node.id}`, () => api.swarm.isolateNode(topo.id, node.id))}
                          disabled={actionLoading === `isolate-${node.id}`}
                          className="ml-1 flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                        >
                          <Unplug className="h-2.5 w-2.5" /> Isolate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Edges */}
              {topo.edges.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-medium text-muted-foreground">EDGES</p>
                  <div className="flex flex-wrap gap-2">
                    {topo.edges.map((edge, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px]">
                        <span className="text-cyan-400">{edge.source}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-purple-400">{edge.target}</span>
                        <span className="ml-1 text-muted-foreground">w:{edge.weight.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── DAG Orchestrator Tab ───────────────────────────────────────

  function renderDAG() {
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="DAG Executions" value={dagExecutions.length} icon={GitBranch} color="text-emerald-400" />
          <StatCard label="Running" value={dagExecutions.filter(d => d.status === 'running').length} icon={Activity} color="text-amber-400" />
          <StatCard label="Completed" value={dagExecutions.filter(d => d.status === 'completed').length} icon={CheckCircle2} color="text-cyan-400" />
          <StatCard label="Total Nodes" value={dagExecutions.reduce((sum, d) => sum + d.nodes.length, 0)} icon={CircleDot} color="text-pink-400" />
        </div>

        {/* Execute DAG */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Play className="h-4 w-4 text-primary" /> Execute DAG
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="DAG name"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Nodes (comma-separated)"
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => handleAction('exec-dag', () => api.swarm.executeDAG({ name: 'New DAG', nodes: [], edges: [] }))}
              disabled={actionLoading === 'exec-dag'}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'exec-dag' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Execute
            </button>
          </div>
        </div>

        {/* DAG Results */}
        <div className="space-y-4">
          {dagExecutions.map((dag) => (
            <div key={dag.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={dag.status} />
                  <span className="text-sm font-semibold text-foreground">{dag.name}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDAG(selectedDAG === dag.id ? null : dag.id);
                    if (selectedDAG !== dag.id) {
                      handleAction(`trace-${dag.id}`, async () => {
                        const result = await api.swarm.getDAGTrace(dag.id);
                        if (result.data) setDAGTrace(result.data);
                      });
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25"
                >
                  <Eye className="h-3 w-3" /> Trace
                </button>
              </div>

              {/* DAG Visualization */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">EXECUTION GRAPH</p>
                <div className="flex flex-wrap items-center gap-2">
                  {dag.nodes.map((node, i) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <div className={cn(
                        'rounded-lg border p-2 min-w-[120px]',
                        node.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                        node.status === 'running' ? 'border-amber-500/30 bg-amber-500/5' :
                        node.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                        'border-border/50 bg-white/5'
                      )}>
                        <div className="flex items-center gap-1">
                          {node.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          {node.status === 'running' && <Activity className="h-3 w-3 text-amber-400 animate-pulse" />}
                          {node.status === 'failed' && <XCircle className="h-3 w-3 text-red-400" />}
                          {node.status === 'pending' && <Clock className="h-3 w-3 text-slate-400" />}
                          <span className="text-xs font-medium text-foreground">{node.label}</span>
                        </div>
                        {node.agentId && (
                          <p className="mt-0.5 text-[9px] text-muted-foreground">{node.agentId}</p>
                        )}
                      </div>
                      {i < dag.nodes.length - 1 && dag.edges.some(e => e.source === node.id) && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Node Details Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 text-left">Node</th>
                      <th className="pb-2 text-left">Agent</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-right">Started</th>
                      <th className="pb-2 text-right">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dag.nodes.map((node) => (
                      <tr key={node.id} className="border-b border-border/50">
                        <td className="py-2 font-medium text-foreground">{node.label}</td>
                        <td className="py-2 text-muted-foreground">{node.agentId || '—'}</td>
                        <td className="py-2"><StatusBadge status={node.status} /></td>
                        <td className="py-2 text-right text-muted-foreground">{node.startedAt ? new Date(node.startedAt).toLocaleTimeString() : '—'}</td>
                        <td className="py-2 text-right text-muted-foreground">{node.completedAt ? new Date(node.completedAt).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Execution Trace */}
              {selectedDAG === dag.id && dagTrace && (
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                    <Eye className="h-4 w-4" /> Execution Trace
                  </h4>
                  <div className="space-y-2">
                    {dagTrace.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">{step.nodeLabel}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {step.agentId || 'Unassigned'} · Duration: {(step.durationMs / 1000).toFixed(1)}s
                          </p>
                        </div>
                        <StatusBadge status={step.status} />
                        {step.output && (
                          <span className="text-[10px] text-primary">output ✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Duration</span>
                    <span className="font-semibold text-foreground">{(dagTrace.totalDurationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
