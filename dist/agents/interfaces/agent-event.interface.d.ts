import { AgentCluster, AgentStatus } from './agent.interface';
export declare enum AgentEventType {
    AGENT_INITIALIZED = "agent.initialized",
    AGENT_STARTED = "agent.started",
    AGENT_STOPPED = "agent.stopped",
    AGENT_PAUSED = "agent.paused",
    AGENT_RESUMED = "agent.resumed",
    AGENT_DESTROYED = "agent.destroyed",
    AGENT_ERROR = "agent.error",
    AGENT_STATUS_CHANGED = "agent.status_changed",
    AGENT_HEALTH_CHANGED = "agent.health_changed",
    TASK_CREATED = "task.created",
    TASK_STARTED = "task.started",
    TASK_COMPLETED = "task.completed",
    TASK_FAILED = "task.failed",
    TASK_CANCELLED = "task.cancelled",
    TASK_PROGRESS = "task.progress",
    ORCHESTRATION_STARTED = "orchestration.started",
    ORCHESTRATION_DECOMPOSED = "orchestration.decomposed",
    ORCHESTRATION_PLANNED = "orchestration.planned",
    ORCHESTRATION_STEP_COMPLETED = "orchestration.step_completed",
    ORCHESTRATION_COMPLETED = "orchestration.completed",
    ORCHESTRATION_FAILED = "orchestration.failed",
    MEMORY_STORED = "memory.stored",
    MEMORY_RETRIEVED = "memory.retrieved",
    MEMORY_DELETED = "memory.deleted",
    MESSAGE_SENT = "communication.message_sent",
    MESSAGE_RECEIVED = "communication.message_received",
    MESSAGE_FAILED = "communication.message_failed",
    SYSTEM_ALERT = "system.alert",
    SYSTEM_CONFIG_CHANGED = "system.config_changed",
    CIRCUIT_BREAKER_OPENED = "system.circuit_breaker_opened",
    CIRCUIT_BREAKER_CLOSED = "system.circuit_breaker_closed"
}
export declare enum EventPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}
export interface AgentEvent<T = any> {
    id: string;
    type: AgentEventType;
    sourceAgentId: string;
    targetAgentId?: string;
    cluster?: AgentCluster;
    payload: T;
    priority: EventPriority;
    correlationId: string;
    causationId?: string;
    timestamp: Date;
    version: number;
    metadata: Record<string, any>;
}
export interface AgentStatusChangedPayload {
    previousStatus: AgentStatus;
    newStatus: AgentStatus;
    reason?: string;
}
export interface AgentHealthChangedPayload {
    isHealthy: boolean;
    previousHealth: boolean;
    consecutiveFailures: number;
    details?: Record<string, any>;
}
export interface TaskCreatedPayload {
    taskId: string;
    parentTaskId?: string;
    agentId?: string;
    cluster?: AgentCluster;
    priority: number;
}
export interface TaskCompletedPayload {
    taskId: string;
    agentId: string;
    success: boolean;
    executionTimeMs: number;
    result?: any;
    error?: string;
}
export interface TaskProgressPayload {
    taskId: string;
    agentId: string;
    progress: number;
    message: string;
    currentStep?: string;
}
export interface OrchestrationStartedPayload {
    taskId: string;
    correlationId: string;
    inputSummary: string;
}
export interface OrchestrationCompletedPayload {
    taskId: string;
    correlationId: string;
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalExecutionTimeMs: number;
}
export interface AgentErrorPayload {
    errorCode: string;
    errorMessage: string;
    taskId?: string;
    stackTrace?: string;
    recoverable: boolean;
}
export interface SystemAlertPayload {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    component: string;
    details?: Record<string, any>;
}
export interface CircuitBreakerPayload {
    agentId: string;
    state: 'open' | 'closed' | 'half_open';
    failureCount: number;
    lastFailureTime: Date;
}
export interface EventSubscription {
    id: string;
    subscriberId: string;
    eventType: AgentEventType | '*';
    filter?: EventFilter;
    handler: EventHandler;
    createdAt: Date;
}
export interface EventFilter {
    sourceAgentId?: string;
    cluster?: AgentCluster;
    priorityMin?: EventPriority;
    custom?: (event: AgentEvent) => boolean;
}
export type EventHandler = (event: AgentEvent) => Promise<void> | void;
export interface EventStoreEntry {
    id: string;
    event: AgentEvent;
    storedAt: Date;
    processedAt?: Date;
    processingAttempts: number;
    status: EventProcessingStatus;
}
export declare enum EventProcessingStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    DEAD_LETTER = "dead_letter"
}
export interface DeadLetterEntry {
    id: string;
    originalEvent: AgentEvent;
    error: string;
    failureCount: number;
    lastFailedAt: Date;
    canRetry: boolean;
    nextRetryAt?: Date;
    metadata: Record<string, any>;
}
export interface EventReplayRequest {
    eventTypes?: AgentEventType[];
    sourceAgentId?: string;
    fromTimestamp: Date;
    toTimestamp: Date;
    targetSubscriberId: string;
    maxEvents?: number;
}
export interface EventReplayResult {
    replayedCount: number;
    failedCount: number;
    skippedCount: number;
    durationMs: number;
}
export interface IEventBusService {
    publish<T>(event: Omit<AgentEvent<T>, 'id' | 'timestamp' | 'version'>): Promise<AgentEvent<T>>;
    subscribe(subscription: Omit<EventSubscription, 'id' | 'createdAt'>): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<boolean>;
    getSubscriptions(subscriberId?: string): Promise<EventSubscription[]>;
}
export interface IEventStoreService {
    store(event: AgentEvent): Promise<EventStoreEntry>;
    getEvent(id: string): Promise<EventStoreEntry | null>;
    query(filter: {
        eventTypes?: AgentEventType[];
        sourceAgentId?: string;
        fromTimestamp?: Date;
        toTimestamp?: Date;
        limit?: number;
        offset?: number;
    }): Promise<EventStoreEntry[]>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
}
export interface IDeadLetterQueueService {
    add(entry: Omit<DeadLetterEntry, 'id'>): Promise<DeadLetterEntry>;
    get(id: string): Promise<DeadLetterEntry | null>;
    getPending(limit?: number): Promise<DeadLetterEntry[]>;
    retry(id: string): Promise<boolean>;
    discard(id: string): Promise<boolean>;
    getStats(): Promise<DeadLetterQueueStats>;
}
export interface DeadLetterQueueStats {
    totalEntries: number;
    pendingRetry: number;
    permanentlyFailed: number;
    oldestEntry?: Date;
}
export interface IEventReplayService {
    replay(request: EventReplayRequest): Promise<EventReplayResult>;
    getReplayStatus(replayId: string): Promise<EventReplayResult | null>;
}
export interface IAgentEventBus {
    publish(event: AgentEvent): Promise<void>;
    subscribe(eventType: string, handler: (event: AgentEvent) => Promise<void>): string;
    unsubscribe(subscriptionId: string): void;
    getEventHistory(agentId: string, limit?: number): Promise<AgentEvent[]>;
    replayEvents(fromTimestamp: Date, toTimestamp: Date): AsyncIterable<AgentEvent>;
}
