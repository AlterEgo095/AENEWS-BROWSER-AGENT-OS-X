'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BrainCircuit,
  Network,
  BookOpen,
  TrendingUp,
  RotateCcw,
  MessageSquare,
  Zap,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Play,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react';
import type {
  GraphStatistics,
  LearningStatistics,
  LearningInsight,
  PatternMiningStatistics,
  DiscoveredPattern,
  CorrelationFinding,
  AdaptiveStatistics,
  AdaptiveConfig,
  ExperienceStatistics,
  FeedbackStatistics,
  FeedbackSummary,
  ActionItem,
} from '@/lib/types';

// ─── Mock Data ───────────────────────────────────────────────────

const mockGraphStats: GraphStatistics = {
  nodeCounts: { Agent: 112, Mission: 47, Pattern: 23, Strategy: 8, Outcome: 156, Learning: 34 },
  relationshipCounts: { EXECUTED: 312, PRODUCED: 156, MATCHED_PATTERN: 67, SUGGESTS: 42, COLLABORATED_WITH: 89 },
  neo4jAvailable: true,
  topAgents: [
    { agentId: 'browser-navigator', name: 'Navigator', cluster: 'browser' as any, expertiseScore: 0.92, missionCount: 34, successRate: 0.94, avgDurationMs: 4500, topCapabilities: ['navigation', 'scraping', 'screenshot'] },
    { agentId: 'coding-architect', name: 'Architect', cluster: 'coding' as any, expertiseScore: 0.88, missionCount: 28, successRate: 0.89, avgDurationMs: 12000, topCapabilities: ['code-generation', 'architecture', 'documentation'] },
    { agentId: 'security-auditor', name: 'Auditor', cluster: 'security' as any, expertiseScore: 0.85, missionCount: 21, successRate: 0.86, avgDurationMs: 8000, topCapabilities: ['vulnerability-scanning', 'audit', 'compliance'] },
  ],
  topPatterns: [
    { id: 'p1', name: 'Fast Navigation Success', type: 'success', description: 'Quick browser navigation with screenshot verification', frequency: 18, confidence: 0.92, lastSeen: Date.now() },
    { id: 'p2', name: 'Timeout Cascade', type: 'anti-pattern', description: 'Long execution leading to timeout cascade', frequency: 7, confidence: 0.78, lastSeen: Date.now() - 3600000 },
  ],
};

const mockLearningStats: LearningStatistics = {
  totalProfiles: 45,
  totalLearnings: 1247,
  totalInsights: 34,
  avgReward: 0.67,
  topStrategies: [
    { strategy: 'pipeline', avgQ: 0.82 },
    { strategy: 'parallel', avgQ: 0.71 },
    { strategy: 'consensus', avgQ: 0.58 },
    { strategy: 'delegation', avgQ: 0.45 },
    { strategy: 'swarm', avgQ: 0.32 },
  ],
  clusterBreakdown: { browser: 17, coding: 8, security: 6, office: 6, business: 8 },
};

const mockPatternStats: PatternMiningStatistics = {
  totalPatterns: 23,
  totalExecutions: 47,
  categoryBreakdown: { success_sequence: 8, failure_sequence: 4, optimization: 5, anti_pattern: 3, collaboration_effective: 3 },
  avgConfidence: 0.68,
  topPatterns: [
    { id: 'pat1', name: 'Fast Navigator Sequence', category: 'success_sequence', description: 'navigate → screenshot → verify sequence has 94% success rate', frequency: 18, confidence: 0.92, impact: 'positive', impactScore: 0.85, suggestedActions: ['Use for all browser missions'] },
    { id: 'pat2', name: 'Timeout Anti-Pattern', category: 'anti_pattern', description: 'Long execution without checkpointing leads to timeout', frequency: 7, confidence: 0.78, impact: 'negative', impactScore: -0.65, suggestedActions: ['Add intermediate checkpoints', 'Decompose complex tasks'] },
  ],
};

const mockAdaptiveStats: AdaptiveStatistics = {
  configVersion: 12,
  totalAdaptations: 47,
  appliedCount: 38,
  improvedCount: 24,
  degradedCount: 3,
  pinnedParameters: ['timeouts.execute'],
  lastAdaptationAt: Date.now() - 300000,
};

const mockExperienceStats: ExperienceStatistics = {
  totalExperiences: 89,
  successCount: 67,
  failureCount: 22,
  totalInsights: 45,
  avgDurationMs: 42000,
  clusterBreakdown: { browser: 23, coding: 18, security: 12, office: 14, business: 12, infrastructure: 10 },
};

const mockFeedbackStats: FeedbackStatistics = {
  totalEntries: 234,
  totalAggregated: 67,
  totalActions: 12,
  avgScore: 0.74,
  sourceBreakdown: { user: 89, system: 78, outcome_verification: 34, peer: 18, agent_self: 15 },
  recentTrend: 'improving',
};

const mockFeedbackSummary: FeedbackSummary = {
  totalFeedback: 234,
  avgScore: 0.74,
  sourceDistribution: { user: 89, system: 78, outcome_verification: 34, peer: 18, agent_self: 15 },
  topIssues: [
    { description: 'Slow response on complex missions', count: 12 },
    { description: 'Timeout on multi-step browser automation', count: 8 },
  ],
  topPraise: [
    { description: 'Excellent code generation quality', count: 15 },
    { description: 'Fast browser navigation', count: 11 },
  ],
  trendDirection: 'improving',
};

// ─── Sub-Components ───────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-primary' }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string;
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

function TrendBadge({ trend }: { trend: 'improving' | 'degrading' | 'stable' | 'up' | 'down' | 'flat' }) {
  const isUp = trend === 'improving' || trend === 'up';
  const isDown = trend === 'degrading' || trend === 'down';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      isUp && 'bg-emerald-500/15 text-emerald-400',
      isDown && 'bg-red-500/15 text-red-400',
      !isUp && !isDown && 'bg-yellow-500/15 text-yellow-400',
    )}>
      {isUp && <ArrowUpRight className="h-3 w-3" />}
      {isDown && <ArrowDownRight className="h-3 w-3" />}
      {!isUp && !isDown && <Minus className="h-3 w-3" />}
      {trend}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: 'positive' | 'negative' | 'neutral' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
      impact === 'positive' && 'bg-emerald-500/15 text-emerald-400',
      impact === 'negative' && 'bg-red-500/15 text-red-400',
      impact === 'neutral' && 'bg-yellow-500/15 text-yellow-400',
    )}>
      {impact === 'positive' && <CheckCircle2 className="h-3 w-3" />}
      {impact === 'negative' && <XCircle className="h-3 w-3" />}
      {impact === 'neutral' && <Minus className="h-3 w-3" />}
      {impact}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400',
    high: 'bg-orange-500/15 text-orange-400',
    medium: 'bg-yellow-500/15 text-yellow-400',
    low: 'bg-blue-500/15 text-blue-400',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', colors[priority] || colors.low)}>
      {priority}
    </span>
  );
}

// ─── Tab Configuration ───────────────────────────────────────────

type TabKey = 'overview' | 'knowledge' | 'learning' | 'patterns' | 'adaptive' | 'feedback';

const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'knowledge', label: 'Knowledge Graph', icon: Network },
  { key: 'learning', label: 'Learning', icon: BookOpen },
  { key: 'patterns', label: 'Patterns', icon: Lightbulb },
  { key: 'adaptive', label: 'Adaptive', icon: Zap },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
];

// ─── Main Page ───────────────────────────────────────────────────

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [graphStats, setGraphStats] = useState<GraphStatistics>(mockGraphStats);
  const [learningStats, setLearningStats] = useState<LearningStatistics>(mockLearningStats);
  const [patternStats, setPatternStats] = useState<PatternMiningStatistics>(mockPatternStats);
  const [correlations, setCorrelations] = useState<CorrelationFinding[]>([]);
  const [adaptiveStats, setAdaptiveStats] = useState<AdaptiveStatistics>(mockAdaptiveStats);
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveConfig | null>(null);
  const [experienceStats, setExperienceStats] = useState<ExperienceStatistics>(mockExperienceStats);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStatistics>(mockFeedbackStats);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>(mockFeedbackSummary);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const results = await Promise.allSettled([
        api.intelligence.getGraphStats(),
        api.intelligence.getLearningStats(),
        api.intelligence.getPatternStats(),
        api.intelligence.getCorrelations(),
        api.intelligence.getAdaptiveStats(),
        api.intelligence.getAdaptiveConfig(),
        api.intelligence.getExperienceStats(),
        api.intelligence.getFeedbackStats(),
        api.intelligence.getFeedbackSummary(),
        api.intelligence.getFeedbackActions(),
      ]);

      if (results[0].status === 'fulfilled') setGraphStats(results[0].value.data ?? mockGraphStats);
      if (results[1].status === 'fulfilled') setLearningStats(results[1].value.data ?? mockLearningStats);
      if (results[2].status === 'fulfilled') setPatternStats(results[2].value.data ?? mockPatternStats);
      if (results[3].status === 'fulfilled') setCorrelations(results[3].value.data ?? []);
      if (results[4].status === 'fulfilled') setAdaptiveStats(results[4].value.data ?? mockAdaptiveStats);
      if (results[5].status === 'fulfilled') setAdaptiveConfig(results[5].value.data ?? null);
      if (results[6].status === 'fulfilled') setExperienceStats(results[6].value.data ?? mockExperienceStats);
      if (results[7].status === 'fulfilled') setFeedbackStats(results[7].value.data ?? mockFeedbackStats);
      if (results[8].status === 'fulfilled') setFeedbackSummary(results[8].value.data ?? mockFeedbackSummary);
      if (results[9].status === 'fulfilled') setActionItems(results[9].value.data ?? []);

      setLoading(false);
    }
    fetchData();
  }, []);

  // ─── Render Tabs ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Intelligence Dashboard</h1>
            <p className="text-sm text-muted-foreground">Adaptive Intelligence & Knowledge System — Phase 9</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendBadge trend={feedbackStats.recentTrend} />
          <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'knowledge' && renderKnowledge()}
          {activeTab === 'learning' && renderLearning()}
          {activeTab === 'patterns' && renderPatterns()}
          {activeTab === 'adaptive' && renderAdaptive()}
          {activeTab === 'feedback' && renderFeedback()}
        </>
      )}
    </div>
  );

  // ─── Overview Tab ───────────────────────────────────────────────

  function renderOverview() {
    const totalNodes = Object.values(graphStats.nodeCounts).reduce((a, b) => a + b, 0);
    const totalRels = Object.values(graphStats.relationshipCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Graph Nodes" value={totalNodes} sub={`${Object.keys(graphStats.nodeCounts).length} types`} icon={Network} color="text-blue-400" />
          <StatCard label="Graph Edges" value={totalRels} sub={`${Object.keys(graphStats.relationshipCounts).length} types`} icon={Network} color="text-purple-400" />
          <StatCard label="Learnings" value={learningStats.totalLearnings} sub={`${learningStats.totalProfiles} agents`} icon={BookOpen} color="text-emerald-400" />
          <StatCard label="Patterns" value={patternStats.totalPatterns} sub={`${patternStats.totalExecutions} executions`} icon={Lightbulb} color="text-amber-400" />
          <StatCard label="Adaptations" value={adaptiveStats.totalAdaptations} sub={`${adaptiveStats.improvedCount} improved`} icon={Zap} color="text-cyan-400" />
          <StatCard label="Feedback" value={feedbackStats.totalEntries} sub={`avg ${(feedbackStats.avgScore * 100).toFixed(0)}%`} icon={MessageSquare} color="text-pink-400" />
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expertise Rankings */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" /> Top Agent Expertise
            </h3>
            <div className="space-y-3">
              {graphStats.topAgents.map((agent, i) => (
                <div key={agent.agentId} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">{agent.cluster}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Score: {(agent.expertiseScore * 100).toFixed(0)}%</span>
                      <span>Missions: {agent.missionCount}</span>
                      <span>Success: {(agent.successRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-8 w-8">
                    <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${agent.expertiseScore * 100} ${100 - agent.expertiseScore * 100}`} className="text-primary" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Strategy Scores */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Strategy Q-Values
            </h3>
            <div className="space-y-3">
              {learningStats.topStrategies.map((s) => {
                const width = Math.max(10, ((s.avgQ + 1) / 2) * 100);
                const color = s.avgQ > 0.5 ? 'bg-emerald-500' : s.avgQ > 0 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={s.strategy} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{s.strategy}</span>
                      <span className="text-muted-foreground">{s.avgQ.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg Reward</span>
                <span className="font-semibold text-foreground">{(learningStats.avgReward * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Total Insights</span>
                <span className="font-semibold text-foreground">{learningStats.totalInsights}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Experience & Feedback Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Experience Replay */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <RotateCcw className="h-4 w-4 text-primary" /> Experience Replay
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{experienceStats.successCount}</p>
                <p className="text-[10px] text-muted-foreground">Successes</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-red-400">{experienceStats.failureCount}</p>
                <p className="text-[10px] text-muted-foreground">Failures</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-cyan-400">{experienceStats.totalInsights}</p>
                <p className="text-[10px] text-muted-foreground">Insights</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs">
              <span className="text-muted-foreground">Avg Duration</span>
              <span className="font-semibold text-foreground">{(experienceStats.avgDurationMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Feedback Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" /> Feedback Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{feedbackSummary.totalFeedback}</p>
                <p className="text-[10px] text-muted-foreground">Total Entries</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{(feedbackSummary.avgScore * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">Avg Score</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Trend</span>
                <TrendBadge trend={feedbackSummary.trendDirection} />
              </div>
              {feedbackSummary.topIssues.length > 0 && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-2">
                  <p className="text-[10px] font-medium text-red-400">Top Issue</p>
                  <p className="text-xs text-foreground">{feedbackSummary.topIssues[0].description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Knowledge Graph Tab ────────────────────────────────────────

  function renderKnowledge() {
    const totalNodes = Object.values(graphStats.nodeCounts).reduce((a, b) => a + b, 0);
    const totalRels = Object.values(graphStats.relationshipCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Nodes" value={totalNodes} icon={Network} color="text-blue-400" />
          <StatCard label="Total Edges" value={totalRels} icon={Network} color="text-purple-400" />
          <StatCard label="Neo4j Status" value={graphStats.neo4jAvailable ? 'Connected' : 'Cache'} icon={CheckCircle2} color={graphStats.neo4jAvailable ? 'text-emerald-400' : 'text-yellow-400'} />
          <StatCard label="Node Types" value={Object.keys(graphStats.nodeCounts).length} icon={BarChart3} color="text-cyan-400" />
        </div>

        {/* Node Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Node Distribution</h3>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
            {Object.entries(graphStats.nodeCounts).map(([type, count]) => (
              <div key={type} className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground">{type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Relationship Distribution</h3>
          <div className="space-y-2">
            {Object.entries(graphStats.relationshipCounts).map(([type, count]) => {
              const maxCount = Math.max(...Object.values(graphStats.relationshipCounts));
              const width = Math.max(10, (count / maxCount) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted-foreground truncate">{type}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Expertise */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Expertise Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left">Agent</th>
                  <th className="pb-2 text-left">Cluster</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right">Missions</th>
                  <th className="pb-2 text-right">Success</th>
                  <th className="pb-2 text-right">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {graphStats.topAgents.map((a) => (
                  <tr key={a.agentId} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{a.name}</td>
                    <td className="py-2 text-muted-foreground">{a.cluster}</td>
                    <td className="py-2 text-right font-semibold text-primary">{(a.expertiseScore * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right text-foreground">{a.missionCount}</td>
                    <td className="py-2 text-right text-emerald-400">{(a.successRate * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right text-muted-foreground">{(a.avgDurationMs / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Learning Tab ───────────────────────────────────────────────

  function renderLearning() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Agent Profiles" value={learningStats.totalProfiles} icon={BookOpen} color="text-emerald-400" />
          <StatCard label="Total Learnings" value={learningStats.totalLearnings} icon={Sparkles} color="text-amber-400" />
          <StatCard label="Total Insights" value={learningStats.totalInsights} icon={Lightbulb} color="text-cyan-400" />
          <StatCard label="Avg Reward" value={`${(learningStats.avgReward * 100).toFixed(1)}%`} icon={TrendingUp} color="text-pink-400" />
        </div>

        {/* Strategy Q-Values */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Strategy Q-Values (Reinforcement Learning)</h3>
          <div className="space-y-4">
            {learningStats.topStrategies.map((s) => {
              const normalized = ((s.avgQ + 1) / 2) * 100;
              const color = s.avgQ > 0.5 ? 'bg-emerald-500' : s.avgQ > 0 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={s.strategy}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{s.strategy}</span>
                    <span className={cn('font-semibold', s.avgQ > 0.5 ? 'text-emerald-400' : s.avgQ > 0 ? 'text-yellow-400' : 'text-red-400')}>
                      Q = {s.avgQ.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(5, normalized)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cluster Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Learning by Cluster</h3>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            {Object.entries(learningStats.clusterBreakdown).map(([cluster, count]) => (
              <div key={cluster} className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cluster}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Parameters */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Learning Parameters</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { name: 'Learning Rate (α)', value: '0.10' },
              { name: 'Discount Factor (γ)', value: '0.95' },
              { name: 'Exploration (ε)', value: '0.15' },
              { name: 'Confidence Decay', value: '0.995' },
            ].map((param) => (
              <div key={param.name} className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-muted-foreground">{param.name}</p>
                <p className="text-lg font-bold text-foreground">{param.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Patterns Tab ───────────────────────────────────────────────

  function renderPatterns() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Discovered Patterns" value={patternStats.totalPatterns} icon={Lightbulb} color="text-amber-400" />
          <StatCard label="Total Executions" value={patternStats.totalExecutions} icon={BarChart3} color="text-blue-400" />
          <StatCard label="Avg Confidence" value={`${(patternStats.avgConfidence * 100).toFixed(0)}%`} icon={Target} color="text-emerald-400" />
          <StatCard label="Categories" value={Object.keys(patternStats.categoryBreakdown).length} icon={Network} color="text-purple-400" />
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Pattern Categories</h3>
          <div className="space-y-2">
            {Object.entries(patternStats.categoryBreakdown).map(([cat, count]) => {
              const maxCount = Math.max(...Object.values(patternStats.categoryBreakdown));
              const width = Math.max(10, (count / maxCount) * 100);
              const colors: Record<string, string> = {
                success_sequence: 'bg-emerald-500',
                failure_sequence: 'bg-red-500',
                optimization: 'bg-blue-500',
                anti_pattern: 'bg-orange-500',
                collaboration_effective: 'bg-purple-500',
              };
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-muted-foreground truncate">{cat.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-all', colors[cat] || 'bg-primary')} style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Patterns */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Top Patterns</h3>
          <div className="space-y-3">
            {patternStats.topPatterns.map((p) => (
              <div key={p.id} className="rounded-lg bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImpactBadge impact={p.impact} />
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Confidence: {(p.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Frequency: {p.frequency}</span>
                  {p.suggestedActions.length > 0 && (
                    <span className="text-primary cursor-pointer flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" /> {p.suggestedActions[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Correlations */}
        {correlations.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Metric Correlations</h3>
            <div className="space-y-2">
              {correlations.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                  <span className="text-xs text-muted-foreground">{c.metric1} ↔ {c.metric2}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', c.correlation > 0 ? 'text-emerald-400' : c.correlation < 0 ? 'text-red-400' : 'text-foreground')}>
                      {c.correlation.toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">significance: {(c.significance * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Adaptive Tab ───────────────────────────────────────────────

  function renderAdaptive() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Config Version" value={`v${adaptiveStats.configVersion}`} icon={Zap} color="text-cyan-400" />
          <StatCard label="Total Adaptations" value={adaptiveStats.totalAdaptations} icon={TrendingUp} color="text-emerald-400" />
          <StatCard label="Improvements" value={adaptiveStats.improvedCount} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Degradations" value={adaptiveStats.degradedCount} icon={AlertTriangle} color="text-red-400" />
        </div>

        {/* Adaptation Effectiveness */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Adaptation Effectiveness</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{adaptiveStats.improvedCount}</p>
              <p className="text-xs text-muted-foreground">Improved</p>
              <p className="text-[10px] text-muted-foreground">
                {adaptiveStats.appliedCount > 0 ? `${((adaptiveStats.improvedCount / adaptiveStats.appliedCount) * 100).toFixed(0)}%` : '0%'} of applied
              </p>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{adaptiveStats.appliedCount - adaptiveStats.improvedCount - adaptiveStats.degradedCount}</p>
              <p className="text-xs text-muted-foreground">Unchanged</p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{adaptiveStats.degradedCount}</p>
              <p className="text-xs text-muted-foreground">Degraded</p>
            </div>
          </div>
        </div>

        {/* Strategy Preferences */}
        {adaptiveConfig && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Strategy Preferences (Adaptive)</h3>
            <div className="space-y-3">
              {Object.entries(adaptiveConfig.strategyPreferences).map(([strategy, weight]) => {
                const width = Math.max(10, weight * 100);
                const isPinned = adaptiveConfig.pinned.includes(`strategyPreferences.${strategy}`);
                return (
                  <div key={strategy}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{strategy} {isPinned && <span className="text-[10px] text-yellow-400">PINNED</span>}</span>
                      <span className="text-muted-foreground">{(weight * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pinned Parameters */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Pinned Parameters</h3>
          {adaptiveStats.pinnedParameters.length > 0 ? (
            <div className="space-y-2">
              {adaptiveStats.pinnedParameters.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                  <span className="text-sm text-foreground">{p}</span>
                  <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">PINNED</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No parameters pinned — all adaptive</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90">
            <Play className="h-4 w-4" /> Run Adaptation Cycle
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
            <AlertTriangle className="h-4 w-4" /> Emergency Reset
          </button>
        </div>
      </div>
    );
  }

  // ─── Feedback Tab ───────────────────────────────────────────────

  function renderFeedback() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Feedback" value={feedbackStats.totalEntries} icon={MessageSquare} color="text-pink-400" />
          <StatCard label="Avg Score" value={`${(feedbackStats.avgScore * 100).toFixed(0)}%`} icon={BarChart3} color="text-emerald-400" />
          <StatCard label="Action Items" value={feedbackStats.totalActions} icon={AlertTriangle} color="text-amber-400" />
          <StatCard label="Trend" value={feedbackStats.recentTrend} icon={TrendingUp} color="text-cyan-400" />
        </div>

        {/* Source Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Feedback Sources</h3>
          <div className="space-y-3">
            {Object.entries(feedbackStats.sourceBreakdown).map(([source, count]) => {
              const maxCount = Math.max(...Object.values(feedbackStats.sourceBreakdown));
              const width = Math.max(10, (count / maxCount) * 100);
              const colors: Record<string, string> = {
                user: 'bg-pink-500',
                system: 'bg-blue-500',
                outcome_verification: 'bg-emerald-500',
                peer: 'bg-purple-500',
                agent_self: 'bg-amber-500',
              };
              const weights: Record<string, string> = {
                user: '30%',
                system: '20%',
                outcome_verification: '25%',
                peer: '15%',
                agent_self: '10%',
              };
              return (
                <div key={source}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{source.replace(/_/g, ' ')} <span className="text-[10px] text-muted-foreground">weight: {weights[source] || '?'}</span></span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-all', colors[source] || 'bg-primary')} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Issues & Praise */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <h3 className="mb-3 text-sm font-semibold text-red-400">Top Issues</h3>
            {feedbackSummary.topIssues.length > 0 ? (
              <div className="space-y-2">
                {feedbackSummary.topIssues.map((issue, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                    <span className="text-xs text-foreground">{issue.description}</span>
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">{issue.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No issues reported</p>
            )}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="mb-3 text-sm font-semibold text-emerald-400">Top Praise</h3>
            {feedbackSummary.topPraise.length > 0 ? (
              <div className="space-y-2">
                {feedbackSummary.topPraise.map((praise, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                    <span className="text-xs text-foreground">{praise.description}</span>
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">{praise.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No praise reported</p>
            )}
          </div>
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Action Items from Feedback</h3>
            <div className="space-y-2">
              {actionItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                  <PriorityBadge priority={item.priority} />
                  <span className="flex-1 text-xs text-foreground">{item.description}</span>
                  <span className="text-[10px] text-muted-foreground">Impact: {(item.estimatedImpact * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
