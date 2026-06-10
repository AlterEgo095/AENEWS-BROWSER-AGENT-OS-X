'use client';

import { useEffect, useState } from 'react';
import {
  ListTodo,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { mockTasks } from '@/lib/mock-data';
import { cn, taskStatusColors, formatRelativeTime, formatPriority } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskStatus as TS } from '@/lib/types';

const statusOptions: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  ...Object.values(TS).map((s) => ({ value: s, label: s })),
];

const statusIcons: Record<TaskStatus, React.ElementType> = {
  pending: Clock,
  queued: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
  retrying: AlertTriangle,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const params: { status?: string } = {};
      if (statusFilter) params.status = statusFilter;
      const result = await api.getTasks(params);
      setTasks(result.data || []);
    } catch {
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery ||
      task.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'queued').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage task execution across the platform
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs text-emerald-400">Running</p>
          <p className="text-2xl font-bold text-emerald-400">{runningCount}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-xs text-blue-400">Pending</p>
          <p className="text-2xl font-bold text-blue-400">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">Failed</p>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <p className="text-xs text-cyan-400">Completed</p>
          <p className="text-2xl font-bold text-cyan-400">{completedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks by type or ID..."
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

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
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

        {(statusFilter || searchQuery) && (
          <button
            onClick={() => {
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

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Priority
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Agent
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Retries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListTodo className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const StatusIcon = statusIcons[task.status] || Clock;
  const priorityInfo = formatPriority(task.priority);

  return (
    <tr className="transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              task.status === 'running'
                ? 'bg-emerald-500/15'
                : task.status === 'failed'
                ? 'bg-red-500/15'
                : 'bg-white/5'
            )}
          >
            <StatusIcon
              className={cn(
                'h-4 w-4',
                task.status === 'running'
                  ? 'text-emerald-400 animate-spin'
                  : task.status === 'failed'
                  ? 'text-red-400'
                  : 'text-muted-foreground'
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{task.type}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{task.id}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize',
            taskStatusColors[task.status]
          )}
        >
          {task.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', priorityInfo.color)}>
            {task.priority}
          </span>
          <span className={cn('text-[10px]', priorityInfo.color)}>{priorityInfo.label}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="text-xs text-muted-foreground font-mono">
          {task.agentId ? task.agentId.substring(0, 8) + '...' : '—'}
        </span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {task.retryCount}/{task.maxRetries}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {task.completedAt
            ? formatRelativeTime(task.completedAt)
            : task.startedAt
            ? formatRelativeTime(task.startedAt)
            : formatRelativeTime(task.createdAt)}
        </span>
      </td>
    </tr>
  );
}
