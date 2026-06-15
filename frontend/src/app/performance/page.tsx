'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  PerformanceOverview,
} from '@/lib/types';
import { getAuthHeaders } from '@/lib/api';

const API_BASE = '/api/v1';

type TabKey = 'overview' | 'memory' | 'pools' | 'slow-queries' | 'cache' | 'recommendations';

export default function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/performance/overview`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'memory', label: 'Memory', icon: '🧠' },
    { key: 'pools', label: 'Pools', icon: '🔗' },
    { key: 'slow-queries', label: 'Slow Queries', icon: '🐌' },
    { key: 'cache', label: 'Cache', icon: '💾' },
    { key: 'recommendations', label: 'Tips', icon: '💡' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400 text-center">
          <p className="text-xl mb-2">Failed to load performance data</p>
          <p className="text-sm text-gray-400">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-yellow-400">⚡</span>
            Performance Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time performance monitoring and optimization — Phase 13
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {!data ? (
          <div className="text-gray-400 text-center py-20">No data available</div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'memory' && <MemoryTab data={data} />}
            {activeTab === 'pools' && <PoolsTab data={data} />}
            {activeTab === 'slow-queries' && <SlowQueriesTab data={data} />}
            {activeTab === 'cache' && <CacheTab data={data} />}
            {activeTab === 'recommendations' && <RecommendationsTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color = 'blue' }: {
  title: string; value: string | number; subtitle?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-xl p-4`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function OverviewTab({ data }: { data: PerformanceOverview }) {
  const { profiling, slowQueries, cache, compression } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Uptime"
          value={`${Math.floor(profiling.uptime / 3600)}h ${Math.floor((profiling.uptime % 3600) / 60)}m`}
          subtitle={`${profiling.uptime.toFixed(0)} seconds`}
          color="green"
        />
        <StatCard
          title="Heap Utilization"
          value={profiling.memory.heapUtilization}
          subtitle={profiling.memory.heapUsed}
          color={parseInt(profiling.memory.heapUtilization) > 80 ? 'red' : 'blue'}
        />
        <StatCard
          title="Event Loop Lag"
          value={`${profiling.eventLoop.currentLagMs.toFixed(1)}ms`}
          subtitle={`P99: ${profiling.eventLoop.p99LagMs.toFixed(1)}ms`}
          color={profiling.eventLoop.currentLagMs > 100 ? 'red' : 'cyan'}
        />
        <StatCard
          title="CPU Usage"
          value={profiling.cpu.utilizationPercent + '%'}
          subtitle={`User: ${(profiling.cpu.userMs / 1000).toFixed(1)}s`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Slow Queries"
          value={slowQueries.totalSlowQueries}
          subtitle={`Threshold: ${slowQueries.thresholdMs}ms`}
          color={slowQueries.totalSlowQueries > 50 ? 'yellow' : 'green'}
        />
        <StatCard
          title="Cache Hit Rate"
          value={cache.hitRate}
          subtitle={`${cache.hits} hits / ${cache.misses} misses`}
          color={parseFloat(cache.hitRate) > 70 ? 'green' : 'yellow'}
        />
        <StatCard
          title="Compression"
          value={compression.totalCompressed.toString()}
          subtitle={`Ratio: ${(compression.averageRatio * 100).toFixed(0)}%`}
          color="blue"
        />
        <StatCard
          title="Active Spans"
          value={profiling.activeSpans.toString()}
          subtitle="Running profiling spans"
          color="purple"
        />
      </div>

      {profiling.topSlowSpans.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Slow Spans</h3>
          <div className="space-y-3">
            {profiling.topSlowSpans.slice(0, 5).map((span, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-300 font-mono text-sm">{span.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{span.count} calls</span>
                  <span className="text-yellow-400 font-mono">{span.avgMs.toFixed(0)}ms avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profiling.recommendations.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-yellow-800/50 p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {profiling.recommendations.map((rec, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemoryTab({ data }: { data: PerformanceOverview }) {
  const { profiling } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Heap Used" value={profiling.memory.heapUsed} color="blue" />
        <StatCard title="Heap Total" value={profiling.memory.heapTotal} color="cyan" />
        <StatCard title="RSS" value={profiling.memory.rss} color="purple" />
        <StatCard title="External" value={profiling.memory.external} color="green" />
        <StatCard
          title="Heap Utilization"
          value={profiling.memory.heapUtilization}
          color={parseInt(profiling.memory.heapUtilization) > 85 ? 'red' : 'green'}
        />
        <StatCard title="GC Pause Est." value={profiling.memory.gcPauseEstimate} color="yellow" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Event Loop</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Current</p>
            <p className="text-xl font-mono">{profiling.eventLoop.currentLagMs.toFixed(1)}ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">P50</p>
            <p className="text-xl font-mono">{profiling.eventLoop.p50LagMs.toFixed(1)}ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">P95</p>
            <p className="text-xl font-mono">{profiling.eventLoop.p95LagMsMs.toFixed(1)}ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">P99</p>
            <p className="text-xl font-mono">{profiling.eventLoop.p99LagMs.toFixed(1)}ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PoolsTab({ data }: { data: PerformanceOverview }) {
  const { pools, poolRecommendations } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pools.map((pool) => {
          const util = pool.max > 0 ? (pool.active / pool.max) * 100 : 0;
          return (
            <div key={pool.name} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">{pool.name}</h3>
                <span className={`text-sm font-mono ${
                  util > 90 ? 'text-red-400' : util > 75 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {util.toFixed(0)}% utilized
                </span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full mb-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    util > 90 ? 'bg-red-500' : util > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(util, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-gray-500">Active</p>
                  <p className="font-mono text-blue-400">{pool.active}</p>
                </div>
                <div>
                  <p className="text-gray-500">Idle</p>
                  <p className="font-mono text-green-400">{pool.idle}</p>
                </div>
                <div>
                  <p className="text-gray-500">Max</p>
                  <p className="font-mono text-gray-400">{pool.max}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>Acquired: {pool.totalAcquired}</span>
                <span>Released: {pool.totalReleased}</span>
                <span className={pool.totalTimeouts > 0 ? 'text-red-400' : ''}>
                  Timeouts: {pool.totalTimeouts}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {poolRecommendations.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-3">Pool Recommendations</h3>
          <div className="space-y-2">
            {poolRecommendations.map((rec, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                rec.severity === 'critical' ? 'border-red-800 bg-red-900/20' :
                rec.severity === 'warning' ? 'border-yellow-800 bg-yellow-900/20' :
                'border-gray-700 bg-gray-800/50'
              }`}>
                <span className={`font-medium ${
                  rec.severity === 'critical' ? 'text-red-400' :
                  rec.severity === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  [{rec.severity.toUpperCase()}] {rec.pool}
                </span>
                <p className="text-gray-300 text-sm mt-1">{rec.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SlowQueriesTab({ data }: { data: PerformanceOverview }) {
  const { slowQueries } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Slow Queries" value={slowQueries.totalSlowQueries} color="yellow" />
        <StatCard title="Avg Duration" value={`${slowQueries.averageDurationMs}ms`} color="blue" />
        <StatCard title="Max Duration" value={`${slowQueries.maxDurationMs}ms`} color="red" />
        <StatCard title="P95 Duration" value={`${slowQueries.p95DurationMs}ms`} color="purple" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">By Schema</h3>
        <div className="space-y-3">
          {Object.entries(slowQueries.bySchema).map(([schema, stats]) => (
            <div key={schema} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="font-mono text-sm text-blue-400">{schema}</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">{stats.count} queries</span>
                <span className="text-yellow-400 font-mono">{stats.avgMs}ms avg</span>
              </div>
            </div>
          ))}
          {Object.keys(slowQueries.bySchema).length === 0 && (
            <p className="text-gray-500 text-sm">No slow queries recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CacheTab({ data }: { data: PerformanceOverview }) {
  const { cache, compression } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Cache Hit Rate" value={cache.hitRate} color="green" />
        <StatCard title="Cache Hits" value={cache.hits.toString()} color="blue" />
        <StatCard title="Cache Misses" value={cache.misses.toString()} color="yellow" />
        <StatCard title="Cache Sets" value={cache.sets.toString()} color="purple" />
        <StatCard title="Evictions" value={cache.evictions.toString()} color="red" />
        <StatCard title="Memory Size" value={cache.memorySize.toString()} color="cyan" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Compression</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Compressed</p>
            <p className="text-xl font-mono">{compression.totalCompressed}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Bytes Saved</p>
            <p className="text-xl font-mono text-green-400">
              {(compression.totalBytesSaved / 1024).toFixed(1)}KB
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Ratio</p>
            <p className="text-xl font-mono">{(compression.averageRatio * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationsTab({ data }: { data: PerformanceOverview }) {
  const allRecs = [
    ...data.profiling.recommendations.map((r) => ({ text: r, source: 'Profiling', severity: 'warning' as const })),
    ...data.poolRecommendations.map((r) => ({ text: r.recommendation, source: r.pool, severity: r.severity })),
  ];

  return (
    <div className="space-y-4">
      {allRecs.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-green-800/50 p-8 text-center">
          <p className="text-green-400 text-lg">All systems performing optimally!</p>
          <p className="text-gray-500 text-sm mt-2">No recommendations at this time.</p>
        </div>
      ) : (
        allRecs.map((rec, i) => (
          <div key={i} className={`p-4 rounded-xl border ${
            rec.severity === 'critical' ? 'border-red-800 bg-red-900/20' :
            rec.severity === 'warning' ? 'border-yellow-800 bg-yellow-900/20' :
            'border-blue-800 bg-blue-900/20'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                rec.severity === 'critical' ? 'bg-red-600 text-white' :
                rec.severity === 'warning' ? 'bg-yellow-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {rec.severity}
              </span>
              <span className="text-xs text-gray-400">{rec.source}</span>
            </div>
            <p className="text-gray-200 text-sm">{rec.text}</p>
          </div>
        ))
      )}
    </div>
  );
}
