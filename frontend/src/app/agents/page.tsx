'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Bot,
  Play,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  LayoutGrid,
  Layers,
  Zap,
  Coins,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  cn,
  clusterColors,
  clusterIcons,
  statusColors,
  statusDotColors,
  formatRelativeTime,
  missionCategoryConfig,
  tierConfig,
  powerLevelLabels,
} from '@/lib/utils';
import type { Agent, ClusterType, AgentStatus, MissionCategory } from '@/lib/types';
import { ClusterType as CT, AgentStatus as AS, MissionCategory as MC } from '@/lib/types';

// Cluster-to-mission fallback mapping
const clusterToMission: Record<string, MissionCategory[]> = {
  [CT.BROWSER]: [MC.RESEARCH_ANALYSIS, MC.AUTOMATION_WORKFLOW],
  [CT.COMPUTER]: [MC.SYSTEM_ADMINISTRATION],
  [CT.CODING]: [MC.CODE_DEVELOPMENT],
  [CT.OFFICE]: [MC.DOCUMENT_PROCESSING],
  [CT.MARKETING]: [MC.MARKETING_GROWTH],
  [CT.BUSINESS]: [MC.BUSINESS_INTELLIGENCE],
  [CT.INFRASTRUCTURE]: [MC.INFRASTRUCTURE_MGMT],
  [CT.SECURITY]: [MC.SECURITY_OPS],
  [CT.META_INTELLIGENCE]: [MC.AI_ORCHESTRATION],
  [CT.LLM_INTELLIGENCE]: [MC.AI_ORCHESTRATION],
  [CT.INTELLIGENT_ORCHESTRATION]: [MC.AI_ORCHESTRATION],
  [CT.WATCHDOG]: [MC.INFRASTRUCTURE_MGMT, MC.AI_ORCHESTRATION],
  [CT.SELF_EVOLUTION]: [MC.AI_ORCHESTRATION],
  [CT.CERTIFICATION]: [MC.AI_ORCHESTRATION, MC.SECURITY_OPS],
  [CT.STEALTH_OPS]: [MC.STEALTH_OPERATIONS, MC.SECURITY_OPS],
  [CT.DATA_INTELLIGENCE]: [MC.DATA_ENGINEERING],
  [CT.COMMUNICATION]: [MC.COMMUNICATION_OPS],
};

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
  [CT.DATA_INTELLIGENCE]: 'Data Intelligence',
  [CT.COMMUNICATION]: 'Communication',
};

const clusterOptions: { value: ClusterType | ''; label: string }[] = [
  { value: '', label: 'All Clusters' },
  ...Object.values(CT).map((c) => ({ value: c, label: clusterLabels[c] })),
];

const statusOptions: { value: AgentStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  ...Object.values(AS).map((s) => ({ value: s, label: s })),
];

const tierOptions = [
  { value: '', label: 'All Tiers' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
  { value: 'stealth', label: 'Stealth' },
];

const powerOptions = [
  { value: 0, label: 'All Power' },
  { value: 1, label: 'Standard Power' },
  { value: 2, label: 'Advanced Power' },
  { value: 3, label: 'Elite Power' },
];

type ViewMode = 'mission' | 'cluster';

// Helper to resolve mission categories for an agent
function getAgentMissionCategories(agent: Agent): MissionCategory[] {
  if (agent.missionCategories && agent.missionCategories.length > 0) {
    return agent.missionCategories;
  }
  return clusterToMission[agent.cluster] || [];
}

// Helper to resolve tier for an agent
function getAgentTier(agent: Agent): string {
  if (agent.tier) return agent.tier;
  if (agent.powerLevel === 3) return 'elite';
  if (agent.powerLevel === 2) return 'advanced';
  return 'standard';
}

// Helper to resolve power level
function getAgentPowerLevel(agent: Agent): number {
  return agent.powerLevel || 1;
}

// Helper to resolve credit cost
function getAgentCreditCost(agent: Agent): number {
  return agent.creditCost ?? 1;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterFilter, setClusterFilter] = useState<ClusterType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | ''>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [powerFilter, setPowerFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mission');
  const [expandedCategory, setExpandedCategory] = useState<MissionCategory | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<ClusterType | null>(null);

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter]);

  async function fetchAgents() {
    setLoading(true);
    try {
      const params: { cluster?: string; status?: string } = {};
      if (clusterFilter) params.cluster = clusterFilter;
      const result = await api.getAgents(params);
      setAgents(result.data || []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute(agent: Agent) {
    setExecuting(agent.id);
    try {
      await api.executeAgent(agent.id, {
        tenantId: agent.tenantId,
        config: { action: 'execute' },
      });
    } catch {
      // Silently handle
    } finally {
      setExecuting(null);
      setShowExecuteModal(null);
    }
  }

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        !searchQuery ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || agent.status === statusFilter;
      const matchesTier = !tierFilter || getAgentTier(agent) === tierFilter;
      const matchesPower = !powerFilter || getAgentPowerLevel(agent) === powerFilter;
      return matchesSearch && matchesStatus && matchesTier && matchesPower;
    });
  }, [agents, searchQuery, statusFilter, tierFilter, powerFilter]);

  // Group agents by mission category
  const missionGroups = useMemo(() => {
    const groups: Record<MissionCategory, Agent[]> = {} as Record<MissionCategory, Agent[]>;
    // Initialize all categories
    Object.values(MC).forEach((mc) => {
      groups[mc] = [];
    });
    filteredAgents.forEach((agent) => {
      const categories = getAgentMissionCategories(agent);
      if (categories.length === 0) {
        // Agents with no category mapping — put in a default
        groups[MC.SYSTEM_ADMINISTRATION]?.push(agent);
      } else {
        categories.forEach((cat) => {
          if (groups[cat]) {
            groups[cat].push(agent);
          }
        });
      }
    });
    return groups;
  }, [filteredAgents]);

  // Group agents by cluster
  const clusterGroups = useMemo(() => {
    const groups: Record<ClusterType, Agent[]> = {} as Record<ClusterType, Agent[]>;
    filteredAgents.forEach((agent) => {
      if (!groups[agent.cluster]) groups[agent.cluster] = [];
      groups[agent.cluster].push(agent);
    });
    return groups;
  }, [filteredAgents]);

  // Categories that have agents
  const activeCategories = useMemo(() => {
    return Object.values(MC).filter((mc) => missionGroups[mc] && missionGroups[mc].length > 0);
  }, [missionGroups]);

  // Initialize expanded category on first load
  const [hasInitialized, setHasInitialized] = useState(false);
  if (!loading && activeCategories.length > 0 && !expandedCategory && !hasInitialized) {
    setExpandedCategory(activeCategories[0]);
    setHasInitialized(true);
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🤖 Agent Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose your mission, select your agent
          </p>
        </div>
        <button
          onClick={fetchAgents}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* View Toggle */}
        <div className="flex rounded-lg border border-border bg-card overflow-hidden">
          <button
            onClick={() => setViewMode('mission')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'mission'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Mission View
          </button>
          <button
            onClick={() => setViewMode('cluster')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'cluster'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Cluster View
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents..."
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

        {/* Tier Filter */}
        <div className="relative">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {tierOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Power Level Filter */}
        <div className="relative">
          <select
            value={powerFilter}
            onChange={(e) => setPowerFilter(Number(e.target.value))}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {powerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Cluster Filter (for cluster view) */}
        {viewMode === 'cluster' && (
          <div className="relative">
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value as ClusterType | '')}
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            >
              {clusterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AgentStatus | '')}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {(clusterFilter || statusFilter || searchQuery || tierFilter || powerFilter) && (
          <button
            onClick={() => {
              setClusterFilter('');
              setStatusFilter('');
              setSearchQuery('');
              setTierFilter('');
              setPowerFilter(0);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Filter className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 animate-shimmer rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 animate-shimmer rounded-xl" />
            ))}
          </div>
        </div>
      ) : viewMode === 'mission' ? (
        /* Mission View */
        <MissionView
          missionGroups={missionGroups}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          executing={executing}
          onExecute={(agent) => setShowExecuteModal(agent)}
        />
      ) : (
        /* Cluster View */
        <ClusterView
          clusterGroups={clusterGroups}
          expandedCluster={expandedCluster}
          setExpandedCluster={setExpandedCluster}
          executing={executing}
          onExecute={(agent) => setShowExecuteModal(agent)}
        />
      )}

      {/* Empty State */}
      {!loading && filteredAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No agents found</p>
          <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
        </div>
      )}

      {/* Execute Modal */}
      {showExecuteModal && (
        <ExecuteModal
          agent={showExecuteModal}
          executing={executing}
          onExecute={() => handleExecute(showExecuteModal)}
          onClose={() => setShowExecuteModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Mission View ─────────────────────────────────────────────────────────── */

function MissionView({
  missionGroups,
  expandedCategory,
  setExpandedCategory,
  executing,
  onExecute,
}: {
  missionGroups: Record<MissionCategory, Agent[]>;
  expandedCategory: MissionCategory | null;
  setExpandedCategory: (cat: MissionCategory | null) => void;
  executing: string | null;
  onExecute: (agent: Agent) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Category Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mission Categories
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Object.values(MC).map((mc) => {
            const config = missionCategoryConfig[mc];
            const agentCount = missionGroups[mc]?.length || 0;
            const isExpanded = expandedCategory === mc;
            const hasEliteOrStealth = missionGroups[mc]?.some(
              (a) => getAgentTier(a) === 'elite' || getAgentTier(a) === 'stealth'
            );

            return (
              <button
                key={mc}
                onClick={() => setExpandedCategory(isExpanded ? null : mc)}
                className={cn(
                  'relative group rounded-xl border p-4 text-left transition-all duration-200 overflow-hidden',
                  isExpanded
                    ? 'border-primary/50 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/30',
                  agentCount === 0 && 'opacity-40'
                )}
              >
                {/* Gradient Background */}
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-10 transition-opacity',
                    config.color,
                    isExpanded ? 'opacity-20' : 'group-hover:opacity-15'
                  )}
                />
                <div className="relative z-10">
                  <span className="text-2xl">{config.icon}</span>
                  <h3 className="mt-2 text-xs font-semibold text-foreground leading-tight">
                    {config.label}
                  </h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
                  </p>
                  {hasEliteOrStealth && (
                    <span className="mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                      ⭐ ELITE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Category Detail */}
      {expandedCategory && missionGroups[expandedCategory] && (
        <div className="animate-slide-in">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">{missionCategoryConfig[expandedCategory].icon}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {missionCategoryConfig[expandedCategory].label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {missionCategoryConfig[expandedCategory].description} — {missionGroups[expandedCategory].length} agents
              </p>
            </div>
            <button
              onClick={() => setExpandedCategory(null)}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {missionGroups[expandedCategory].map((agent) => (
              <EnhancedAgentCard
                key={agent.id}
                agent={agent}
                onExecute={() => onExecute(agent)}
                isExecuting={executing === agent.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Cluster View ─────────────────────────────────────────────────────────── */

function ClusterView({
  clusterGroups,
  expandedCluster,
  setExpandedCluster,
  executing,
  onExecute,
}: {
  clusterGroups: Record<ClusterType, Agent[]>;
  expandedCluster: ClusterType | null;
  setExpandedCluster: (cluster: ClusterType | null) => void;
  executing: string | null;
  onExecute: (agent: Agent) => void;
}) {
  const sortedClusters = useMemo(() => {
    return Object.entries(clusterGroups).sort(([, a], [, b]) => b.length - a.length);
  }, [clusterGroups]);

  return (
    <div className="space-y-6">
      {/* Cluster Summary Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Clusters
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sortedClusters.map(([cluster, clusterAgents]) => {
            const ct = cluster as ClusterType;
            const isExpanded = expandedCluster === ct;

            return (
              <button
                key={cluster}
                onClick={() => setExpandedCluster(isExpanded ? null : ct)}
                className={cn(
                  'group rounded-xl border p-4 text-left transition-all duration-200',
                  isExpanded
                    ? 'border-primary/50 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <span className="text-2xl">{clusterIcons[ct]}</span>
                <h3 className="mt-2 text-xs font-semibold text-foreground">
                  {clusterLabels[ct] || ct.replace(/-/g, ' ')}
                </h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {clusterAgents.length} {clusterAgents.length === 1 ? 'agent' : 'agents'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Cluster Detail */}
      {expandedCluster && clusterGroups[expandedCluster] && (
        <div className="animate-slide-in">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">{clusterIcons[expandedCluster]}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {clusterLabels[expandedCluster] || expandedCluster.replace(/-/g, ' ')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {clusterGroups[expandedCluster].length} agents
              </p>
            </div>
            <button
              onClick={() => setExpandedCluster(null)}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clusterGroups[expandedCluster].map((agent) => (
              <EnhancedAgentCard
                key={agent.id}
                agent={agent}
                onExecute={() => onExecute(agent)}
                isExecuting={executing === agent.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Enhanced Agent Card ──────────────────────────────────────────────────── */

function EnhancedAgentCard({
  agent,
  onExecute,
  isExecuting,
}: {
  agent: Agent;
  onExecute: () => void;
  isExecuting: boolean;
}) {
  const tier = getAgentTier(agent);
  const powerLevel = getAgentPowerLevel(agent);
  const creditCost = getAgentCreditCost(agent);
  const tierInfo = tierConfig[tier] || tierConfig.standard;
  const hasGlow = tierInfo.glow && (tier === 'elite' || tier === 'stealth');

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/30',
        tierInfo.borderColor,
        hasGlow && `shadow-lg ${tierInfo.glow}`
      )}
    >
      {/* Stealth/Elite shimmer effect */}
      {hasGlow && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-r opacity-5',
              tier === 'stealth' ? 'from-purple-500 to-transparent' : 'from-amber-500 to-transparent'
            )}
          />
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{clusterIcons[agent.cluster]}</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
              <p className="text-[11px] text-muted-foreground">v{agent.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', statusDotColors[agent.status])} />
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                statusColors[agent.status]
              )}
            >
              {agent.status}
            </span>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Tier Badge + Power Level + Credit Cost */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Tier Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
              tierInfo.bgColor,
              tierInfo.borderColor,
              tierInfo.color
            )}
          >
            {tier === 'elite' && '⭐'}
            {tier === 'stealth' && '👻'}
            {tierInfo.label}
          </span>

          {/* Power Level Meter */}
          <div className="inline-flex items-center gap-0.5" title={powerLevelLabels[powerLevel] || 'Standard Power'}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Zap
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < powerLevel
                    ? tier === 'elite'
                      ? 'text-amber-400 fill-amber-400'
                      : tier === 'stealth'
                        ? 'text-purple-400 fill-purple-400'
                        : tier === 'advanced'
                          ? 'text-blue-400 fill-blue-400'
                          : 'text-slate-400 fill-slate-400'
                    : 'text-muted-foreground/20'
                )}
              />
            ))}
          </div>

          {/* Credit Cost */}
          <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
            <Coins className="h-2.5 w-2.5" />
            {creditCost} {creditCost === 1 ? 'credit' : 'credits'}
          </span>
        </div>

        {/* Cluster Badge */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              clusterColors[agent.cluster]
            )}
          >
            {clusterLabels[agent.cluster] || agent.cluster.replace(/-/g, ' ')}
          </span>
        </div>

        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[10px] text-muted-foreground">
            {agent.lastExecutionAt
              ? `Last run: ${formatRelativeTime(agent.lastExecutionAt)}`
              : 'Never executed'}
          </span>
          <button
            onClick={onExecute}
            disabled={isExecuting || !agent.isEnabled}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              agent.isEnabled
                ? 'bg-primary/15 text-primary hover:bg-primary/25'
                : 'bg-white/5 text-muted-foreground cursor-not-allowed'
            )}
          >
            {isExecuting ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Execute Modal ────────────────────────────────────────────────────────── */

function ExecuteModal({
  agent,
  executing,
  onExecute,
  onClose,
}: {
  agent: Agent;
  executing: string | null;
  onExecute: () => void;
  onClose: () => void;
}) {
  const tier = getAgentTier(agent);
  const powerLevel = getAgentPowerLevel(agent);
  const creditCost = getAgentCreditCost(agent);
  const tierInfo = tierConfig[tier] || tierConfig.standard;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Execute Agent</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-sm font-medium text-foreground">
              {agent.name}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Cluster: {clusterLabels[agent.cluster]}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Status: {agent.status}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className={cn('text-xs font-semibold', tierInfo.color)}>
                {tierInfo.label}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Zap
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < powerLevel ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'
                    )}
                  />
                ))}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {powerLevelLabels[powerLevel]}
                </span>
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs text-yellow-400">
                <Coins className="h-3 w-3" />
                {creditCost} {creditCost === 1 ? 'credit' : 'credits'}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This will execute the agent with the default configuration and deduct{' '}
            <span className="text-yellow-400 font-semibold">{creditCost} credit{creditCost !== 1 ? 's' : ''}</span>. Are you sure?
          </p>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onExecute}
            disabled={executing === agent.id}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {executing === agent.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}
