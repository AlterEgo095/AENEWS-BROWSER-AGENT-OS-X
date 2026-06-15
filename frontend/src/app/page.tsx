'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Bot, Activity, CheckCircle2, AlertTriangle, Server, Database,
  HardDrive, Cpu, Rocket, Network, Shield, Zap,
  ArrowUpRight, ArrowDownRight,
  BrainCircuit, GitBranch, RefreshCw, Settings,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { api } from '@/lib/api';
import { cn, clusterColors, clusterIcons, formatRelativeTime, missionStateColors, missionStateDotColors } from '@/lib/utils';
import type { ClusterStats, HealthCheckResult, Agent, Event, Mission } from '@/lib/types';
import { MissionState as MS } from '@/lib/types';
import { useWebSocket } from '@/hooks/use-websocket';

// ─── Colors ──────────────────────────────────────────────────────
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#6366f1', '#84cc16', '#e11d48', '#0ea5e9'];

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({
  title, value, subtitle, icon: Icon, trend, trendValue, color = 'text-primary',
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'; trendValue?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && trendValue && (
            <div className="mt-1 flex items-center gap-1">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="h-3 w-3 text-red-400" />
              ) : null}
              <span className={cn('text-xs font-medium', trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground')}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', color.replace('text-', 'bg-') + '/15')}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  );
}

// ─── Circular Progress ───────────────────────────────────────────
function CircularProgress({ value, size = 80, strokeWidth = 6, color = '#3b82f6', label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Activity Feed Item ──────────────────────────────────────────
function ActivityItem({ event }: { event: Event }) {
  const severityColorMap: Record<string, string> = {
    info: 'border-l-blue-500', warning: 'border-l-amber-500',
    error: 'border-l-red-500', critical: 'border-l-red-600',
  };

  return (
    <div className={cn('border-l-2 py-2 pl-3', severityColorMap[event.severity] || 'border-l-slate-500')}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{event.type}</p>
          <p className="text-xs text-muted-foreground">{event.namespace}</p>
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
          {formatRelativeTime(event.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Cluster Card ────────────────────────────────────────────────
function ClusterCard({ stat }: { stat: ClusterStats }) {
  const healthPct = stat.totalAgents > 0 ? Math.round((stat.activeAgents / stat.totalAgents) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
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
        <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase', clusterColors[stat.cluster])}>
          {stat.cluster.replace(/-/g, ' ')}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${healthPct}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">{healthPct}%</span>
      </div>
      <div className="mt-2 flex gap-3">
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

// ─── Mission Row ─────────────────────────────────────────────────
function MissionRow({ mission }: { mission: Mission }) {
  return (
    <Link href="/missions"
      className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('h-2 w-2 shrink-0 rounded-full', missionStateDotColors[mission.state])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{mission.name}</p>
          <p className="text-[10px] text-muted-foreground">{mission.progress}% complete</p>
        </div>
      </div>
      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', missionStateColors[mission.state])}>
        {mission.state}
      </span>
    </Link>
  );
}

// ─── Health Indicator ────────────────────────────────────────────
function HealthIndicator({ name, status, icon: Icon }: { name: string; status: string; icon: React.ElementType }) {
  const isUp = status === 'up';
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn('h-2 w-2 rounded-full', isUp ? 'bg-emerald-400' : 'bg-red-400')} />
        <span className={cn('text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [clusterStats, setClusterStats] = useState<ClusterStats[]>([]);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [recentMissions, setRecentMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [perfData, setPerfData] = useState<Array<{ time: string; cpu: number; memory: number; eventLoop: number }>>([]);
  const { connected, subscribe, unsubscribe } = useWebSocket();

  // ─── Fetch data ────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getAgentStats(),
        api.getHealth(),
        api.getAgents({ limit: 100 }),
        api.getEvents({ limit: 20 }),
        api.getMissions({ limit: 10 }),
      ]);

      if (results[0].status === 'fulfilled') setClusterStats(results[0].value);

      if (results[1].status === 'fulfilled') setHealth(results[1].value);

      if (results[2].status === 'fulfilled') setAgents(results[2].value.data || []);

      if (results[3].status === 'fulfilled') setRecentEvents(results[3].value.data || []);

      if (results[4].status === 'fulfilled') setRecentMissions(results[4].value.data || []);
    } catch {
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  // ─── WebSocket updates ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => { fetchData(); };
    subscribe('*', handler);
    return () => { unsubscribe('*', handler); };
  }, [subscribe, unsubscribe]);

  // ─── Computed values ───────────────────────────────────────────
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'running').length;
  const errorAgents = agents.filter((a) => a.status === 'error').length;
  const idleAgents = agents.filter((a) => a.status === 'idle').length;
  const activeMissions = recentMissions.filter(
    (m) => ![MS.DRAFT, MS.COMPLETED, MS.CANCELLED, MS.ARCHIVED, MS.FAILED].includes(m.state)
  ).length;
  const completedMissions = recentMissions.filter((m) => m.state === MS.COMPLETED).length;
  const healthyServices = health ? Object.values(health.info || {}).filter((s: { status: string }) => s.status === 'up').length : 0;
  const totalServices = health ? Object.keys(health.info || {}).length : 0;
  const uptimePct = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;

  // ─── Chart data ────────────────────────────────────────────────
  const agentStatusData = useMemo(() => [
    { name: 'Running', value: activeAgents, color: '#22c55e' },
    { name: 'Idle', value: idleAgents, color: '#94a3b8' },
    { name: 'Error', value: errorAgents, color: '#ef4444' },
    { name: 'Stopped', value: agents.filter(a => a.status === 'stopped').length, color: '#6b7280' },
  ], [agents, activeAgents, idleAgents, errorAgents]);

  // NOTE: Historical time-series data requires a dedicated API endpoint.
  // Until one is available, we show only the current snapshot as a flat line
  // so users aren't misled by synthetic/fake trends.
  const timeSeriesData = useMemo(() => {
    const base = new Date();
    base.setMinutes(0, 0, 0);
    return Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(base.getTime() - (23 - i) * 3600000);
      return {
        time: hour.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        agents: i === 23 ? activeAgents : 0,
        tasks: 0,
        events: 0,
      };
    });
  }, [activeAgents]);

  // NOTE: Performance time-series requires the /performance/overview API.
  // Showing current snapshot until real historical data is available from the backend.
  useEffect(() => {
    async function fetchPerf() {
      try {
        const res = await fetch('/api/v1/performance/overview');
        if (res.ok) {
          const json = await res.json();
          const report = json.data?.profiling || json.profiling;
          if (report) {
            const base = new Date();
            base.setMinutes(base.getMinutes() - base.getMinutes() % 5, 0, 0);
            const memUtil = parseInt(report.memory?.heapUtilization || '0');
            const cpuUtil = parseFloat(report.cpu?.utilizationPercent || '0');
            const evLag = report.eventLoop?.currentLagMs || 0;
            setPerfData(Array.from({ length: 12 }, (_, i) => {
              const slot = new Date(base.getTime() - (11 - i) * 300000);
              return {
                time: slot.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
                cpu: i === 11 ? cpuUtil : 0,
                memory: i === 11 ? memUtil : 0,
                eventLoop: i === 11 ? evLag : 0,
              };
            }));
            return;
          }
        }
      } catch { /* performance endpoint unavailable */ }
      // Fallback: empty chart slots
      const base = new Date();
      base.setMinutes(base.getMinutes() - base.getMinutes() % 5, 0, 0);
      setPerfData(Array.from({ length: 12 }, (_, i) => {
        const slot = new Date(base.getTime() - (11 - i) * 300000);
        return { time: slot.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }), cpu: 0, memory: 0, eventLoop: 0 };
      }));
    }
    fetchPerf();
  }, []);

  const performanceData = useMemo(() => perfData, [perfData]);

  // ─── Loading ───────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-slide-in">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard title="Total Agents" value={totalAgents} subtitle="Across all clusters" icon={Bot} color="text-primary" />
        <StatCard title="Active" value={activeAgents} subtitle="Currently running" icon={Activity} color="text-emerald-400" trend="up" trendValue={`${Math.round(activeAgents/Math.max(totalAgents,1)*100)}% active`} />
        <StatCard title="Active Missions" value={activeMissions} subtitle="In progress" icon={Rocket} color="text-orange-400" />
        <StatCard title="Services UP" value={`${healthyServices}/${totalServices}`} subtitle="System health" icon={CheckCircle2} color="text-cyan-400" />
        <StatCard title="Uptime" value={`${uptimePct}%`} subtitle="Last 24h" icon={Server} color="text-emerald-400" trend={uptimePct >= 99 ? 'up' : uptimePct >= 90 ? 'neutral' : 'down'} trendValue={uptimePct >= 99 ? 'Healthy' : 'Degraded'} />
        <StatCard title="Errors" value={errorAgents} subtitle="Agent errors" icon={AlertTriangle} color="text-red-400" trend={errorAgents > 0 ? 'down' : 'up'} trendValue={errorAgents > 0 ? `${errorAgents} issues` : 'All clear'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Agent Activity Over Time */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Platform Activity</h3>
              <p className="text-xs text-muted-foreground">Last 24 hours — agents, tasks & events</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" />Agents</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" />Tasks</div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" />Events</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorAgents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
              <Area type="monotone" dataKey="agents" stroke="#3b82f6" fill="url(#colorAgents)" strokeWidth={2} />
              <Area type="monotone" dataKey="tasks" stroke="#22c55e" fill="url(#colorTasks)" strokeWidth={2} />
              <Area type="monotone" dataKey="events" stroke="#f59e0b" fillOpacity={0} strokeWidth={1.5} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Agent Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RPieChart>
              <Pie data={agentStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {agentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
            </RPieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {agentStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Cluster Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Cluster Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clusterStats.map((cs, i) => ({
              name: cs.cluster.replace(/-/g, ' ').substring(0, 8),
              agents: cs.totalAgents,
              active: cs.activeAgents,
              fill: CHART_COLORS[i % CHART_COLORS.length],
            }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} width={65} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
              <Bar dataKey="agents" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="active" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System Performance */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">System Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="memory" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="eventLoop" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" />CPU</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400" />Memory</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400" />Event Loop</div>
          </div>
        </div>

        {/* Circular Gauges */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">System Health</h3>
          <div className="grid grid-cols-2 gap-4 place-items-center">
            <CircularProgress value={uptimePct} color="#22c55e" label="Uptime" />
            <CircularProgress value={totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0} color="#3b82f6" label="Agent Utilization" />
            <CircularProgress value={recentMissions.length > 0 ? Math.round((completedMissions / recentMissions.length) * 100) : 0} color="#f59e0b" label="Mission Success" />
            <CircularProgress value={healthyServices > 0 ? Math.round((healthyServices / Math.max(totalServices, 1)) * 100) : 0} color="#06b6d4" label="Infrastructure" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Cluster Overview */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Cluster Overview
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchData()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
              <span className="text-xs text-muted-foreground">
                {clusterStats.length} clusters
              </span>
            </div>
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
              Infrastructure Health
            </h3>
            <div className="space-y-2">
              {health?.info && (
                <>
                  <HealthIndicator name="PostgreSQL" status={health.info.database?.status || 'unknown'} icon={Database} />
                  <HealthIndicator name="Redis" status={health.info.redis?.status || 'unknown'} icon={Server} />
                  <HealthIndicator name="Neo4j" status={health.info.neo4j?.status || 'up'} icon={Network} />
                  <HealthIndicator name="Qdrant" status={health.info.qdrant?.status || 'up'} icon={Zap} />
                  <HealthIndicator name="RabbitMQ" status={health.info.rabbitmq?.status || 'up'} icon={GitBranch} />
                  <HealthIndicator name="MinIO" status={health.info.minio?.status || 'up'} icon={HardDrive} />
                  <HealthIndicator name="Memory" status={health.info.memory_heap?.status || 'unknown'} icon={Cpu} />
                  <HealthIndicator name="Agent System" status={health.info.agent_system?.status || 'unknown'} icon={Bot} />
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin" className="group rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-primary/5 p-3 transition-all duration-200 hover:border-primary/30">
                <Settings className="h-5 w-5 text-primary mb-1" />
                <p className="text-xs font-semibold text-foreground">Admin Panel</p>
                <p className="text-[10px] text-muted-foreground">Full control</p>
              </Link>
              <Link href="/orchestration" className="group rounded-xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 p-3 transition-all duration-200 hover:border-emerald-500/30">
                <Network className="h-5 w-5 text-emerald-400 mb-1" />
                <p className="text-xs font-semibold text-foreground">Orchestration</p>
                <p className="text-[10px] text-muted-foreground">Collaboration</p>
              </Link>
              <Link href="/intelligence" className="group rounded-xl border border-border bg-gradient-to-br from-violet-500/10 via-card to-violet-500/5 p-3 transition-all duration-200 hover:border-violet-500/30">
                <BrainCircuit className="h-5 w-5 text-violet-400 mb-1" />
                <p className="text-xs font-semibold text-foreground">Intelligence</p>
                <p className="text-[10px] text-muted-foreground">Knowledge</p>
              </Link>
              <Link href="/security" className="group rounded-xl border border-border bg-gradient-to-br from-red-500/10 via-card to-red-500/5 p-3 transition-all duration-200 hover:border-red-500/30">
                <Shield className="h-5 w-5 text-red-400 mb-1" />
                <p className="text-xs font-semibold text-foreground">Security</p>
                <p className="text-[10px] text-muted-foreground">Monitoring</p>
              </Link>
            </div>
          </div>

          {/* Recent Missions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent Missions</h3>
              <Link href="/missions" className="text-xs text-primary hover:text-primary/80 transition-colors">View all</Link>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentMissions.slice(0, 5).map((mission) => (
                <MissionRow key={mission.id} mission={mission} />
              ))}
              {recentMissions.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Rocket className="mx-auto h-6 w-6 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">No missions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Live Event Stream</h3>
            <p className="text-xs text-muted-foreground">Real-time platform activity</p>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </div>
            )}
            <Link href="/events" className="text-xs text-primary hover:text-primary/80 transition-colors">View all</Link>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {recentEvents.map((event) => (
            <ActivityItem key={event.id} event={event} />
          ))}
        </div>
      </div>

      {/* Last refresh indicator */}
      <div className="text-center text-[10px] text-muted-foreground/50">
        Last refreshed: {lastRefresh.toLocaleTimeString()} — Auto-refresh every 15s
      </div>
    </div>
  );
}
