'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Rocket,
  Play,
  Pause,
  Square,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { mockMissions } from '@/lib/mock-data';
import {
  cn,
  missionStateColors,
  missionStateDotColors,
  missionPriorityColors,
  formatRelativeTime,
} from '@/lib/utils';
import type { Mission, MissionState, MissionPriority } from '@/lib/types';
import { MissionState as MS, MissionPriority as MP } from '@/lib/types';
import { useWebSocket } from '@/hooks/use-websocket';

// State flow visualization
const stateFlow: MissionState[] = [
  MS.DRAFT,
  MS.PLANNED,
  MS.RESEARCH,
  MS.BUILDING,
  MS.TESTING,
  MS.AUDITING,
  MS.CERTIFYING,
  MS.DELIVERING,
  MS.COMPLETED,
];

function getStateIndex(state: MissionState): number {
  return stateFlow.indexOf(state);
}

// Mission State Badge
function StateBadge({ state }: { state: MissionState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase',
        missionStateColors[state]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', missionStateDotColors[state])} />
      {state}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: MissionPriority }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
        missionPriorityColors[priority]
      )}
    >
      {priority}
    </span>
  );
}

// Progress Bar
function ProgressBar({ progress, state }: { progress: number; state: MissionState }) {
  const color =
    state === MS.COMPLETED
      ? 'bg-emerald-500'
      : state === MS.FAILED
        ? 'bg-red-500'
        : state === MS.CANCELLED
          ? 'bg-gray-500'
          : 'bg-primary';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Progress</span>
        <span className="text-xs font-medium text-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// State Timeline
function StateTimeline({ currentState }: { currentState: MissionState }) {
  const currentIndex = getStateIndex(currentState);
  const isTerminal = [MS.COMPLETED, MS.FAILED, MS.CANCELLED, MS.ARCHIVED].includes(currentState);

  return (
    <div className="space-y-1">
      {stateFlow.map((state, index) => {
        const isCompleted = isTerminal
          ? currentState === MS.COMPLETED && index <= currentIndex
          : index < currentIndex;
        const isCurrent = index === currentIndex && !isTerminal;
        const isFuture = index > currentIndex || (isTerminal && currentState !== MS.COMPLETED);

        return (
          <div key={state} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px]',
                isCompleted
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                  : isCurrent
                    ? 'border-primary/50 bg-primary/20 text-primary'
                    : 'border-border bg-white/5 text-muted-foreground/50'
              )}
            >
              {isCompleted ? '✓' : isCurrent ? index + 1 : index + 1}
            </div>
            <span
              className={cn(
                'text-xs',
                isCompleted
                  ? 'text-emerald-400'
                  : isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground/50'
              )}
            >
              {state}
            </span>
            {isCurrent && (
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stateFilter, setStateFilter] = useState<MissionState | ''>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { connected, subscribe, unsubscribe } = useWebSocket();

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<MissionPriority>(MP.MEDIUM);
  const [formCapabilities, setFormCapabilities] = useState('');
  const [formDeadline, setFormDeadline] = useState('');

  useEffect(() => {
    fetchMissions();
  }, []);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const handleMissionUpdate = () => {
      fetchMissions();
      if (selectedMission) {
        // Refresh selected mission details
        api.getMission(selectedMission.id).catch(() => {});
      }
    };

    subscribe('mission:updated', handleMissionUpdate);
    subscribe('mission:state-changed', handleMissionUpdate);
    subscribe('mission:progress', handleMissionUpdate);

    return () => {
      unsubscribe('mission:updated', handleMissionUpdate);
      unsubscribe('mission:state-changed', handleMissionUpdate);
      unsubscribe('mission:progress', handleMissionUpdate);
    };
  }, [subscribe, unsubscribe, selectedMission]);

  async function fetchMissions() {
    setLoading(true);
    try {
      const params: { state?: string } = {};
      if (stateFilter) params.state = stateFilter;
      const result = await api.getMissions(params);
      setMissions(result.data || []);
    } catch {
      setMissions(mockMissions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter]);

  async function handleCreateMission() {
    if (!formName.trim()) return;
    try {
      const data: {
        name: string;
        description: string;
        priority: MissionPriority;
        requiredCapabilities?: string[];
        constraints?: string[];
        deadline?: string;
      } = {
        name: formName,
        description: formDescription,
        priority: formPriority,
      };
      if (formCapabilities.trim()) {
        data.requiredCapabilities = formCapabilities.split(',').map((c) => c.trim()).filter(Boolean);
      }
      if (formDeadline) {
        data.deadline = formDeadline;
      }
      await api.createMission(data);
      setShowCreateModal(false);
      resetForm();
      fetchMissions();
    } catch {
      // Silently handle
    }
  }

  async function handleMissionAction(
    missionId: string,
    action: 'start' | 'pause' | 'resume' | 'cancel'
  ) {
    setActionLoading(missionId);
    try {
      switch (action) {
        case 'start':
          await api.startMission(missionId);
          break;
        case 'pause':
          await api.pauseMission(missionId);
          break;
        case 'resume':
          await api.resumeMission(missionId);
          break;
        case 'cancel':
          await api.cancelMission(missionId);
          break;
      }
      fetchMissions();
      if (selectedMission?.id === missionId) {
        try {
          const updated = await api.getMission(missionId);
          setSelectedMission(updated);
        } catch {
          // Keep current state
        }
      }
    } catch {
      // Silently handle
    } finally {
      setActionLoading(null);
    }
  }

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormPriority(MP.MEDIUM);
    setFormCapabilities('');
    setFormDeadline('');
  }

  function getAvailableActions(mission: Mission) {
    const actions: { action: 'start' | 'pause' | 'resume' | 'cancel'; label: string; icon: React.ElementType; variant: string }[] = [];

    switch (mission.state) {
      case MS.DRAFT:
      case MS.PLANNED:
        actions.push({ action: 'start', label: 'Start', icon: Play, variant: 'primary' });
        actions.push({ action: 'cancel', label: 'Cancel', icon: Square, variant: 'destructive' });
        break;
      case MS.RESEARCH:
      case MS.BUILDING:
      case MS.TESTING:
      case MS.AUDITING:
      case MS.CERTIFYING:
      case MS.DELIVERING:
        actions.push({ action: 'pause', label: 'Pause', icon: Pause, variant: 'warning' });
        actions.push({ action: 'cancel', label: 'Cancel', icon: Square, variant: 'destructive' });
        break;
      case MS.FAILED:
        actions.push({ action: 'start', label: 'Retry', icon: RefreshCw, variant: 'primary' });
        actions.push({ action: 'cancel', label: 'Cancel', icon: Square, variant: 'destructive' });
        break;
    }

    return actions;
  }

  const filteredMissions = stateFilter
    ? missions.filter((m) => m.state === stateFilter)
    : missions;

  const stateOptions: { value: MissionState | ''; label: string }[] = [
    { value: '', label: 'All States' },
    ...Object.values(MS).map((s) => ({ value: s, label: s })),
  ];

  // Mission Detail Panel
  if (selectedMission) {
    const actions = getAvailableActions(selectedMission);
    const completedObjectives = selectedMission.objectives.filter(
      (o: any) => o.completed
    ).length;
    const totalObjectives = selectedMission.objectives.length;

    return (
      <div className="space-y-6 animate-slide-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSelectedMission(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Missions
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{selectedMission.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedMission.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{selectedMission.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {actions.map(({ action, label, icon: Icon, variant }) => (
              <button
                key={action}
                onClick={() => handleMissionAction(selectedMission.id, action)}
                disabled={actionLoading === selectedMission.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50',
                  variant === 'primary' && 'bg-primary/15 text-primary hover:bg-primary/25',
                  variant === 'warning' && 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25',
                  variant === 'destructive' && 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                )}
              >
                {actionLoading === selectedMission.id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Row */}
        <div className="flex flex-wrap items-center gap-3">
          <StateBadge state={selectedMission.state} />
          <PriorityBadge priority={selectedMission.priority} />
          {selectedMission.deadline && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Deadline: {new Date(selectedMission.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-5">
          <ProgressBar progress={selectedMission.progress} state={selectedMission.state} />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              State Timeline
            </h3>
            <StateTimeline currentState={selectedMission.state} />
          </div>

          {/* Objectives */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Objectives
              </h3>
              <span className="text-xs text-muted-foreground">
                {completedObjectives}/{totalObjectives}
              </span>
            </div>
            {totalObjectives > 0 ? (
              <div className="space-y-2">
                {selectedMission.objectives.map((objective: any, index: number) => (
                  <div
                    key={objective.id || index}
                    className="flex items-start gap-2 rounded-lg border border-border bg-background/50 p-2.5"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        objective.completed
                          ? 'border-emerald-500/50 bg-emerald-500/20'
                          : 'border-border bg-white/5'
                      )}
                    >
                      {objective.completed && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        objective.completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      )}
                    >
                      {objective.description}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No objectives defined</p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Required Capabilities */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedMission.requiredCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded bg-white/10 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {cap}
                  </span>
                ))}
                {selectedMission.requiredCapabilities.length === 0 && (
                  <span className="text-xs text-muted-foreground">None specified</span>
                )}
              </div>
            </div>

            {/* Constraints */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Constraints
              </h3>
              <div className="space-y-1.5">
                {selectedMission.constraints.map((constraint, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                    <span className="text-xs text-muted-foreground">{constraint}</span>
                  </div>
                ))}
                {selectedMission.constraints.length === 0 && (
                  <span className="text-xs text-muted-foreground">No constraints</span>
                )}
              </div>
            </div>

            {/* Error */}
            {selectedMission.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                <h3 className="mb-2 text-sm font-semibold text-red-400">Error</h3>
                <p className="text-xs text-red-300">{selectedMission.error}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Timeline
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{formatRelativeTime(selectedMission.createdAt)}</span>
                </div>
                {selectedMission.startedAt && (
                  <div className="flex justify-between">
                    <span>Started</span>
                    <span>{formatRelativeTime(selectedMission.startedAt)}</span>
                  </div>
                )}
                {selectedMission.completedAt && (
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span>{formatRelativeTime(selectedMission.completedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{formatRelativeTime(selectedMission.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mission List View
  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor AI agent missions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* WebSocket indicator */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn('text-xs', connected ? 'text-emerald-400' : 'text-muted-foreground')}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={fetchMissions}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Mission
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as MissionState | '')}
            className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
          >
            {stateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {stateFilter && (
          <button
            onClick={() => setStateFilter('')}
            className="text-xs text-primary hover:text-primary/80"
          >
            Clear filter
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Mission Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 animate-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onSelect={() => setSelectedMission(mission)}
              onAction={(action) => handleMissionAction(mission.id, action)}
              isActionLoading={actionLoading === mission.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No missions found</p>
          <p className="text-xs text-muted-foreground/70">
            {stateFilter ? 'Try adjusting your filter' : 'Create a new mission to get started'}
          </p>
        </div>
      )}

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Create New Mission</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Mission Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Deploy Auth Service"
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the mission objectives and goals..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </label>
                <div className="flex gap-2">
                  {Object.values(MP).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPriority(p)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        formPriority === p
                          ? missionPriorityColors[p]
                          : 'border-border text-muted-foreground hover:bg-white/5'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Required Capabilities
                </label>
                <input
                  type="text"
                  value={formCapabilities}
                  onChange={(e) => setFormCapabilities(e.target.value)}
                  placeholder="coding, security, testing (comma-separated)"
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMission}
                disabled={!formName.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Rocket className="h-4 w-4" />
                Create Mission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mission Card Component
function MissionCard({
  mission,
  onSelect,
  onAction,
  isActionLoading,
}: {
  mission: Mission;
  onSelect: () => void;
  onAction: (action: 'start' | 'pause' | 'resume' | 'cancel') => void;
  isActionLoading: boolean;
}) {
  const completedObjectives = mission.objectives.filter((o: any) => o.completed).length;
  const totalObjectives = mission.objectives.length;

  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
            onClick={onSelect}
          >
            {mission.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {mission.description}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StateBadge state={mission.state} />
        <PriorityBadge priority={mission.priority} />
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {completedObjectives}/{totalObjectives} objectives
          </span>
          <span className="text-[10px] font-medium text-foreground">{mission.progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              mission.state === MS.COMPLETED
                ? 'bg-emerald-500'
                : mission.state === MS.FAILED
                  ? 'bg-red-500'
                  : 'bg-primary'
            )}
            style={{ width: `${mission.progress}%` }}
          />
        </div>
      </div>

      {/* Capabilities */}
      {mission.requiredCapabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {mission.requiredCapabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {cap}
            </span>
          ))}
          {mission.requiredCapabilities.length > 3 && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{mission.requiredCapabilities.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-[10px] text-muted-foreground">
          {mission.startedAt
            ? `Started ${formatRelativeTime(mission.startedAt)}`
            : 'Not started'}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Quick Actions */}
          {mission.state === MS.DRAFT || mission.state === MS.PLANNED ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('start');
              }}
              disabled={isActionLoading}
              className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
            >
              {isActionLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Start
            </button>
          ) : mission.state === MS.FAILED ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('start');
              }}
              disabled={isActionLoading}
              className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', isActionLoading && 'animate-spin')} />
              Retry
            </button>
          ) : null}

          <button
            onClick={onSelect}
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Error indicator */}
      {mission.error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
          <span className="text-[10px] text-red-300 line-clamp-2">{mission.error}</span>
        </div>
      )}
    </div>
  );
}
