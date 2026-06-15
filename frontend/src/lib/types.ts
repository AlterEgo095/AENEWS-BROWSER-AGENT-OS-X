// Mission Category Types
export enum MissionCategory {
  RESEARCH_ANALYSIS = 'research-analysis',
  CONTENT_CREATION = 'content-creation',
  CODE_DEVELOPMENT = 'code-development',
  SECURITY_OPS = 'security-ops',
  STEALTH_OPERATIONS = 'stealth-operations',
  BUSINESS_INTELLIGENCE = 'business-intelligence',
  MARKETING_GROWTH = 'marketing-growth',
  INFRASTRUCTURE_MGMT = 'infrastructure-mgmt',
  AUTOMATION_WORKFLOW = 'automation-workflow',
  DOCUMENT_PROCESSING = 'document-processing',
  AI_ORCHESTRATION = 'ai-orchestration',
  SYSTEM_ADMINISTRATION = 'system-administration',
  DATA_ENGINEERING = 'data-engineering',
  COMMUNICATION_OPS = 'communication-ops',
  ADVANCED_REASONING = 'advanced-reasoning',
}

// Credit Types
export interface CreditInfo {
  balance: number;
  totalUsed: number;
  totalPurchased: number;
  transactions: CreditTransaction[];
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'admin_add' | 'admin_deduct' | 'bonus';
  description: string;
  createdAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

// Agent Types
export enum ClusterType {
  BROWSER = 'browser',
  COMPUTER = 'computer',
  CODING = 'coding',
  OFFICE = 'office',
  MARKETING = 'marketing',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  META_INTELLIGENCE = 'meta-intelligence',
  // Phase 2 — Intelligence Clusters
  LLM_INTELLIGENCE = 'llm-intelligence',
  INTELLIGENT_ORCHESTRATION = 'intelligent-orchestration',
  WATCHDOG = 'watchdog',
  SELF_EVOLUTION = 'self-evolution',
  CERTIFICATION = 'certification',
  STEALTH_OPS = 'stealth-ops',
  // Phase 3 — Data & Communication Clusters
  DATA_INTELLIGENCE = 'data-intelligence',
  COMMUNICATION = 'communication',
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}

export interface Agent {
  id: string;
  name: string;
  cluster: ClusterType;
  status: AgentStatus;
  config: Record<string, unknown>;
  capabilities: string[];
  tenantId: string;
  version: string;
  description: string | null;
  isEnabled: boolean;
  lastExecutionAt: string | null;
  createdAt: string;
  updatedAt: string;
  missionCategories: MissionCategory[];
  creditCost: number;
  powerLevel: number; // 1=standard, 2=advanced, 3=elite
  tier: string; // 'standard', 'advanced', 'elite', 'stealth'
}

export interface ClusterStats {
  cluster: ClusterType;
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  agents: Agent[];
}

// Task Types
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export interface Task {
  id: string;
  type: string;
  agentId: string | null;
  tenantId: string;
  status: TaskStatus;
  priority: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  parentTaskId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Event {
  id: string;
  type: string;
  namespace: string;
  payload: Record<string, unknown>;
  source: string;
  severity: EventSeverity;
  tenantId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Health Types
export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, HealthCheckDetail>;
  error?: Record<string, HealthCheckDetail>;
  details?: Record<string, HealthCheckDetail>;
}

export interface HealthCheckDetail {
  status: string;
  [key: string]: unknown;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantSlug?: string;
}

/**
 * Response from login/register endpoints.
 *
 * Security model:
 *   - Access token: returned in JSON body (stored in memory only on the frontend)
 *   - Refresh token: set as httpOnly cookie by the backend (NOT in the response body)
 */
export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Response when login requires 2FA verification.
 * The client must submit the tempToken along with a TOTP code
 * to the /auth/login/2fa endpoint to complete authentication.
 */
export interface Auth2faRequiredResponse {
  requires2FA: true;
  tempToken: string;
  message: string;
}

/**
 * Response from the /auth/refresh endpoint.
 * A new access token is issued; the refresh cookie is rotated automatically.
 */
export interface AuthRefreshResponse {
  accessToken: string;
}

// Mission Types
export enum MissionState {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RESEARCH = 'RESEARCH',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  AUDITING = 'AUDITING',
  CERTIFYING = 'CERTIFYING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum MissionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  state: MissionState;
  priority: MissionPriority;
  progress: number;
  objectives: any[];
  constraints: string[];
  requiredCapabilities: string[];
  result: any;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Phase 8 — Intelligent Orchestration Types
export type CollaborationPattern =
  | 'delegation'
  | 'handoff'
  | 'parallel'
  | 'pipeline'
  | 'consensus'
  | 'swarm';

export interface CollaborationResult {
  id: string;
  pattern: CollaborationPattern;
  description: string;
  objectives: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  participants: string[];
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DecompositionResult {
  id: string;
  missionId: string | null;
  description: string;
  objectives: string[];
  subTasks: DecomposedTask[];
  strategy: string;
  estimatedDuration: string | null;
  createdAt: string;
}

export interface DecomposedTask {
  id: string;
  title: string;
  description: string;
  cluster: ClusterType;
  priority: MissionPriority;
  dependencies: string[];
  estimatedEffort: string;
  status: 'pending' | 'assigned' | 'running' | 'completed';
}

export interface CoordinationResult {
  id: string;
  taskIds: string[];
  strategy: string;
  status: 'pending' | 'coordinating' | 'completed' | 'failed';
  assignments: TaskAssignment[];
  timeline: CoordinationTimeline | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  cluster: ClusterType;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface CoordinationTimeline {
  phases: CoordinationPhase[];
  estimatedTotalDuration: string;
}

export interface CoordinationPhase {
  name: string;
  taskIds: string[];
  startAfter: string | null;
  estimatedDuration: string;
}

export interface UnifiedConnectorInfo {
  id: string;
  name: string;
  type: string;
  mode: 'active' | 'passive' | 'hybrid';
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  health: number; // 0-100
  capabilities: string[];
  lastActivityAt: string | null;
  metadata: Record<string, unknown>;
  hitRate: number; // percentage
  totalExecutions: number;
  successRate: number; // percentage
}

export interface ClusterHealthInfo {
  cluster: ClusterType;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  health: number; // 0-100
  activeAgents: number;
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number; // ms
  lastCheckedAt: string;
}

export interface OrchestrationStatistics {
  totalCollaborations: number;
  activeCollaborations: number;
  totalDecompositions: number;
  totalCoordinations: number;
  avgDecompositionTime: number; // ms
  avgCoordinationTime: number; // ms
  connectorStats: ConnectorStat[];
  patternUsage: Record<CollaborationPattern, number>;
}

export interface ConnectorStat {
  connectorId: string;
  connectorName: string;
  hitRate: number;
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
}

export interface OrchestrationHistoryItem {
  id: string;
  type: 'collaboration' | 'decomposition' | 'coordination';
  description: string;
  status: string;
  pattern?: CollaborationPattern;
  createdAt: string;
  completedAt: string | null;
}

// Phase 9 — Adaptive Intelligence & Knowledge System Types

export interface GraphStatistics {
  nodeCounts: Record<string, number>;
  relationshipCounts: Record<string, number>;
  neo4jAvailable: boolean;
  topAgents: ExpertiseRanking[];
  topPatterns: PatternKnowledgeInfo[];
}

export interface ExpertiseRanking {
  agentId: string;
  name: string;
  cluster: ClusterType;
  expertiseScore: number;
  missionCount: number;
  successRate: number;
  avgDurationMs: number;
  topCapabilities: string[];
}

export interface PatternKnowledgeInfo {
  id: string;
  name: string;
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern' | 'collaboration';
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: number;
}

export interface StrategyRecommendation {
  strategyId: string;
  strategyName: string;
  confidence: number;
  reason: string;
  expectedSuccessRate: number;
  parameters: Record<string, unknown>;
}

export interface LearningStatistics {
  totalProfiles: number;
  totalLearnings: number;
  totalInsights: number;
  avgReward: number;
  topStrategies: Array<{ strategy: string; avgQ: number }>;
  clusterBreakdown: Record<string, number>;
}

export interface LearningInsight {
  id: string;
  type: string;
  description: string;
  confidence: number;
  affectedAgents: string[];
  suggestedActions: string[];
  supportingEvidence: number;
  createdAt: number;
}

export interface PatternMiningStatistics {
  totalPatterns: number;
  totalExecutions: number;
  categoryBreakdown: Record<string, number>;
  avgConfidence: number;
  topPatterns: DiscoveredPattern[];
}

export interface DiscoveredPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  frequency: number;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  impactScore: number;
  suggestedActions: string[];
}

export interface CorrelationFinding {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
  description: string;
}

export interface AdaptiveConfig {
  id: string;
  version: number;
  strategyPreferences: Record<string, number>;
  agentSelectionWeights: Record<string, number>;
  timeouts: Record<string, number>;
  retryPolicy: Record<string, unknown>;
  pinned: string[];
}

export interface AdaptiveStatistics {
  configVersion: number;
  totalAdaptations: number;
  appliedCount: number;
  improvedCount: number;
  degradedCount: number;
  pinnedParameters: string[];
  lastAdaptationAt: number;
}

export interface ExperienceStatistics {
  totalExperiences: number;
  successCount: number;
  failureCount: number;
  totalInsights: number;
  avgDurationMs: number;
  clusterBreakdown: Record<string, number>;
}

export interface FeedbackStatistics {
  totalEntries: number;
  totalAggregated: number;
  totalActions: number;
  avgScore: number;
  sourceBreakdown: Record<string, number>;
  recentTrend: 'improving' | 'degrading' | 'stable';
}

export interface FeedbackSummary {
  totalFeedback: number;
  avgScore: number;
  sourceDistribution: Record<string, number>;
  topIssues: Array<{ description: string; count: number }>;
  topPraise: Array<{ description: string; count: number }>;
  trendDirection: 'improving' | 'degrading' | 'stable';
}

export interface ActionItem {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedAgents: string[];
  affectedClusters: ClusterType[];
  estimatedImpact: number;
  createdAt: number;
}

// Phase 10 — Swarm Intelligence Types

export type SwarmTopologyType = 'star' | 'mesh' | 'ring' | 'tree' | 'custom';

export interface SwarmInfo {
  id: string;
  name: string;
  objective: string;
  topology: SwarmTopologyType;
  agentIds: string[];
  status: 'initializing' | 'active' | 'converging' | 'completed' | 'failed';
  convergenceScore: number;
  emergentBehaviors: string[];
  pheromoneTrails: Record<string, number>;
  iterationsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface SwarmMetrics {
  totalSwarms: number;
  activeSwarms: number;
  avgConvergenceScore: number;
  totalEmergentBehaviors: number;
  totalPheromoneTrails: number;
  topologyDistribution: Record<SwarmTopologyType, number>;
}

export interface ConsensusSession {
  id: string;
  topic: string;
  proposerId: string;
  participantIds: string[];
  status: 'pending' | 'voting' | 'completed' | 'failed' | 'timeout';
  consensusThreshold: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  byzantineDetected: boolean;
  byzantineAgents: string[];
  result: Record<string, unknown> | null;
  dissentRecords: DissentRecord[];
  createdAt: string;
  completedAt: string | null;
}

export interface DissentRecord {
  agentId: string;
  reason: string;
  alternativeProposal: string | null;
  timestamp: string;
}

export interface CollaborationSession {
  id: string;
  name: string;
  participantIds: string[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  sharedWorkspace: Record<string, unknown>;
  checkpoints: Checkpoint[];
  lastActivityAt: string;
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  label: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface WorkingMemorySession {
  id: string;
  name: string;
  participants: string[];
  blackboard: Record<string, unknown>;
  scratchpads: Record<string, Record<string, unknown>>;
  sharedWorkspace: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackLoopParams {
  id: string;
  version: number;
  parameters: Record<string, number>;
  learningRate: number;
  decayRate: number;
  momentum: number;
  lastAdjustmentAt: string;
}

export interface FeedbackCycleResult {
  cycleId: string;
  adjustmentsCount: number;
  improvementScore: number;
  appliedAt: string;
}

export interface FeedbackAdjustment {
  id: string;
  parameter: string;
  oldValue: number;
  newValue: number;
  reason: string;
  cycleId: string;
  appliedAt: string;
  rolledBack: boolean;
}

export interface TopologyInfo {
  id: string;
  name: string;
  type: SwarmTopologyType;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  metrics: TopologyMetrics;
  createdAt: string;
}

export interface TopologyNode {
  id: string;
  agentId: string;
  isolated: boolean;
  isolatedAt: string | null;
}

export interface TopologyEdge {
  source: string;
  target: string;
  weight: number;
}

export interface TopologyMetrics {
  avgDegree: number;
  clusteringCoeff: number;
  diameter: number;
  isConnected: boolean;
  isolatedNodes: number;
}

export interface DAGExecution {
  id: string;
  name: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
}

export interface DAGNode {
  id: string;
  label: string;
  agentId: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

export interface DAGEdge {
  source: string;
  target: string;
  condition?: string;
}

export interface DAGTrace {
  executionId: string;
  steps: DAGTraceStep[];
  totalDurationMs: number;
}

export interface DAGTraceStep {
  nodeId: string;
  nodeLabel: string;
  agentId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  output: Record<string, unknown> | null;
}

// ─── Phase 13: Performance Types ────────────────────────────

export interface PerformanceOverview {
  profiling: PerformanceReport;
  slowQueries: SlowQueryStats;
  pools: PoolStats[];
  cache: CacheStats;
  compression: CompressionStats;
  poolRecommendations: PoolRecommendation[];
}

export interface PerformanceReport {
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    heapUtilization: string;
    gcPauseEstimate: string;
  };
  cpu: {
    userMs: number;
    systemMs: number;
    utilizationPercent: string;
  };
  eventLoop: {
    currentLagMs: number;
    p50LagMs: number;
    p95LagMsMs: number;
    p99LagMs: number;
  };
  activeSpans: number;
  topSlowSpans: Array<{ name: string; avgMs: number; count: number }>;
  recommendations: string[];
}

export interface SlowQueryStats {
  totalSlowQueries: number;
  averageDurationMs: number;
  maxDurationMs: number;
  p95DurationMs: number;
  bySchema: Record<string, { count: number; avgMs: number }>;
  thresholdMs: number;
}

export interface PoolStats {
  name: string;
  active: number;
  idle: number;
  max: number;
  waiting: number;
  totalAcquired: number;
  totalReleased: number;
  totalTimeouts: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  hitRate: string;
  memorySize: number;
}

export interface CompressionStats {
  totalCompressed: number;
  totalBytesSaved: number;
  averageRatio: number;
  enabled: boolean;
  threshold: number;
}

export interface PoolRecommendation {
  pool: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'critical';
}
