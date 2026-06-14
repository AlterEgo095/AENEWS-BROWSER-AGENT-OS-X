export interface CapabilityRegistration {
    agentId: string;
    capabilities: CapabilityDescriptor[];
    registeredAt: string;
    agentMetadata?: Record<string, unknown>;
}
export interface CapabilityDescriptor {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    version: string;
    deprecated: boolean;
    costEstimate: number;
    latencyEstimate: number;
    tags?: string[];
    deprecationMessage?: string;
    requiredPermissions?: string[];
}
export declare enum SkillLevel {
    NOVICE = "NOVICE",
    COMPETENT = "COMPETENT",
    PROFICIENT = "PROFICIENT",
    EXPERT = "EXPERT",
    MASTER = "MASTER"
}
export interface SkillProfile {
    agentId: string;
    skills: SkillEntry[];
    overallScore?: number;
    lastUpdatedAt?: string;
}
export interface SkillEntry {
    name: string;
    level: SkillLevel;
    costPerExecution: number;
    avgLatencyMs: number;
    successRate: number;
    executionCount: number;
    lastExecutedAt: string;
    improvementTrend: number;
    confidence?: number;
}
export interface WorldModelState {
    currentUser: WorldUser;
    currentProject: WorldProject;
    context: WorldContext;
    objectives: WorldObjective[];
    constraints: WorldConstraint[];
    history: WorldHistory;
    knowledgeBase: WorldKnowledgeBase;
    currentEvents: WorldEvent[];
    systemState: WorldSystemState;
}
export interface WorldUser {
    id: string;
    name: string;
    email?: string;
    roles: string[];
    preferences: Record<string, unknown>;
    activeSessions: number;
}
export interface WorldProject {
    id: string;
    name: string;
    description?: string;
    repositoryUrl?: string;
    techStack: string[];
    rootPath?: string;
    environment: string;
}
export interface WorldContext {
    locale: string;
    timezone: string;
    deviceType: string;
    currentDateTime: string;
    quietHours: boolean;
    networkStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    metadata: Record<string, unknown>;
}
export interface WorldObjective {
    id: string;
    description: string;
    priority: number;
    status: ObjectiveStatus;
    targetDate?: string;
    progress: number;
    subObjectives: WorldObjective[];
    assignedAgents?: string[];
    metrics?: Record<string, number>;
}
export declare enum ObjectiveStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    ABANDONED = "ABANDONED"
}
export interface WorldConstraint {
    id: string;
    name: string;
    description: string;
    type: string;
    active: boolean;
    parameters: Record<string, unknown>;
}
export interface WorldHistory {
    transitions: WorldStateTransition[];
    totalEvents: number;
    oldestEventAt?: string;
    newestEventAt?: string;
}
export interface WorldStateTransition {
    timestamp: string;
    type: string;
    description: string;
    triggeredBy: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
}
export interface WorldKnowledgeBase {
    entryCount: number;
    domains: string[];
    lastUpdatedAt: string;
    indexVersion: string;
}
export interface WorldEvent {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    relatedAgents?: string[];
    payload?: Record<string, unknown>;
}
export interface WorldSystemState {
    health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'CRITICAL';
    uptimeSeconds: number;
    activeMissions: number;
    activeAgents: number;
    loadAverage: number;
    pendingApprovals: number;
    lastUpdatedAt: string;
}
export declare enum RuleType {
    PROHIBITION = "PROHIBITION",
    REQUIREMENT = "REQUIREMENT",
    CONSTRAINT = "CONSTRAINT",
    GUIDELINE = "GUIDELINE"
}
export declare enum RuleSeverity {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export declare enum RuleEnforcement {
    BLOCK = "BLOCK",
    WARN = "WARN",
    LOG = "LOG"
}
export interface ConstitutionalRule {
    id: string;
    name: string;
    description: string;
    ruleType: RuleType;
    severity: RuleSeverity;
    enforcement: RuleEnforcement;
    conditions: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    category?: string;
    changeLog?: ConstitutionalRuleChange[];
}
export interface ConstitutionalRuleChange {
    timestamp: string;
    changedBy: string;
    description: string;
    previousValue?: Record<string, unknown>;
}
export interface ConstitutionalViolation {
    ruleId: string;
    agentId: string;
    action: string;
    timestamp: string;
    blocked: boolean;
    reason: string;
    id?: string;
    context?: Record<string, unknown>;
}
export declare enum MissionStatus {
    DRAFT = "DRAFT",
    SIMULATING = "SIMULATING",
    APPROVED = "APPROVED",
    IN_PROGRESS = "IN_PROGRESS",
    PAUSED = "PAUSED",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export interface MissionDefinition {
    id: string;
    name: string;
    description: string;
    status: MissionStatus;
    objectives: MissionObjective[];
    taskGraph: MissionTaskGraph;
    dependencyGraph: Record<string, string[]>;
    executionGraph: MissionExecutionGraph;
    resultGraph: MissionResultGraph;
    priority: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    metadata: Record<string, unknown>;
}
export interface MissionObjective {
    id: string;
    missionId: string;
    description: string;
    status: ObjectiveStatus;
    subObjectives: MissionObjective[];
    assignedAgents: string[];
    taskIds: string[];
    progress: number;
    targetDate?: string;
    metrics?: Record<string, number>;
}
export interface MissionTaskGraph {
    nodes: MissionTaskNode[];
    edges: MissionTaskEdge[];
    criticalPath: string[];
}
export interface MissionTaskNode {
    id: string;
    type: string;
    agentId: string;
    capability: string;
    dependencies: string[];
    estimatedDurationMs: number;
    actualDurationMs?: number;
    status: MissionStatus;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    retryCount?: number;
    maxRetries?: number;
}
export declare enum TaskEdgeType {
    HARD_DEPENDENCY = "HARD_DEPENDENCY",
    SOFT_DEPENDENCY = "SOFT_DEPENDENCY",
    RESOURCE_DEPENDENCY = "RESOURCE_DEPENDENCY"
}
export interface MissionTaskEdge {
    fromId: string;
    toId: string;
    type: TaskEdgeType;
    description?: string;
}
export interface MissionExecutionGraph {
    taskStates: Record<string, MissionTaskExecutionState>;
    activeTasks: string[];
    completedTasks: string[];
    failedTasks: string[];
    elapsedMs: number;
}
export interface MissionTaskExecutionState {
    taskId: string;
    status: MissionStatus;
    startedAt?: string;
    completedAt?: string;
    executingAgentId?: string;
    attempt: number;
    errorMessage?: string;
}
export interface MissionResultGraph {
    taskResults: Record<string, MissionTaskResult>;
    missionSummary?: string;
    metrics: Record<string, number>;
}
export interface MissionTaskResult {
    taskId: string;
    output: Record<string, unknown>;
    artifacts: string[];
    qualityScore?: number;
    producedAt: string;
}
export declare enum RiskLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export interface SimulationResult {
    costEstimate: number;
    timeEstimate: number;
    riskLevel: RiskLevel;
    successProbability: number;
    bottlenecks: SimulationBottleneck[];
    recommendations: string[];
    resourceRequirements: SimulationResourceRequirement[];
    modelVersion?: string;
    confidence?: number;
}
export interface SimulationBottleneck {
    description: string;
    affectedTaskIds: string[];
    severity: RiskLevel;
    mitigation?: string;
}
export interface SimulationResourceRequirement {
    resourceType: ResourceType;
    quantity: number;
    durationMs: number;
    estimatedCost: number;
}
export declare enum ApprovalActionType {
    DELETE = "DELETE",
    DEPLOY_PRODUCTION = "DEPLOY_PRODUCTION",
    PAYMENT = "PAYMENT",
    EMAIL_SEND = "EMAIL_SEND",
    SOCIAL_MEDIA_POST = "SOCIAL_MEDIA_POST",
    SSH_ACCESS = "SSH_ACCESS",
    DNS_CHANGE = "DNS_CHANGE",
    DATABASE_MIGRATION = "DATABASE_MIGRATION",
    API_KEY_ROTATION = "API_KEY_ROTATION"
}
export declare enum ApprovalStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
export interface ApprovalRequest {
    id: string;
    agentId: string;
    action: string;
    actionType: ApprovalActionType;
    payload: Record<string, unknown>;
    justification: string;
    riskAssessment: RiskLevel;
    status: ApprovalStatus;
    requestedAt: string;
    resolvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
    expiresAt?: string;
    attachments?: ApprovalAttachment[];
}
export interface ApprovalAttachment {
    name: string;
    mimeType: string;
    content: string;
}
export interface DigitalTwinState {
    id: string;
    lastSyncAt: string;
    vps: TwinVPS[];
    containers: TwinContainer[];
    databases: TwinDatabase[];
    apis: TwinAPI[];
    gitRepos: TwinGitRepo[];
    cloudServices: TwinCloudService[];
    browsers: TwinBrowser[];
    syncStatus: 'SYNCED' | 'SYNCING' | 'STALE' | 'ERROR';
    syncError?: string;
}
export interface TwinVPS {
    host: string;
    ip: string;
    status: 'RUNNING' | 'STOPPED' | 'REBOOTING' | 'PROVISIONING' | 'ERROR';
    cpu: TwinResourceMetric;
    memory: TwinResourceMetric;
    disk: TwinResourceMetric;
    os: string;
    services: TwinVPSService[];
}
export interface TwinResourceMetric {
    used: number;
    total: number;
    unit: string;
    trend?: number;
}
export interface TwinVPSService {
    name: string;
    status: 'RUNNING' | 'STOPPED' | 'FAILED';
    port?: number;
    protocol?: string;
}
export interface TwinContainer {
    id: string;
    name: string;
    image: string;
    status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'RESTARTING' | 'ERROR' | 'DEAD';
    ports: TwinContainerPort[];
    resources: TwinContainerResources;
    health: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
}
export interface TwinContainerPort {
    hostPort: number;
    containerPort: number;
    protocol: string;
}
export interface TwinContainerResources {
    cpuLimit: number;
    memoryLimitMb: number;
    cpuUsage: number;
    memoryUsageMb: number;
}
export interface TwinDatabase {
    id: string;
    type: string;
    host: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
    size: number;
    connections: number;
    replication: TwinDatabaseReplication;
}
export interface TwinDatabaseReplication {
    enabled: boolean;
    role: 'PRIMARY' | 'REPLICA' | 'NONE';
    replicaCount: number;
    replicationLagMs?: number;
}
export interface TwinAPI {
    id: string;
    name: string;
    endpoint: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    latency: number;
    rateLimit: TwinAPIRateLimit;
    authType?: string;
}
export interface TwinAPIRateLimit {
    maxRequests: number;
    windowSeconds: number;
    currentUsage: number;
}
export interface TwinGitRepo {
    id: string;
    name: string;
    url: string;
    branch: string;
    lastCommit: TwinGitCommit;
    status: 'CLEAN' | 'DIRTY' | 'AHEAD' | 'BEHIND' | 'DIVERGED';
}
export interface TwinGitCommit {
    hash: string;
    message: string;
    author: string;
    timestamp: string;
}
export interface TwinCloudService {
    id: string;
    provider: string;
    service: string;
    region: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';
    cost: number;
    config?: Record<string, unknown>;
}
export interface TwinBrowser {
    id: string;
    type: string;
    version: string;
    sessions: TwinBrowserSession[];
    status: 'READY' | 'BUSY' | 'CRASHED' | 'CLOSED';
}
export interface TwinBrowserSession {
    sessionId: string;
    currentUrl?: string;
    status: 'ACTIVE' | 'IDLE' | 'CLOSED';
    tabCount: number;
}
export declare enum TimeGranularity {
    MOMENT = "MOMENT",
    HOUR = "HOUR",
    DAY = "DAY",
    WEEK = "WEEK",
    MONTH = "MONTH",
    QUARTER = "QUARTER",
    YEAR = "YEAR",
    PROJECT = "PROJECT",
    ARCHIVE = "ARCHIVE"
}
export interface TemporalMemoryEntry {
    id: string;
    agentId: string;
    content: string;
    timestamp: string;
    timeGranularity: TimeGranularity;
    project: string;
    tags: string[];
    importance: number;
    accessCount: number;
    embedding?: number[];
    memoryType?: 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL';
    relatedEntries?: string[];
}
export interface TemporalQuery {
    from: string;
    to: string;
    granularity: TimeGranularity;
    agentId?: string;
    project?: string;
    tags?: string[];
    importanceThreshold?: number;
    limit: number;
    searchText?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export declare enum ResourceType {
    LLM = "LLM",
    BROWSER = "BROWSER",
    GPU = "GPU",
    WORKER = "WORKER",
    DATABASE = "DATABASE",
    CACHE = "CACHE",
    QUEUE = "QUEUE",
    STORAGE = "STORAGE"
}
export interface ResourceAllocation {
    id: string;
    taskId: string;
    agentId: string;
    resourceType: ResourceType;
    provider: string;
    config: Record<string, unknown>;
    costEstimate: number;
    allocatedAt: string;
    releasedAt?: string;
    status?: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'FAILED';
}
export interface ResourceCandidate {
    resourceType: ResourceType;
    provider: string;
    config: Record<string, unknown>;
    costPerUnit: number;
    latencyMs: number;
    availability: number;
    quality: number;
    maxCapacity?: number;
    currentLoad?: number;
    region?: string;
}
export interface ObservabilitySnapshot {
    timestamp: string;
    logs: ObservabilityLogEntry[];
    metrics: ObservabilityMetric[];
    traces: ObservabilityTrace[];
    eqiScore: number;
    memory: ObservabilitySubsystemHealth;
    browser: ObservabilitySubsystemHealth;
    agentHealth: ObservabilityAgentHealth[];
    cpu: ObservabilityResourceHealth;
    gpu: ObservabilityResourceHealth;
    redis: ObservabilitySubsystemHealth;
    rabbitmq: ObservabilitySubsystemHealth;
    postgresql: ObservabilitySubsystemHealth;
}
export interface ObservabilityMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: string;
    labels: Record<string, string>;
}
export interface ObservabilityLogEntry {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
    message: string;
    timestamp: string;
    source: string;
    traceId?: string;
    data?: Record<string, unknown>;
}
export interface ObservabilityTrace {
    traceId: string;
    name: string;
    startedAt: string;
    durationMs: number;
    spanCount: number;
    status: 'OK' | 'ERROR' | 'TIMEOUT';
}
export interface ObservabilitySubsystemHealth {
    name: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    latencyMs: number;
    errorRate: number;
    uptimePercent: number;
    details?: Record<string, unknown>;
}
export interface ObservabilityResourceHealth {
    name: string;
    utilization: number;
    temperature?: number;
    available: number;
    total: number;
    unit: string;
}
export interface ObservabilityAgentHealth {
    agentId: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE';
    lastHeartbeatAt: string;
    activeTasks: number;
    recentErrors: number;
    memoryUsageMb: number;
}
export declare enum FailureType {
    CRASH = "CRASH",
    TIMEOUT = "TIMEOUT",
    OOM = "OOM",
    CIRCUIT_BREAKER_OPEN = "CIRCUIT_BREAKER_OPEN",
    HEALTH_CHECK_FAILED = "HEALTH_CHECK_FAILED",
    UNHANDLED_EXCEPTION = "UNHANDLED_EXCEPTION",
    DEADLOCK = "DEADLOCK"
}
export declare enum RecoveryStrategy {
    RESTART = "RESTART",
    RESTORE_MEMORY_RESUME = "RESTORE_MEMORY_RESUME",
    FAILOVER = "FAILOVER",
    SCALE_OUT = "SCALE_OUT",
    DEGRADE = "DEGRADE",
    QUARANTINE = "QUARANTINE"
}
export interface AutoRecoveryAction {
    id: string;
    agentId: string;
    failureType: FailureType;
    detectionTime: string;
    recoveryStrategy: RecoveryStrategy;
    status: 'DETECTED' | 'RECOVERING' | 'RECOVERED' | 'FAILED' | 'ESCALATED';
    attempts: number;
    result?: string;
    recoveryTime?: string;
    failureDetails?: string;
    context?: Record<string, unknown>;
}
export interface MarketplacePlugin {
    id: string;
    name: string;
    version: string;
    description: string;
    cluster: string;
    author: string;
    homepage?: string;
    repository?: string;
    capabilities: string[];
    dependencies: PluginDependency[];
    installed: boolean;
    installedAt?: string;
    enabled: boolean;
    config: Record<string, unknown>;
    rating: number;
    downloads: number;
    license?: string;
    minOsVersion?: string;
}
export interface PluginDependency {
    name: string;
    versionRange: string;
    optional: boolean;
}
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    cluster: string;
    author: string;
    homepage?: string;
    repository?: string;
    capabilities: string[];
    dependencies: PluginDependency[];
    installed: boolean;
    installedAt?: string;
    enabled: boolean;
    config: Record<string, unknown>;
    rating: number;
    downloads: number;
    manifestVersion: string;
    entryPoint: string;
    permissions: string[];
    checksum?: string;
}
export interface LongHorizonPlan {
    id: string;
    missionId: string;
    levels: PlanningLevel[];
    totalEstimatedDurationMs: number;
    resourceRequirements: SimulationResourceRequirement[];
    riskAssessment: RiskLevel;
    simulationResult?: SimulationResult;
    status?: MissionStatus;
    version?: number;
    createdAt?: string;
}
export interface PlanningLevel {
    level: number;
    name: string;
    objectives: string[];
    subPlans: LongHorizonPlan[];
    taskGraph: MissionTaskGraph;
    dependencies: string[];
    estimatedDurationMs?: number;
    confidence?: number;
}
