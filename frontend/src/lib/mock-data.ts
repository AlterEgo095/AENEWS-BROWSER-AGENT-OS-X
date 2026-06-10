import { Agent, AgentStatus, ClusterType, ClusterStats, Task, TaskStatus, Event, EventSeverity } from './types';

export const mockAgents: Agent[] = [
  { id: '1', name: 'Navigation Agent', cluster: ClusterType.BROWSER, status: AgentStatus.RUNNING, config: {}, capabilities: ['navigate', 'interact'], tenantId: 't1', version: '1.0.0', description: 'Handles web navigation and page traversal', isEnabled: true, lastExecutionAt: '2026-03-10T10:30:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T10:30:00Z' },
  { id: '2', name: 'Scraping Agent', cluster: ClusterType.BROWSER, status: AgentStatus.IDLE, config: {}, capabilities: ['scrape', 'extract'], tenantId: 't1', version: '1.2.0', description: 'Web scraping and data extraction', isEnabled: true, lastExecutionAt: '2026-03-09T15:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-09T15:00:00Z' },
  { id: '3', name: 'Terminal Agent', cluster: ClusterType.COMPUTER, status: AgentStatus.RUNNING, config: {}, capabilities: ['execute', 'shell'], tenantId: 't1', version: '2.0.0', description: 'Terminal command execution', isEnabled: true, lastExecutionAt: '2026-03-10T12:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T12:00:00Z' },
  { id: '4', name: 'Process Agent', cluster: ClusterType.COMPUTER, status: AgentStatus.ERROR, config: {}, capabilities: ['monitor', 'kill'], tenantId: 't1', version: '1.1.0', description: 'Process monitoring and management', isEnabled: true, lastExecutionAt: '2026-03-10T08:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T08:00:00Z' },
  { id: '5', name: 'Code Generation Agent', cluster: ClusterType.CODING, status: AgentStatus.IDLE, config: {}, capabilities: ['generate', 'refactor'], tenantId: 't1', version: '1.5.0', description: 'AI-powered code generation', isEnabled: true, lastExecutionAt: '2026-03-10T09:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T09:00:00Z' },
  { id: '6', name: 'Code Review Agent', cluster: ClusterType.CODING, status: AgentStatus.RUNNING, config: {}, capabilities: ['review', 'lint'], tenantId: 't1', version: '1.3.0', description: 'Automated code review', isEnabled: true, lastExecutionAt: '2026-03-10T11:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T11:00:00Z' },
  { id: '7', name: 'Document Agent', cluster: ClusterType.OFFICE, status: AgentStatus.COMPLETED, config: {}, capabilities: ['create', 'edit'], tenantId: 't1', version: '1.0.0', description: 'Document creation and editing', isEnabled: true, lastExecutionAt: '2026-03-10T07:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T07:00:00Z' },
  { id: '8', name: 'Email Agent', cluster: ClusterType.OFFICE, status: AgentStatus.PAUSED, config: {}, capabilities: ['send', 'read'], tenantId: 't1', version: '1.1.0', description: 'Email management and automation', isEnabled: true, lastExecutionAt: '2026-03-09T18:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-09T18:00:00Z' },
  { id: '9', name: 'SEO Agent', cluster: ClusterType.MARKETING, status: AgentStatus.RUNNING, config: {}, capabilities: ['optimize', 'analyze'], tenantId: 't1', version: '1.0.0', description: 'SEO optimization and analysis', isEnabled: true, lastExecutionAt: '2026-03-10T10:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T10:00:00Z' },
  { id: '10', name: 'Threat Detection Agent', cluster: ClusterType.SECURITY, status: AgentStatus.RUNNING, config: {}, capabilities: ['detect', 'alert'], tenantId: 't1', version: '2.1.0', description: 'Real-time threat detection', isEnabled: true, lastExecutionAt: '2026-03-10T12:30:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T12:30:00Z' },
  { id: '11', name: 'Orchestration Agent', cluster: ClusterType.META_INTELLIGENCE, status: AgentStatus.RUNNING, config: {}, capabilities: ['orchestrate', 'coordinate'], tenantId: 't1', version: '1.0.0', description: 'Agent orchestration and coordination', isEnabled: true, lastExecutionAt: '2026-03-10T12:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T12:00:00Z' },
  { id: '12', name: 'Scaling Agent', cluster: ClusterType.INFRASTRUCTURE, status: AgentStatus.IDLE, config: {}, capabilities: ['scale', 'monitor'], tenantId: 't1', version: '1.2.0', description: 'Auto-scaling infrastructure', isEnabled: true, lastExecutionAt: '2026-03-10T06:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-10T06:00:00Z' },
  { id: '13', name: 'Finance Agent', cluster: ClusterType.BUSINESS, status: AgentStatus.IDLE, config: {}, capabilities: ['report', 'forecast'], tenantId: 't1', version: '1.0.0', description: 'Financial reporting and forecasting', isEnabled: true, lastExecutionAt: '2026-03-09T20:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-09T20:00:00Z' },
];

export const mockClusterStats: ClusterStats[] = Object.values(ClusterType).map((cluster) => {
  const agents = mockAgents.filter((a) => a.cluster === cluster);
  return {
    cluster,
    totalAgents: agents.length || Math.floor(Math.random() * 8) + 2,
    activeAgents: agents.filter((a) => a.status === AgentStatus.RUNNING).length || Math.floor(Math.random() * 4),
    idleAgents: agents.filter((a) => a.status === AgentStatus.IDLE).length || Math.floor(Math.random() * 3),
    errorAgents: agents.filter((a) => a.status === AgentStatus.ERROR).length || Math.floor(Math.random() * 1),
    agents,
  };
});

export const mockTasks: Task[] = [
  { id: 't1', type: 'web_scrape', agentId: '2', tenantId: 't1', status: TaskStatus.COMPLETED, priority: 7, input: { url: 'https://example.com' }, output: { data: 'scraped_content' }, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T10:00:00Z', completedAt: '2026-03-10T10:02:00Z', createdAt: '2026-03-10T09:55:00Z', updatedAt: '2026-03-10T10:02:00Z' },
  { id: 't2', type: 'code_review', agentId: '6', tenantId: 't1', status: TaskStatus.RUNNING, priority: 5, input: { repository: 'backend', pr: 42 }, output: null, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T11:00:00Z', completedAt: null, createdAt: '2026-03-10T10:55:00Z', updatedAt: '2026-03-10T11:00:00Z' },
  { id: 't3', type: 'threat_scan', agentId: '10', tenantId: 't1', status: TaskStatus.RUNNING, priority: 9, input: { scope: 'full' }, output: null, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T12:00:00Z', completedAt: null, createdAt: '2026-03-10T11:58:00Z', updatedAt: '2026-03-10T12:00:00Z' },
  { id: 't4', type: 'seo_analysis', agentId: '9', tenantId: 't1', status: TaskStatus.QUEUED, priority: 3, input: { domain: 'example.com' }, output: null, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: '2026-03-10T14:00:00Z', startedAt: null, completedAt: null, createdAt: '2026-03-10T12:30:00Z', updatedAt: '2026-03-10T12:30:00Z' },
  { id: 't5', type: 'process_monitor', agentId: '4', tenantId: 't1', status: TaskStatus.FAILED, priority: 8, input: { pid: 1234 }, output: null, error: 'Process not found', retryCount: 3, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T08:00:00Z', completedAt: '2026-03-10T08:01:00Z', createdAt: '2026-03-10T07:55:00Z', updatedAt: '2026-03-10T08:01:00Z' },
  { id: 't6', type: 'terminal_exec', agentId: '3', tenantId: 't1', status: TaskStatus.COMPLETED, priority: 5, input: { command: 'ls -la' }, output: { stdout: 'drwxr-xr-x ...' }, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T12:00:00Z', completedAt: '2026-03-10T12:00:05Z', createdAt: '2026-03-10T11:59:00Z', updatedAt: '2026-03-10T12:00:05Z' },
  { id: 't7', type: 'document_create', agentId: '7', tenantId: 't1', status: TaskStatus.COMPLETED, priority: 4, input: { template: 'report' }, output: { fileId: 'doc_123' }, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T07:00:00Z', completedAt: '2026-03-10T07:05:00Z', createdAt: '2026-03-10T06:55:00Z', updatedAt: '2026-03-10T07:05:00Z' },
  { id: 't8', type: 'deploy', agentId: '12', tenantId: 't1', status: TaskStatus.PENDING, priority: 6, input: { env: 'production' }, output: null, error: null, retryCount: 0, maxRetries: 3, parentTaskId: null, scheduledAt: '2026-03-10T16:00:00Z', startedAt: null, completedAt: null, createdAt: '2026-03-10T12:45:00Z', updatedAt: '2026-03-10T12:45:00Z' },
  { id: 't9', type: 'security_audit', agentId: '10', tenantId: 't1', status: TaskStatus.RETRYING, priority: 9, input: { scope: 'infrastructure' }, output: null, error: 'Connection timeout', retryCount: 1, maxRetries: 3, parentTaskId: null, scheduledAt: null, startedAt: '2026-03-10T11:30:00Z', completedAt: null, createdAt: '2026-03-10T11:25:00Z', updatedAt: '2026-03-10T11:45:00Z' },
];

export const mockEvents: Event[] = [
  { id: 'e1', type: 'agent.started', namespace: 'agent.lifecycle', payload: { agentId: '1', agentName: 'Navigation Agent' }, source: 'agent-registry', severity: EventSeverity.INFO, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:30:00Z' },
  { id: 'e2', type: 'task.failed', namespace: 'task.execution', payload: { taskId: 't5', error: 'Process not found' }, source: 'task-service', severity: EventSeverity.ERROR, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:25:00Z' },
  { id: 'e3', type: 'agent.error', namespace: 'agent.lifecycle', payload: { agentId: '4', error: 'Unexpected shutdown' }, source: 'process-monitor', severity: EventSeverity.CRITICAL, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:20:00Z' },
  { id: 'e4', type: 'cluster.scaled', namespace: 'infrastructure', payload: { cluster: 'browser', from: 3, to: 5 }, source: 'scaling-agent', severity: EventSeverity.INFO, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:15:00Z' },
  { id: 'e5', type: 'security.alert', namespace: 'security', payload: { threat: 'suspicious_login', ip: '192.168.1.100' }, source: 'threat-detection', severity: EventSeverity.WARNING, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:10:00Z' },
  { id: 'e6', type: 'task.completed', namespace: 'task.execution', payload: { taskId: 't1', duration: '2m' }, source: 'task-service', severity: EventSeverity.INFO, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:05:00Z' },
  { id: 'e7', type: 'agent.registered', namespace: 'agent.registry', payload: { agentId: '14', name: 'New Agent' }, source: 'agent-registry', severity: EventSeverity.INFO, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T12:00:00Z' },
  { id: 'e8', type: 'system.health', namespace: 'system', payload: { cpu: '45%', memory: '62%' }, source: 'health-monitor', severity: EventSeverity.INFO, tenantId: null, metadata: {}, createdAt: '2026-03-10T11:55:00Z' },
  { id: 'e9', type: 'security.breach', namespace: 'security', payload: { type: 'unauthorized_access', resource: 'admin-panel' }, source: 'access-control', severity: EventSeverity.CRITICAL, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T11:50:00Z' },
  { id: 'e10', type: 'task.retrying', namespace: 'task.execution', payload: { taskId: 't9', attempt: 2 }, source: 'task-service', severity: EventSeverity.WARNING, tenantId: 't1', metadata: {}, createdAt: '2026-03-10T11:45:00Z' },
];

export const mockHealth = {
  status: 'ok' as const,
  info: {
    database: { status: 'up' },
    redis: { status: 'up', host: 'localhost', port: 6379, ping: 'PONG', version: '7.2.4', usedMemoryHuman: '1.23M', connectedClients: 5, keyCount: 128 },
    memory_heap: { status: 'up' },
    memory_rss: { status: 'up' },
    disk: { status: 'up' },
    agent_system: { status: 'up', agentRegistry: { initialized: true, registeredAgents: 13, lastSyncAt: '2026-03-10T12:30:00Z' }, queueSystem: { connected: true, pendingJobs: 3, activeWorkers: 5 } },
  },
  details: {
    database: { status: 'up' },
    redis: { status: 'up' },
    memory_heap: { status: 'up' },
    memory_rss: { status: 'up' },
    disk: { status: 'up' },
    agent_system: { status: 'up' },
  },
};
