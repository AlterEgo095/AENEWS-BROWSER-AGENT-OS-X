'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { mockAgents } from '@/lib/mock-data';
import {
  cn,
  clusterColors,
  clusterIcons,
  statusColors,
  statusDotColors,
  formatRelativeTime,
} from '@/lib/utils';
import type { Agent, ClusterType, AgentStatus } from '@/lib/types';
import { ClusterType as CT, AgentStatus as AS } from '@/lib/types';

const clusterOptions: { value: ClusterType | ''; label: string }[] = [
  { value: '', label: 'All Clusters' },
  ...Object.values(CT).map((c) => ({ value: c, label: c.replace('-', ' ') })),
];

const statusOptions: { value: AgentStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  ...Object.values(AS).map((s) => ({ value: s, label: s })),
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterFilter, setClusterFilter] = useState<ClusterType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState<Agent | null>(null);

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
      setAgents(mockAgents);
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
      // Silently handle - in production show toast
    } finally {
      setExecuting(null);
      setShowExecuteModal(null);
    }
  }

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and control AI agents across all clusters
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

        {/* Cluster Filter */}
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

        {/* Active Filters Count */}
        {(clusterFilter || statusFilter || searchQuery) && (
          <button
            onClick={() => {
              setClusterFilter('');
              setStatusFilter('');
              setSearchQuery('');
            }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Filter className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onExecute={() => setShowExecuteModal(agent)}
              isExecuting={executing === agent.id}
            />
          ))}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Execute Agent</h3>
              <button
                onClick={() => setShowExecuteModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-sm font-medium text-foreground">
                  {showExecuteModal.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cluster: {showExecuteModal.cluster} • Status: {showExecuteModal.status}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will execute the agent with the default configuration. Are you sure you want to proceed?
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowExecuteModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecute(showExecuteModal)}
                disabled={executing === showExecuteModal.id}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {executing === showExecuteModal.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  onExecute,
  isExecuting,
}: {
  agent: Agent;
  onExecute: () => void;
  isExecuting: boolean;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30">
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

      {/* Cluster Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
            clusterColors[agent.cluster]
          )}
        >
          {agent.cluster.replace('-', ' ')}
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
  );
}
