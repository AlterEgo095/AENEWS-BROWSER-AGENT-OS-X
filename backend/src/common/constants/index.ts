export const AGENT_CLUSTERS = {
  BROWSER: 'browser',
  COMPUTER: 'computer',
  CODING: 'coding',
  OFFICE: 'office',
  MARKETING: 'marketing',
  BUSINESS: 'business',
  INFRASTRUCTURE: 'infrastructure',
  SECURITY: 'security',
  META_INTELLIGENCE: 'meta-intelligence',
} as const;

export const AGENT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
  STOPPED: 'stopped',
  COMPLETED: 'completed',
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying',
} as const;

export const EVENT_NAMESPACES = {
  AGENT: 'agent',
  TASK: 'task',
  PLUGIN: 'plugin',
  SYSTEM: 'system',
  TENANT: 'tenant',
  CLUSTER: 'cluster',
} as const;

export const QUEUE_NAMES = {
  AGENT_EXECUTION: 'agent:execution',
  TASK_PROCESSING: 'task:processing',
  EVENT_DISPATCH: 'event:dispatch',
  NOTIFICATION: 'notification',
  LOG_AGGREGATION: 'log:aggregation',
} as const;

export const CACHE_KEYS = {
  AGENT_REGISTRY: 'agent:registry',
  TENANT_CONFIG: 'tenant:config',
  USER_SESSION: 'user:session',
  PLUGIN_REGISTRY: 'plugin:registry',
} as const;

export const RABBITMQ_EXCHANGES = {
  AGENT_EVENTS: 'agent.events',
  TASK_EVENTS: 'task.events',
  SYSTEM_EVENTS: 'system.events',
  CLUSTER_EVENTS: 'cluster.events',
} as const;

export const RABBITMQ_QUEUES = {
  AGENT_LIFECYCLE: 'agent.lifecycle',
  TASK_EXECUTION: 'task.execution',
  NOTIFICATION_DELIVERY: 'notification.delivery',
  EVENT_PROCESSING: 'event.processing',
} as const;
