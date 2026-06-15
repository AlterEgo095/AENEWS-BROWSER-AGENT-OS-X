import { AgentStatus, ClusterType, EventSeverity, MissionState, MissionPriority, TaskStatus, CollaborationPattern, MissionCategory } from './types';

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
  // Phase 2 — Intelligence Clusters
  [ClusterType.LLM_INTELLIGENCE]: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  [ClusterType.INTELLIGENT_ORCHESTRATION]: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  [ClusterType.WATCHDOG]: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  [ClusterType.SELF_EVOLUTION]: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  [ClusterType.CERTIFICATION]: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  [ClusterType.STEALTH_OPS]: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  [ClusterType.DATA_INTELLIGENCE]: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  [ClusterType.COMMUNICATION]: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
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
  // Phase 2 — Intelligence Clusters
  [ClusterType.LLM_INTELLIGENCE]: '🤖',
  [ClusterType.INTELLIGENT_ORCHESTRATION]: '🎛️',
  [ClusterType.WATCHDOG]: '👁️',
  [ClusterType.SELF_EVOLUTION]: '🧬',
  [ClusterType.CERTIFICATION]: '✅',
  [ClusterType.STEALTH_OPS]: '👻',
  [ClusterType.DATA_INTELLIGENCE]: '📊',
  [ClusterType.COMMUNICATION]: '📡',
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

export const missionStateColors: Record<MissionState, string> = {
  [MissionState.DRAFT]: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  [MissionState.PLANNED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [MissionState.RESEARCH]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [MissionState.BUILDING]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [MissionState.TESTING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [MissionState.AUDITING]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [MissionState.CERTIFYING]: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  [MissionState.DELIVERING]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [MissionState.COMPLETED]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [MissionState.FAILED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [MissionState.CANCELLED]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [MissionState.ARCHIVED]: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export const missionStateDotColors: Record<MissionState, string> = {
  [MissionState.DRAFT]: 'bg-slate-400',
  [MissionState.PLANNED]: 'bg-blue-400',
  [MissionState.RESEARCH]: 'bg-purple-400',
  [MissionState.BUILDING]: 'bg-orange-400',
  [MissionState.TESTING]: 'bg-yellow-400',
  [MissionState.AUDITING]: 'bg-amber-400',
  [MissionState.CERTIFYING]: 'bg-teal-400',
  [MissionState.DELIVERING]: 'bg-cyan-400',
  [MissionState.COMPLETED]: 'bg-emerald-400',
  [MissionState.FAILED]: 'bg-red-400',
  [MissionState.CANCELLED]: 'bg-gray-500',
  [MissionState.ARCHIVED]: 'bg-zinc-500',
};

export const missionPriorityColors: Record<MissionPriority, string> = {
  [MissionPriority.LOW]: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  [MissionPriority.MEDIUM]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [MissionPriority.HIGH]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [MissionPriority.CRITICAL]: 'bg-red-500/20 text-red-400 border-red-500/30',
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

// Orchestration — Collaboration Pattern Colors
export const collaborationPatternColors: Record<CollaborationPattern, string> = {
  delegation: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  handoff: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  parallel: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pipeline: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  consensus: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  swarm: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export const collaborationPatternIcons: Record<CollaborationPattern, string> = {
  delegation: '🎯',
  handoff: '🤝',
  parallel: '⚡',
  pipeline: '🔄',
  consensus: '🗳️',
  swarm: '🐝',
};

export const clusterHealthStatusColors: Record<string, string> = {
  healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  offline: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const clusterHealthDotColors: Record<string, string> = {
  healthy: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  critical: 'bg-red-400',
  offline: 'bg-gray-500',
};

export const connectorStatusColors: Record<string, string> = {
  connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  disconnected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  initializing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const connectorModeColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  passive: 'bg-slate-500/15 text-slate-400',
  hybrid: 'bg-cyan-500/15 text-cyan-400',
};

// Mission Category Configuration
export const missionCategoryConfig: Record<MissionCategory, { label: string; icon: string; description: string; color: string }> = {
  [MissionCategory.RESEARCH_ANALYSIS]: { label: 'Research & Analysis', icon: '🔍', description: 'Web search, OSINT, data analysis, intelligence gathering', color: 'from-blue-500 to-cyan-500' },
  [MissionCategory.CONTENT_CREATION]: { label: 'Content Creation', icon: '✍️', description: 'Writing, presentations, media generation', color: 'from-pink-500 to-rose-500' },
  [MissionCategory.CODE_DEVELOPMENT]: { label: 'Code & Development', icon: '💻', description: 'Coding, deployment, debugging, architecture', color: 'from-green-500 to-emerald-500' },
  [MissionCategory.SECURITY_OPS]: { label: 'Security Operations', icon: '🔒', description: 'Security testing, encryption, forensics, red teaming', color: 'from-red-500 to-orange-500' },
  [MissionCategory.STEALTH_OPERATIONS]: { label: 'Stealth Operations', icon: '👻', description: 'Undetectable operations, covert wrappers, stealth browsing', color: 'from-purple-600 to-violet-600' },
  [MissionCategory.BUSINESS_INTELLIGENCE]: { label: 'Business Intelligence', icon: '📊', description: 'BI, analytics, reporting, forecasting', color: 'from-amber-500 to-yellow-500' },
  [MissionCategory.MARKETING_GROWTH]: { label: 'Marketing & Growth', icon: '🚀', description: 'Marketing, SEO, social media, growth hacking', color: 'from-orange-500 to-amber-500' },
  [MissionCategory.INFRASTRUCTURE_MGMT]: { label: 'Infrastructure', icon: '🏗️', description: 'DevOps, cloud, monitoring, edge computing', color: 'from-slate-500 to-gray-500' },
  [MissionCategory.AUTOMATION_WORKFLOW]: { label: 'Automation & Workflows', icon: '🤖', description: 'Browser automation, scraping, task orchestration', color: 'from-teal-500 to-cyan-500' },
  [MissionCategory.DOCUMENT_PROCESSING]: { label: 'Documents & Office', icon: '📄', description: 'Office, documents, spreadsheets, contracts', color: 'from-indigo-500 to-blue-500' },
  [MissionCategory.AI_ORCHESTRATION]: { label: 'AI & Orchestration', icon: '🧠', description: 'Meta-intelligence, swarm, self-evolution, reasoning', color: 'from-violet-500 to-purple-500' },
  [MissionCategory.SYSTEM_ADMINISTRATION]: { label: 'System Admin', icon: '🖥️', description: 'Terminal, file system, process management', color: 'from-zinc-500 to-neutral-500' },
  [MissionCategory.DATA_ENGINEERING]: { label: 'Data Engineering', icon: '📊', description: 'ETL pipelines, data quality, warehousing, ML pipelines', color: 'from-sky-500 to-blue-500' },
  [MissionCategory.COMMUNICATION_OPS]: { label: 'Communication Ops', icon: '📡', description: 'API gateway, webhooks, notifications, real-time comms', color: 'from-teal-500 to-emerald-500' },
  [MissionCategory.ADVANCED_REASONING]: { label: 'Advanced Reasoning', icon: '🧬', description: 'Causal inference, multimodal, federated learning, agent forging', color: 'from-fuchsia-500 to-pink-500' },
};

// Tier Configuration
export const tierConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; glow?: string }> = {
  standard: { label: 'Standard', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
  advanced: { label: 'Advanced', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  elite: { label: 'Elite', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
  stealth: { label: 'Stealth', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', glow: 'shadow-purple-500/10' },
};

// Power Level Labels
export const powerLevelLabels: Record<number, string> = {
  1: 'Standard Power',
  2: 'Advanced Power',
  3: 'Elite Power',
};
