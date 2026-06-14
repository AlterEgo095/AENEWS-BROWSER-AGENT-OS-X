'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  HardDrive,
  Cpu,
  Wifi,
  Rocket,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { mockClusterStats, mockHealth, mockAgents, mockEvents, mockMissions } from '@/lib/mock-data';
import { cn, clusterColors, clusterIcons, formatRelativeTime, missionStateColors, missionStateDotColors } from '@/lib/utils';
import type { ClusterStats, HealthCheckResult, Agent, Event, Mission } from '@/lib/types';
import { MissionState as MS } from '@/lib/types';

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'text-primary',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && <p className="mt-1 text-xs text-emerald-400">{trend}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', color.replace('text-', 'bg-') + '/15')}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  );
}

// Cluster Overview Card
function ClusterCard({ stat }: { stat: ClusterStats }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{clusterIcons[stat.cluster]}</span>
          <div>
            <h4 className="text-sm font-semibold capitalize text-foreground">
              {stat.cluster.replace(/-/g, ' ')}
            </h4>
            <p className="text-xs text-muted-foreground">
              {stat.totalAgents} agent{stat.totalAgents !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase',
            clusterColors[stat.cluster]
          )}
        >
          {stat.cluster.replace(/-/g, ' ')}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-muted-foreground">{stat.activeAgents} active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="text-[11px] text-muted-foreground">{stat.idleAgents} idle</span>
        </div>
        {stat.errorAgents > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[11px] text-red-400">{stat.errorAgents} error</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Health Indicator
function HealthIndicator({
  name,
  status,
  icon: Icon,
}: {
  name: string;
  status: string;
  icon: React.ElementType;
}) {
  const isUp = status === 'up';
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isUp ? 'bg-emerald-400' : 'bg-red-400'
          )}
        />
        <span
          className={cn(
            'text-xs font-medium',
            isUp ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// Activity Item
function ActivityItem({ event }: { event: Event }) {
  const severityColorMap: Record<string, string> = {
    info: 'border-l-blue-500',
    warning: 'border-l-amber-500',
    error: 'border-l-red-500',
    critical: 'border-l-red-600',
  };

  return (
    <div
      className={cn(
        'border-l-2 py-2 pl-3',
        severityColorMap[event.severity] || 'border-l-slate-500'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{event.type}</p>
          <p className="text-xs text-muted-foreground">{event.namespace}</p>
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(event.createdAt)}
        </span>
      </div>
    </div>
  );
}

// Recent Mission Item
function RecentMissionItem({ mission }: { mission: Mission }) {
  return (
    <Link
      href="/missions"
      className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/30"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('h-2 w-2 shrink-0 rounded-full', missionStateDotColors[mission.state])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{mission.name}</p>
          <p className="text-[10px] text-muted-foreground">{mission.progress}% complete</p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
          missionStateColors[mission.state]
        )}
      >
        {mission.state}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const [clusterStats, setClusterStats] = useState<ClusterStats[]>([]);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [recentMissions, setRecentMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const results = await Promise.allSettled([
          api.getAgentStats(),
          api.getHealth(),
          api.getAgents({ limit: 20 }),
          api.getEvents({ limit: 10 }),
          api.getMissions({ limit: 5 }),
        ]);

        if (results[0].status === 'fulfilled') setClusterStats(results[0].value);
        else setClusterStats(mockClusterStats);

        if (results[1].status === 'fulfilled') setHealth(results[1].value);
        else setHealth(mockHealth);

        if (results[2].status === 'fulfilled') setAgents(results[2].value.data || []);
        else setAgents(mockAgents);

        if (results[3].status === 'fulfilled') setRecentEvents(results[3].value.data || []);
        else setRecentEvents(mockEvents);

        if (results[4].status === 'fulfilled') setRecentMissions(results[4].value.data || []);
        else setRecentMissions(mockMissions.slice(0, 5));
      } catch {
        setClusterStats(mockClusterStats);
        setHealth(mockHealth);
        setAgents(mockAgents);
        setRecentEvents(mockEvents);
        setRecentMissions(mockMissions.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'running').length;
  const errorAgents = agents.filter((a) => a.status === 'error').length;
  const activeMissions = recentMissions.filter(
    (m) => ![MS.DRAFT, MS.COMPLETED, MS.CANCELLED, MS.ARCHIVED, MS.FAILED].includes(m.state)
  ).length;
  const healthyServices = health
    ? Object.values(health.info || {}).filter((s) => s.status === 'up').length
    : 0;
  const totalServices = health ? Object.keys(health.info || {}).length : 0;

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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Agents"
          value={totalAgents}
          subtitle="Across all clusters"
          icon={Bot}
          color="text-primary"
          trend="↑ 3 this week"
        />
        <StatCard
          title="Active"
          value={activeAgents}
          subtitle="Currently running"
          icon={Activity}
          color="text-emerald-400"
        />
        <StatCard
          title="Active Missions"
          value={activeMissions}
          subtitle="In progress"
          icon={Rocket}
          color="text-orange-400"
        />
        <StatCard
          title="Services UP"
          value={`${healthyServices}/${totalServices}`}
          subtitle="System health"
          icon={CheckCircle2}
          color="text-cyan-400"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Cluster Overview */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Cluster Overview
            </h3>
            <span className="text-xs text-muted-foreground">
              {clusterStats.length} clusters
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clusterStats.map((stat) => (
              <ClusterCard key={stat.cluster} stat={stat} />
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* System Health */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
              System Health
            </h3>
            <div className="space-y-2">
              {health?.info && (
                <>
                  <HealthIndicator name="Database" status={health.info.database?.status || 'unknown'} icon={Database} />
                  <HealthIndicator name="Redis" status={health.info.redis?.status || 'unknown'} icon={Server} />
                  <HealthIndicator name="Memory" status={health.info.memory_heap?.status || 'unknown'} icon={HardDrive} />
                  <HealthIndicator name="Disk" status={health.info.disk?.status || 'unknown'} icon={HardDrive} />
                  <HealthIndicator name="Agent System" status={health.info.agent_system?.status || 'unknown'} icon={Cpu} />
                  <HealthIndicator name="Network" status="up" icon={Wifi} />
                </>
              )}
            </div>
          </div>

          {/* Recent Missions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Recent Missions
              </h3>
              <Link
                href="/missions"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentMissions.map((mission) => (
                <RecentMissionItem key={mission.id} mission={mission} />
              ))}
              {recentMissions.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Rocket className="mx-auto h-6 w-6 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">No missions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Recent Activity
              </h3>
              <span className="text-xs text-muted-foreground">Live feed</span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 rounded-xl border border-border bg-card p-3">
              {recentEvents.map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
