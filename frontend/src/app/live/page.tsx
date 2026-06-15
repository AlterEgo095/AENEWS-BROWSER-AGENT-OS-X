'use client';

import { useEffect, useState } from 'react';
import {
  Bot, Brain, Wrench, Eye, MessageSquare, ArrowRight, Zap, Clock,
  CheckCircle2, XCircle, Loader2, Radio, Activity, ChevronDown,
  ChevronRight, Sparkles, GitBranch, Shield, Cpu, Timer, Hash,
  AlertTriangle, Play, Pause, Square, Users, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveMonitor, type AgentSession, type AgentStep } from '@/hooks/use-live-monitor';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Step Type Icons & Colors ────────────────────────────────────
const stepTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  thinking: { icon: Brain, color: 'text-violet-400', bgColor: 'bg-violet-500/15', label: 'Thinking' },
  tool_call: { icon: Wrench, color: 'text-amber-400', bgColor: 'bg-amber-500/15', label: 'Tool Call' },
  tool_result: { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', label: 'Result' },
  action: { icon: Zap, color: 'text-cyan-400', bgColor: 'bg-cyan-500/15', label: 'Action' },
  output: { icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/15', label: 'Output' },
  error: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/15', label: 'Error' },
  waiting: { icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-500/15', label: 'Waiting' },
  collaborating: { icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-500/15', label: 'Collaborating' },
  decision: { icon: GitBranch, color: 'text-teal-400', bgColor: 'bg-teal-500/15', label: 'Decision' },
};

// ─── Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; dot: string; pulse: boolean }> = {
    idle: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400', pulse: false },
    thinking: { color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', dot: 'bg-violet-400', pulse: true },
    executing: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', pulse: true },
    waiting: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400', pulse: false },
    collaborating: { color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', dot: 'bg-pink-400', pulse: true },
    completed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', pulse: false },
    error: { color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400', pulse: false },
  };
  const c = config[status] || config.idle;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', c.color)}>
      <div className={cn('h-1.5 w-1.5 rounded-full', c.dot, c.pulse && 'animate-pulse')} />
      {status}
    </span>
  );
}

// ─── Step Timeline Item ──────────────────────────────────────────
function StepTimelineItem({ step, isLatest }: { step: AgentStep; isLatest: boolean }) {
  const config = stepTypeConfig[step.type] || stepTypeConfig.action;
  const Icon = config.icon;

  return (
    <div className={cn(
      'relative flex gap-3 pb-4',
      isLatest && 'pb-2'
    )}>
      {/* Connector line */}
      {!isLatest && (
        <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        'relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg',
        config.bgColor,
        step.status === 'running' && 'ring-2 ring-violet-400/30'
      )}>
        {step.status === 'running' ? (
          <Loader2 className={cn('h-4 w-4 animate-spin', config.color)} />
        ) : (
          <Icon className={cn('h-4 w-4', config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold text-foreground', config.color)}>
            {config.label}
          </span>
          {step.duration && (
            <span className="text-[10px] text-muted-foreground">
              <Timer className="inline h-3 w-3 mr-0.5" />{step.duration}ms
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(step.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-medium text-foreground">{step.title}</p>
        {step.detail && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{step.detail}</p>
        )}
        {step.metadata && typeof step.metadata['tool'] === 'string' && (
          <div className="mt-1 flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-amber-400" />
            <code className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {String(step.metadata['tool'])}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Card (Left Panel) ─────────────────────────────────────
function AgentCard({ session, isSelected, onClick }: { session: AgentSession; isSelected: boolean; onClick: () => void }) {
  const isActive = session.status !== 'idle' && session.status !== 'completed';
  const clusterEmojis: Record<string, string> = {
    browser: '🌐', computer: '💻', coding: '🔧', office: '📋',
    marketing: '📢', business: '💼', infrastructure: '🏗️',
    security: '🔒', 'meta-intelligence': '🧠', 'llm-intelligence': '🤖',
    'intelligent-orchestration': '🎛️', watchdog: '👁️',
    'self-evolution': '🧬', certification: '✅',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all duration-200',
        isSelected
          ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5'
          : 'border-border bg-card hover:border-primary/30',
        isActive && !isSelected && 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{clusterEmojis[session.cluster] || '🤖'}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{session.agentName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{session.cluster.replace(/-/g, ' ')}</p>
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Progress bar for active agents */}
      {isActive && session.progress > 0 && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                session.status === 'thinking' ? 'bg-violet-400' :
                session.status === 'executing' ? 'bg-amber-400' :
                session.status === 'collaborating' ? 'bg-pink-400' : 'bg-primary'
              )}
              style={{ width: `${session.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Current step */}
      {session.currentStep && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {session.status === 'thinking' ? (
            <Brain className="h-3 w-3 text-violet-400 animate-pulse" />
          ) : session.status === 'executing' ? (
            <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
          ) : (
            <Activity className="h-3 w-3 text-pink-400" />
          )}
          <p className="text-[10px] text-muted-foreground truncate">{session.currentStep}</p>
        </div>
      )}

      {/* Metrics */}
      {(session.tokensUsed || session.toolCalls || session.llmCalls) && (
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          {session.tokensUsed && <span><Hash className="inline h-3 w-3 mr-0.5" />{session.tokensUsed} tokens</span>}
          {session.llmCalls && <span><Brain className="inline h-3 w-3 mr-0.5" />{session.llmCalls} LLM</span>}
          {session.toolCalls && <span><Wrench className="inline h-3 w-3 mr-0.5" />{session.toolCalls} tools</span>}
        </div>
      )}
    </button>
  );
}

// ─── Activity Feed Item ──────────────────────────────────────────
function FeedItem({ step }: { step: AgentStep }) {
  const config = stepTypeConfig[step.type] || stepTypeConfig.action;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0">
      <div className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', config.bgColor)}>
        <Icon className={cn('h-3 w-3', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground truncate">{step.agentName}</span>
          <span className={cn('text-[9px] font-medium', config.color)}>{config.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{step.title}</p>
      </div>
      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
        {new Date(step.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN LIVE MONITOR PAGE
// ═══════════════════════════════════════════════════════════════════
export default function LiveMonitorPage() {
  const {
    connected, sessions, recentSteps, selectedAgentId,
    totalTokens, totalLlmCalls, totalToolCalls, activeCount,
    setSelectedAgent, connect, disconnect,
  } = useLiveMonitor();

  const [showFeed, setShowFeed] = useState(true);
  const sessionsArray = Array.from(sessions.values());
  const selectedSession = selectedAgentId ? sessions.get(selectedAgentId) : null;
  const activeSessions = sessionsArray.filter((s) => s.status !== 'idle');
  const idleSessions = sessionsArray.filter((s) => s.status === 'idle');

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Activity chart data
  const activityData = Array.from({ length: 30 }, (_, i) => ({
    time: `${30 - i}s`,
    steps: recentSteps.filter(
      (s) => s.timestamp > Date.now() - (30 - i) * 1000 && s.timestamp <= Date.now() - (29 - i) * 1000
    ).length,
  })).reverse();

  return (
    <div className="space-y-4 animate-slide-in h-[calc(100vh-8rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-bold text-red-400">DISCONNECTED</span>
              </div>
            )}
          </div>
          <h2 className="text-lg font-bold text-foreground">Agent Live Monitor</h2>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-bold text-foreground">{activeCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-muted-foreground">Tokens:</span>
            <span className="font-bold text-foreground">{totalTokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-muted-foreground">LLM Calls:</span>
            <span className="font-bold text-foreground">{totalLlmCalls}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-muted-foreground">Tools:</span>
            <span className="font-bold text-foreground">{totalToolCalls}</span>
          </div>
        </div>
      </div>

      {/* Main Content — 3 columns */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left — Agent List */}
        <div className="col-span-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Agents ({sessionsArray.length})
            </h3>
            <span className="text-[10px] text-emerald-400">{activeCount} active</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {/* Active agents first */}
            {activeSessions.map((session) => (
              <AgentCard
                key={session.agentId}
                session={session}
                isSelected={selectedAgentId === session.agentId}
                onClick={() => setSelectedAgent(session.agentId)}
              />
            ))}
            {/* Idle agents */}
            {idleSessions.length > 0 && (
              <>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 pt-2">
                  Idle ({idleSessions.length})
                </p>
                {idleSessions.map((session) => (
                  <AgentCard
                    key={session.agentId}
                    session={session}
                    isSelected={selectedAgentId === session.agentId}
                    onClick={() => setSelectedAgent(session.agentId)}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Center — Agent Detail / Step Timeline */}
        <div className="col-span-6 flex flex-col min-h-0">
          {selectedSession ? (
            <>
              {/* Agent Header */}
              <div className="rounded-xl border border-border bg-card p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      selectedSession.status === 'thinking' ? 'bg-violet-500/15' :
                      selectedSession.status === 'executing' ? 'bg-amber-500/15' :
                      selectedSession.status === 'collaborating' ? 'bg-pink-500/15' :
                      'bg-primary/15'
                    )}>
                      {selectedSession.status === 'thinking' ? (
                        <Brain className="h-5 w-5 text-violet-400 animate-pulse" />
                      ) : selectedSession.status === 'executing' ? (
                        <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                      ) : (
                        <Bot className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{selectedSession.agentName}</h3>
                      <p className="text-[10px] text-muted-foreground capitalize">{selectedSession.cluster.replace(/-/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedSession.status} />
                    {selectedSession.missionName && (
                      <span className="text-[10px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                        🚀 {selectedSession.missionName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {selectedSession.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground font-bold">{selectedSession.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          selectedSession.status === 'thinking' ? 'bg-violet-400' :
                          selectedSession.status === 'executing' ? 'bg-amber-400' :
                          selectedSession.status === 'collaborating' ? 'bg-pink-400' : 'bg-primary'
                        )}
                        style={{ width: `${selectedSession.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metrics Row */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Tokens</p>
                    <p className="text-xs font-bold text-violet-400">{selectedSession.tokensUsed || 0}</p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">LLM Calls</p>
                    <p className="text-xs font-bold text-amber-400">{selectedSession.llmCalls || 0}</p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Tool Calls</p>
                    <p className="text-xs font-bold text-cyan-400">{selectedSession.toolCalls || 0}</p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Steps</p>
                    <p className="text-xs font-bold text-foreground">{selectedSession.steps.length}</p>
                  </div>
                </div>
              </div>

              {/* Step Timeline */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Execution Timeline
                </h4>
                {selectedSession.steps.length > 0 ? (
                  <div>
                    {selectedSession.steps.slice(-20).map((step, i, arr) => (
                      <StepTimelineItem
                        key={step.id}
                        step={step}
                        isLatest={i === arr.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Eye className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">Waiting for agent activity...</p>
                    <p className="text-[10px] mt-1">Steps will appear here as the agent works</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No agent selected — overview */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Activity Chart */}
              <div className="rounded-xl border border-border bg-card p-4 mb-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Platform Activity (last 30s)
                </h4>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 8 }} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} tickLine={false} />
                    <Area type="monotone" dataKey="steps" stroke="#3b82f6" fill="url(#activityGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* All active agents quick view */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  All Active Agents
                </h4>
                {activeSessions.length > 0 ? (
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.agentId}
                        onClick={() => setSelectedAgent(session.agentId)}
                        className="cursor-pointer rounded-lg border border-border bg-background/50 p-3 transition-all hover:border-primary/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {session.status === 'thinking' ? (
                              <Brain className="h-4 w-4 text-violet-400 animate-pulse" />
                            ) : session.status === 'executing' ? (
                              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                            ) : (
                              <Bot className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs font-semibold text-foreground">{session.agentName}</span>
                          </div>
                          <StatusBadge status={session.status} />
                        </div>
                        {session.currentStep && (
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{session.currentStep}</span>
                          </div>
                        )}
                        {/* Last 3 steps mini-timeline */}
                        {session.steps.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {session.steps.slice(-5).map((step) => {
                              const cfg = stepTypeConfig[step.type] || stepTypeConfig.action;
                              return (
                                <span key={step.id} className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px]', cfg.bgColor, cfg.color)}>
                                  <cfg.icon className="h-2.5 w-2.5" />
                                  {cfg.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Radio className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">No active agents</p>
                    <p className="text-[10px] mt-1">Agents will appear when they start working</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Live Feed */}
        <div className="col-span-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Live Feed
            </h3>
            <button
              onClick={() => setShowFeed(!showFeed)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFeed ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFeed && (
            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3">
              {recentSteps.length > 0 ? (
                recentSteps.slice(0, 50).map((step) => (
                  <FeedItem key={step.id} step={step} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No activity yet</p>
                </div>
              )}
            </div>
          )}

          {/* Step type legend */}
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <h4 className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-2">Step Types</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(stepTypeConfig).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={cn('flex h-5 w-5 items-center justify-center rounded', cfg.bgColor)}>
                    <cfg.icon className={cn('h-3 w-3', cfg.color)} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <h4 className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-2">Session Stats</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Total Sessions</span>
                <span className="font-bold text-foreground">{sessionsArray.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Active Now</span>
                <span className="font-bold text-emerald-400">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Total Steps</span>
                <span className="font-bold text-foreground">{recentSteps.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Avg Steps/Agent</span>
                <span className="font-bold text-foreground">
                  {sessionsArray.length > 0 ? Math.round(recentSteps.length / sessionsArray.length) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
