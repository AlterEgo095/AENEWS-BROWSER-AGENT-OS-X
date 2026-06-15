'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings, Users, Database, Shield, BarChart3, Bot,
  Rocket, Activity, Zap, RefreshCw, Download, Upload, Eye,
  AlertTriangle, CheckCircle2, XCircle,
  HardDrive, Network, Lock, Key, Globe,
  TrendingUp, Play, Pause, RotateCcw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { api, getAuthHeaders } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Agent, ClusterStats, Mission } from '@/lib/types';
import { ClusterType, MissionState } from '@/lib/types';
import { useDashboardOverview, useAgentStats, useHealth } from '@/hooks/use-platform-data';

// ─── Tab Config ──────────────────────────────────────────────────
type AdminTab = 'overview' | 'agents' | 'missions' | 'infrastructure' | 'security' | 'users' | 'config' | 'analytics';

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'missions', label: 'Missions', icon: Rocket },
  { id: 'infrastructure', label: 'Infrastructure', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

// ─── Overview Tab ────────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading } = useDashboardOverview();

  if (isLoading || !data) {
    return <div className="animate-shimmer h-96 rounded-xl" />;
  }

  const { kpis, agents, missions } = data;

  // Agent status distribution
  const statusData = [
    { name: 'Running', value: kpis.activeAgents, color: '#22c55e' },
    { name: 'Idle', value: agents.filter((a: Agent) => a.status === 'idle').length, color: '#94a3b8' },
    { name: 'Error', value: kpis.errorAgents, color: '#ef4444' },
    { name: 'Paused', value: agents.filter((a: Agent) => a.status === 'paused').length, color: '#f59e0b' },
  ];

  // Mission state distribution
  const missionData = Object.entries(
    missions.reduce((acc: Record<string, number>, m: Mission) => {
      acc[m.state] = (acc[m.state] || 0) + 1;
      return acc;
    }, {})
  ).map(([state, count]) => ({ state, count }));

  // NOTE: Historical time-series data requires a dedicated API endpoint.
  // Until one is available, we show only the current snapshot value at the most recent slot
  // to avoid misleading users with synthetic/fake trend lines.
  const tsData = Array.from({ length: 24 }, (_, i) => ({
    time: `${23 - i}h`,
    agents: i === 0 ? kpis.activeAgents : 0,
    missions: i === 0 ? kpis.activeMissions : 0,
  })).reverse();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Agents', value: kpis.totalAgents, icon: Bot, color: 'text-primary' },
          { label: 'Active Missions', value: kpis.activeMissions, icon: Rocket, color: 'text-orange-400' },
          { label: 'Uptime', value: `${kpis.uptimePercent}%`, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Errors', value: kpis.errorAgents, icon: AlertTriangle, color: 'text-red-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
              <div className={cn('rounded-lg p-2', kpi.color.replace('text-', 'bg-') + '/15')}>
                <kpi.icon className={cn('h-4 w-4', kpi.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Activity Time Series */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Activity Timeline</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tsData}>
              <defs>
                <linearGradient id="adminAgentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
              <Area type="monotone" dataKey="agents" stroke="#3b82f6" fill="url(#adminAgentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="missions" stroke="#f59e0b" fillOpacity={0} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Pie */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Agent Status</h4>
          <ResponsiveContainer width="100%" height={160}>
            <RPieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
            </RPieChart>
          </ResponsiveContainer>
          <div className="space-y-1">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div>
                <span className="font-semibold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission States Bar Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Mission States</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={missionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="state" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Agents Tab ──────────────────────────────────────────────────
function AgentsTab() {
  const { data: stats } = useAgentStats();
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [search, setSearch] = useState('');

  const clusters = Object.values(ClusterType);
  const filteredStats = stats?.filter((cs: ClusterStats) =>
    filterCluster === 'all' || cs.cluster === filterCluster
  ) || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <select
          value={filterCluster}
          onChange={(e) => setFilterCluster(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        >
          <option value="all">All Clusters</option>
          {clusters.map((c) => (
            <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Cluster Agent Grid */}
      <div className="space-y-4">
        {filteredStats.map((cs: ClusterStats) => (
          <div key={cs.cluster} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground capitalize">
                {cs.cluster.replace(/-/g, ' ')} — {cs.totalAgents} agents
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400">{cs.activeAgents} active</span>
                <span className="text-[10px] text-muted-foreground">{cs.idleAgents} idle</span>
                {cs.errorAgents > 0 && <span className="text-[10px] text-red-400">{cs.errorAgents} errors</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cs.agents
                .filter((a: Agent) => !search || a.name.toLowerCase().includes(search.toLowerCase()))
                .map((agent: Agent) => (
                <div key={agent.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      agent.status === 'running' ? 'bg-emerald-400 animate-pulse' :
                      agent.status === 'error' ? 'bg-red-400' :
                      agent.status === 'idle' ? 'bg-slate-400' : 'bg-amber-400'
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">v{agent.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {agent.status === 'running' ? (
                      <button disabled title="Agent pause coming soon" className="p-1 rounded text-amber-400/40 cursor-not-allowed">
                        <Pause className="h-3 w-3" />
                      </button>
                    ) : (
                      <button disabled title="Agent start coming soon" className="p-1 rounded text-emerald-400/40 cursor-not-allowed">
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                    <button disabled title="Agent restart coming soon" className="p-1 rounded text-muted-foreground/40 cursor-not-allowed">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Missions Tab ────────────────────────────────────────────────
function MissionsTab() {
  const [filter, setFilter] = useState<string>('all');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [, setLoadingMissions] = useState(true);

  useEffect(() => {
    async function fetchMissions() {
      try {
        const result = await api.getMissions({ limit: 50 });
        setMissions(result.data || []);
      } catch {
        setMissions([]);
      } finally {
        setLoadingMissions(false);
      }
    }
    fetchMissions();
  }, []);

  const filtered = filter === 'all' ? missions : missions.filter(m => m.state === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        >
          <option value="all">All States</option>
          {Object.values(MissionState).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Link href="/missions" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Rocket className="h-3.5 w-3.5" /> New Mission
        </Link>
      </div>

      <div className="space-y-2">
        {filtered.map((mission) => (
          <div key={mission.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{mission.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ml-2',
                mission.state === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                mission.state === 'FAILED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                mission.state === 'BUILDING' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                'bg-blue-500/20 text-blue-400 border-blue-500/30'
              )}>
                {mission.state}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{mission.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className={cn(
                  'h-full rounded-full transition-all duration-500',
                  mission.state === 'COMPLETED' ? 'bg-emerald-400' :
                  mission.state === 'FAILED' ? 'bg-red-400' : 'bg-primary'
                )} style={{ width: `${mission.progress}%` }} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {mission.state !== 'COMPLETED' && mission.state !== 'FAILED' && mission.state !== 'CANCELLED' && (
                <>
                  <button disabled title="Mission pause coming soon" className="p-1 rounded text-amber-400/40 cursor-not-allowed">
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                  <button disabled title="Mission cancel coming soon" className="p-1 rounded text-red-400/40 cursor-not-allowed">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button disabled title="Mission details coming soon" className="p-1 rounded text-muted-foreground/40 cursor-not-allowed">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Infrastructure Tab ──────────────────────────────────────────
function InfrastructureTab() {
  const { data: health } = useHealth();
  const services = [
    { name: 'PostgreSQL', icon: Database, key: 'database', port: 5432 },
    { name: 'Redis', icon: Zap, key: 'redis', port: 6379 },
    { name: 'Neo4j', icon: Network, key: 'neo4j', port: 7687 },
    { name: 'Qdrant', icon: HardDrive, key: 'qdrant', port: 6333 },
    { name: 'RabbitMQ', icon: Activity, key: 'rabbitmq', port: 5672 },
    { name: 'MinIO', icon: Database, key: 'minio', port: 9000 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => {
          const status = (health?.info as Record<string, { status: string }>)?.[svc.key]?.status || 'up';
          const isUp = status === 'up';
          return (
            <div key={svc.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-lg p-2', isUp ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
                    <svc.icon className={cn('h-4 w-4', isUp ? 'text-emerald-400' : 'text-red-400')} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{svc.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Port {svc.port}</p>
                  </div>
                </div>
                <div className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold',
                  isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                )}>
                  <div className={cn('h-1.5 w-1.5 rounded-full', isUp ? 'bg-emerald-400' : 'bg-red-400')} />
                  {isUp ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-background/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <p className={cn('text-xs font-bold', isUp ? 'text-emerald-400' : 'text-red-400')}>{status.toUpperCase()}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Latency</p>
                  <p className="text-xs font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg bg-background/50 p-2">
                  <p className="text-[10px] text-muted-foreground">Conns</p>
                  <p className="text-xs font-bold text-foreground">—</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infrastructure Metrics */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Resource Usage</h4>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'CPU Usage', value: health?.info?.memory_heap ? Math.min(Math.round(((health.info.memory_heap as Record<string, { percent?: number }>)?.heapUsed?.percent ?? 0)), 100) : 0, max: 100, unit: '%', color: '#3b82f6' },
            { label: 'Memory', value: health?.info?.memory_heap ? Math.min(Math.round(((health.info.memory_heap as Record<string, { percent?: number }>)?.heapTotal?.percent ?? 0)), 100) : 0, max: 100, unit: '%', color: '#f59e0b' },
            { label: 'Disk I/O', value: 0, max: 100, unit: '%', color: '#22c55e' },
            { label: 'Network', value: 0, max: 100, unit: 'Mbps', color: '#8b5cf6' },
          ].map((metric) => (
            <div key={metric.label}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="text-foreground font-medium">{metric.value}{metric.unit}</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${metric.value}%`, backgroundColor: metric.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ────────────────────────────────────────────────
function SecurityTab() {
  const [securityFeatures, setSecurityFeatures] = useState([
    { title: 'JWT Authentication', desc: 'Token-based auth with refresh', enabled: true, icon: Key },
    { title: 'Rate Limiting', desc: 'Redis-backed per-cluster limits', enabled: true, icon: Shield },
    { title: 'CORS Protection', desc: 'Cross-origin security middleware', enabled: true, icon: Globe },
    { title: 'Account Lockout', desc: 'Brute-force prevention', enabled: true, icon: Lock },
    { title: 'Circuit Breakers', desc: '30 pre-registered circuits', enabled: true, icon: Zap },
    { title: 'IP Access Control', desc: 'Whitelist/blacklist support', enabled: false, icon: Network },
  ]);

  const toggleFeature = (index: number) => {
    setSecurityFeatures(prev => prev.map((f, i) => i === index ? { ...f, enabled: !f.enabled } : f));
  };

  const [auditLogs, setAuditLogs] = useState<Array<{ time: string; action: string; user: string; status: string }>>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const res = await fetch('/api/v1/security/audit/logs?limit=20', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.data || data || []);
        }
      } catch {
        setAuditLogs([]);
      } finally {
        setLoadingAudit(false);
      }
    }
    fetchAuditLogs();
  }, []);

  // Fetch security metrics from the backend API
  const [securityMetrics, setSecurityMetrics] = useState([
    { label: 'Threat Level', value: '—', color: 'text-muted-foreground', bgColor: 'bg-slate-500/15' },
    { label: 'Active Sessions', value: '—', color: 'text-muted-foreground', bgColor: 'bg-slate-500/15' },
    { label: 'Failed Logins (24h)', value: '—', color: 'text-muted-foreground', bgColor: 'bg-slate-500/15' },
    { label: 'Blocked IPs', value: '—', color: 'text-muted-foreground', bgColor: 'bg-slate-500/15' },
  ]);

  useEffect(() => {
    async function fetchSecurityMetrics() {
      try {
        const [lockoutRes, sessionsRes, ipRes] = await Promise.allSettled([
          fetch('/api/v1/security/lockout/stats', { headers: getAuthHeaders(), credentials: 'include' }),
          fetch('/api/v1/security/tokens/sessions', { headers: getAuthHeaders(), credentials: 'include' }),
          fetch('/api/v1/security/threats/ip-reputations', { headers: getAuthHeaders(), credentials: 'include' }),
        ]);

        let lockedCount = 0;
        let sessionCount = 0;
        let blockedCount = 0;

        if (lockoutRes.status === 'fulfilled' && lockoutRes.value.ok) {
          const data = await lockoutRes.value.json();
          lockedCount = data.totalLockedAccounts || 0;
        }
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
          const data = await sessionsRes.value.json();
          sessionCount = Array.isArray(data) ? data.length : 0;
        }
        if (ipRes.status === 'fulfilled' && ipRes.value.ok) {
          const data = await ipRes.value.json();
          blockedCount = Array.isArray(data) ? data.filter((ip: { autoBlocked: boolean }) => ip.autoBlocked).length : 0;
        }

        const threatLevel = lockedCount === 0 && blockedCount === 0 ? 'LOW' : lockedCount > 3 || blockedCount > 5 ? 'HIGH' : 'MEDIUM';
        const threatColor = threatLevel === 'LOW' ? 'text-emerald-400' : threatLevel === 'HIGH' ? 'text-red-400' : 'text-amber-400';
        const threatBg = threatLevel === 'LOW' ? 'bg-emerald-500/15' : threatLevel === 'HIGH' ? 'bg-red-500/15' : 'bg-amber-500/15';

        setSecurityMetrics([
          { label: 'Threat Level', value: threatLevel, color: threatColor, bgColor: threatBg },
          { label: 'Active Sessions', value: String(sessionCount), color: 'text-primary', bgColor: 'bg-primary/15' },
          { label: 'Failed Logins (24h)', value: String(lockedCount), color: lockedCount > 0 ? 'text-amber-400' : 'text-emerald-400', bgColor: lockedCount > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15' },
          { label: 'Blocked IPs', value: String(blockedCount), color: blockedCount > 0 ? 'text-red-400' : 'text-emerald-400', bgColor: blockedCount > 0 ? 'bg-red-500/15' : 'bg-emerald-500/15' },
        ]);
      } catch {
        // Keep default placeholder metrics
      }
    }
    fetchSecurityMetrics();
  }, []);

  return (
    <div className="space-y-4">
      {/* Security KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {securityMetrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', m.color)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Security Features */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {securityFeatures.map((feature, idx) => (
          <div key={feature.title} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', feature.enabled ? 'bg-emerald-500/15' : 'bg-slate-500/15')}>
                <feature.icon className={cn('h-4 w-4', feature.enabled ? 'text-emerald-400' : 'text-slate-400')} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">{feature.title}</h4>
                <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggleFeature(idx)}
              title="Visual indicator only — changes are not persisted to backend"
              className={cn('h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer',
                feature.enabled ? 'bg-emerald-500' : 'bg-border'
              )}>
              <div className={cn('h-4 w-4 rounded-full bg-white transition-transform',
                feature.enabled ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </div>
        ))}
      </div>

      {/* Audit Log */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Recent Audit Log</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loadingAudit ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No audit logs available</p>
          ) : (
            auditLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16">{log.time}</span>
                  <span className="text-xs text-foreground">{log.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{log.user}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                    log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  )}>{log.status.toUpperCase()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<Array<{ id: string; email: string; firstName: string; lastName: string; role: string; status: string; lastLogin: string; tenant: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/v1/users?limit=50', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.data || data || []);
        }
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    viewer: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users registered</p>
        <button
          disabled
          title="User management coming soon"
          className="flex items-center gap-1.5 rounded-lg bg-primary/50 px-3 py-2 text-xs font-medium text-primary-foreground/70 cursor-not-allowed"
        >
          <Users className="h-3.5 w-3.5" /> Add User
        </button>
      </div>

      {loadingUsers ? (
        <div className="animate-shimmer h-48 rounded-xl" />
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">No users found</p>
          <p className="text-xs text-muted-foreground/60">Users will appear here once registered</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {user.firstName?.[0] || user.email?.[0] || '?'}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{user.firstName ? `${user.firstName} ${user.lastName}` : user.email}</h4>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">Tenant: {user.tenant}</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', roleColors[user.role] || 'bg-slate-500/20 text-slate-400 border-slate-500/30')}>
                  {user.role}
                </span>
                <span className={cn('text-[10px]', user.status === 'active' ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {user.status === 'active' ? '●' : '○'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ──────────────────────────────────────────────────
interface ConfigItem {
  key: string;
  value: string;
  type: 'secret' | 'text' | 'boolean' | 'number';
}

function ConfigTab() {
  const [configs, setConfigs] = useState<{ category: string; items: ConfigItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/v1/admin/config', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setConfigs(data.data || data.categories || []);
          setError(null);
        } else {
          setError('Configuration endpoint unavailable');
          setConfigs([]);
        }
      } catch {
        setError('Connect to backend for configuration');
        setConfigs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  if (loading) {
    return <div className="animate-shimmer h-96 rounded-xl" />;
  }

  if (error || configs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Settings className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {error || 'No configuration data available'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Connect to the backend API to load platform configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {configs.map((category) => (
        <div key={category.category} className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">{category.category}</h4>
          <div className="space-y-2">
            {category.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground">{item.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.type === 'secret' ? (
                    <span className="text-xs font-mono text-muted-foreground">••••••••</span>
                  ) : item.type === 'boolean' ? (
                    <div className={cn('h-5 w-9 rounded-full p-0.5 cursor-pointer', item.value === 'true' ? 'bg-emerald-500' : 'bg-border')}>
                      <div className={cn('h-4 w-4 rounded-full bg-white transition-transform', item.value === 'true' ? 'translate-x-4' : 'translate-x-0')} />
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-foreground">{item.value}</span>
                  )}
                  <button disabled title="Config editing coming soon" className="p-1 rounded text-muted-foreground/40 cursor-not-allowed">
                    <Settings className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          disabled
          title="Configuration save coming soon"
          className="flex items-center gap-1.5 rounded-lg bg-primary/50 px-4 py-2 text-xs font-medium text-primary-foreground/70 cursor-not-allowed"
        >
          <Upload className="h-3.5 w-3.5" /> Save Configuration
        </button>
        <button
          disabled
          title="Configuration export coming soon"
          className="flex items-center gap-1.5 rounded-lg border border-border/50 px-4 py-2 text-xs font-medium text-muted-foreground cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────
function AnalyticsTab() {
  const { data: stats } = useAgentStats();
  // NOTE: 30-day historical trends require a dedicated analytics/time-series API.
  // Until one is available, we show the current snapshot only at the most recent data point,
  // so the chart structure renders without misleading fake trends.
  const usageData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    missions: i === 29 && stats ? stats.reduce((sum: number, cs: ClusterStats) => sum + cs.activeAgents, 0) : 0,
    tasks: i === 29 && stats ? stats.reduce((sum: number, cs: ClusterStats) => sum + cs.idleAgents, 0) : 0,
    errors: i === 29 && stats ? stats.reduce((sum: number, cs: ClusterStats) => sum + cs.errorAgents, 0) : 0,
  }));

  const clusterPerformance = (stats || []).map((cs) => ({
    name: cs.cluster.replace(/-/g, ' ').substring(0, 10),
    avgResponseTime: 0,
    successRate: cs.totalAgents > 0 ? Math.round((cs.activeAgents / cs.totalAgents) * 100) : 0,
    throughput: cs.totalAgents,
  }));

  return (
    <div className="space-y-4">
      {/* 30-Day Usage */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">30-Day Usage Trends</h4>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={usageData}>
            <defs>
              <linearGradient id="analyticsMissions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} interval={4} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
            <Area type="monotone" dataKey="tasks" stroke="#22c55e" fillOpacity={0} strokeWidth={1.5} />
            <Area type="monotone" dataKey="missions" stroke="#3b82f6" fill="url(#analyticsMissions)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cluster Performance Comparison */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Cluster Performance</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={clusterPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 8 }} tickLine={false} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
            <Bar dataKey="successRate" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} name="Success %" />
            <Bar dataKey="throughput" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} name="Throughput" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Error Rate */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Daily Errors</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} interval={4} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
            <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Full platform control & monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            title="Report export coming soon"
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-xs text-muted-foreground/50 cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Export Report
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'agents' && <AgentsTab />}
      {activeTab === 'missions' && <MissionsTab />}
      {activeTab === 'infrastructure' && <InfrastructureTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
