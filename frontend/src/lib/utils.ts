import { AgentStatus, ClusterType, EventSeverity, TaskStatus } from './types';

export const clusterColors: Record<ClusterType, string> = {
  [ClusterType.BROWSER]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [ClusterType.COMPUTER]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [ClusterType.CODING]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [ClusterType.OFFICE]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [ClusterType.MARKETING]: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  [ClusterType.BUSINESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [ClusterType.INFRASTRUCTURE]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [ClusterType.SECURITY]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [ClusterType.META_INTELLIGENCE]: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

export const clusterIcons: Record<ClusterType, string> = {
  [ClusterType.BROWSER]: '🌐',
  [ClusterType.COMPUTER]: '💻',
  [ClusterType.CODING]: '🔧',
  [ClusterType.OFFICE]: '📋',
  [ClusterType.MARKETING]: '📢',
  [ClusterType.BUSINESS]: '💼',
  [ClusterType.INFRASTRUCTURE]: '🏗️',
  [ClusterType.SECURITY]: '🔒',
  [ClusterType.META_INTELLIGENCE]: '🧠',
};

export const statusColors: Record<AgentStatus, string> = {
  [AgentStatus.IDLE]: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  [AgentStatus.RUNNING]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [AgentStatus.PAUSED]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [AgentStatus.ERROR]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [AgentStatus.STOPPED]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [AgentStatus.COMPLETED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export const statusDotColors: Record<AgentStatus, string> = {
  [AgentStatus.IDLE]: 'bg-slate-400',
  [AgentStatus.RUNNING]: 'bg-emerald-400 animate-pulse-dot',
  [AgentStatus.PAUSED]: 'bg-amber-400',
  [AgentStatus.ERROR]: 'bg-red-400',
  [AgentStatus.STOPPED]: 'bg-gray-500',
  [AgentStatus.COMPLETED]: 'bg-blue-400',
};

export const taskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  [TaskStatus.QUEUED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [TaskStatus.RUNNING]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [TaskStatus.COMPLETED]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [TaskStatus.FAILED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [TaskStatus.CANCELLED]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [TaskStatus.RETRYING]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const severityColors: Record<EventSeverity, string> = {
  [EventSeverity.INFO]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [EventSeverity.WARNING]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [EventSeverity.ERROR]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [EventSeverity.CRITICAL]: 'bg-red-600/30 text-red-300 border-red-600/40',
};

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatPriority(priority: number): { label: string; color: string } {
  if (priority >= 9) return { label: 'Critical', color: 'text-red-400' };
  if (priority >= 7) return { label: 'High', color: 'text-orange-400' };
  if (priority >= 4) return { label: 'Medium', color: 'text-amber-400' };
  return { label: 'Low', color: 'text-slate-400' };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
