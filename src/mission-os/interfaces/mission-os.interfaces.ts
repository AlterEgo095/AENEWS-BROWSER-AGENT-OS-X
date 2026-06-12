/**
 * Mission OS Core Interfaces
 * AENEWS Agent OS X Project
 *
 * Comprehensive TypeScript definitions for the Mission OS layer,
 * covering capability registration, skill profiling, world modeling,
 * constitutional governance, mission planning, digital twins,
 * temporal memory, resource management, observability, auto-recovery,
 * marketplace plugins, and long-horizon planning.
 */

// ============================================================================
// SECTION 1: CAPABILITY REGISTRATION
// ============================================================================

/**
 * Represents a payload submitted when an agent registers its capabilities
 * with the Mission OS capability registry.
 */
export interface CapabilityRegistration {
  /** Unique identifier of the registering agent */
  agentId: string;
  /** List of capabilities this agent provides */
  capabilities: CapabilityDescriptor[];
  /** Timestamp of the registration event */
  registeredAt: string;
  /** Optional agent metadata (name, version, runtime, etc.) */
  agentMetadata?: Record<string, unknown>;
}

/**
 * Full description of a single capability exposed by an agent,
 * including schemas, versioning, and cost/latency estimates.
 */
export interface CapabilityDescriptor {
  /** Human-readable capability name (e.g., "web-search", "code-generation") */
  name: string;
  /** Detailed description of what this capability does */
  description: string;
  /** JSON Schema describing the expected input shape */
  inputSchema: Record<string, unknown>;
  /** JSON Schema describing the output shape */
  outputSchema: Record<string, unknown>;
  /** Semantic version of this capability (e.g., "1.2.0") */
  version: string;
  /** Whether this capability is deprecated and slated for removal */
  deprecated: boolean;
  /** Estimated cost per invocation (in USD or internal credits) */
  costEstimate: number;
  /** Estimated latency in milliseconds for a typical invocation */
  latencyEstimate: number;
  /** Optional tags for categorization and discovery */
  tags?: string[];
  /** Optional deprecation message with migration guidance */
  deprecationMessage?: string;
  /** Required permissions or roles to invoke this capability */
  requiredPermissions?: string[];
}

// ============================================================================
// SECTION 2: SKILL PROFILING
// ============================================================================

/**
 * Skill level classification for agent proficiency.
 */
export enum SkillLevel {
  NOVICE = 'NOVICE',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER',
}

/**
 * Per-agent skill profile that tracks competence, cost, latency,
 * and improvement trends across all registered skills.
 */
export interface SkillProfile {
  /** Unique identifier of the agent this profile belongs to */
  agentId: string;
  /** Array of individual skill entries */
  skills: SkillEntry[];
  /** Overall composite score across all skills (0.0 - 1.0) */
  overallScore?: number;
  /** Timestamp of the last profile update */
  lastUpdatedAt?: string;
}

/**
 * A single skill entry within an agent's skill profile,
 * capturing proficiency level, performance metrics, and trend data.
 */
export interface SkillEntry {
  /** Name of the skill (e.g., "typescript", "database-design") */
  name: string;
  /** Proficiency level classification */
  level: SkillLevel;
  /** Cost per execution in USD or internal credits */
  costPerExecution: number;
  /** Average latency in milliseconds */
  avgLatencyMs: number;
  /** Success rate as a fraction (0.0 - 1.0) */
  successRate: number;
  /** Total number of executions recorded */
  executionCount: number;
  /** ISO-8601 timestamp of the most recent execution */
  lastExecutedAt: string;
  /** Trend direction for improvement: positive = improving, negative = degrading */
  improvementTrend: number;
  /** Optional confidence score for this skill measurement (0.0 - 1.0) */
  confidence?: number;
}

// ============================================================================
// SECTION 3: WORLD MODEL STATE
// ============================================================================

/**
 * Global world representation that maintains the current state of
 * the user, project, objectives, constraints, and knowledge base.
 */
export interface WorldModelState {
  /** Currently authenticated user context */
  currentUser: WorldUser;
  /** Currently active project context */
  currentProject: WorldProject;
  /** Environmental context (locale, timezone, device, etc.) */
  context: WorldContext;
  /** Active objectives the system is pursuing */
  objectives: WorldObjective[];
  /** Active constraints governing system behavior */
  constraints: WorldConstraint[];
  /** Historical events and state transitions */
  history: WorldHistory;
  /** Aggregated knowledge base entries */
  knowledgeBase: WorldKnowledgeBase;
  /** Real-time events currently unfolding */
  currentEvents: WorldEvent[];
  /** Overall system state summary */
  systemState: WorldSystemState;
}

/**
 * Represents the current user in the world model.
 */
export interface WorldUser {
  /** Unique user identifier */
  id: string;
  /** Display name */
  name: string;
  /** Email address */
  email?: string;
  /** Assigned roles */
  roles: string[];
  /** User preferences */
  preferences: Record<string, unknown>;
  /** Active sessions */
  activeSessions: number;
}

/**
 * Represents the current project in the world model.
 */
export interface WorldProject {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Repository URL if applicable */
  repositoryUrl?: string;
  /** Tech stack identifiers */
  techStack: string[];
  /** Project root path on disk */
  rootPath?: string;
  /** Environment (development, staging, production) */
  environment: string;
}

/**
 * Environmental context information.
 */
export interface WorldContext {
  /** Current locale (e.g., "en-US") */
  locale: string;
  /** Current timezone (e.g., "America/New_York") */
  timezone: string;
  /** Device type (desktop, mobile, server) */
  deviceType: string;
  /** Current date-time as ISO-8601 */
  currentDateTime: string;
  /** Whether the system is in quiet hours */
  quietHours: boolean;
  /** Network connectivity status */
  networkStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  /** Additional context metadata */
  metadata: Record<string, unknown>;
}

/**
 * An objective the world model is pursuing.
 */
export interface WorldObjective {
  /** Unique objective identifier */
  id: string;
  /** Human-readable description of the objective */
  description: string;
  /** Priority level for this objective */
  priority: number;
  /** Current status of the objective */
  status: ObjectiveStatus;
  /** Target completion date as ISO-8601 */
  targetDate?: string;
  /** Progress as a fraction (0.0 - 1.0) */
  progress: number;
  /** Nested sub-objectives */
  subObjectives: WorldObjective[];
  /** Agent IDs assigned to this objective */
  assignedAgents?: string[];
  /** Key-value metrics for this objective */
  metrics?: Record<string, number>;
}

/**
 * Status of a world objective.
 */
export enum ObjectiveStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

/**
 * A constraint governing system behavior.
 */
export interface WorldConstraint {
  /** Unique constraint identifier */
  id: string;
  /** Constraint name */
  name: string;
  /** Detailed description of the constraint */
  description: string;
  /** Constraint type (e.g., "budget", "time", "resource", "policy") */
  type: string;
  /** Whether this constraint is currently active */
  active: boolean;
  /** Constraint parameters */
  parameters: Record<string, unknown>;
}

/**
 * Historical record of world state transitions and events.
 */
export interface WorldHistory {
  /** Recent state transitions */
  transitions: WorldStateTransition[];
  /** Total events recorded */
  totalEvents: number;
  /** Oldest recorded event timestamp */
  oldestEventAt?: string;
  /** Newest recorded event timestamp */
  newestEventAt?: string;
}

/**
 * A single state transition in world history.
 */
export interface WorldStateTransition {
  /** Timestamp of the transition */
  timestamp: string;
  /** Transition type */
  type: string;
  /** Description of what changed */
  description: string;
  /** Agent or system that triggered the transition */
  triggeredBy: string;
  /** Before-state snapshot (partial) */
  beforeState?: Record<string, unknown>;
  /** After-state snapshot (partial) */
  afterState?: Record<string, unknown>;
}

/**
 * Aggregated knowledge base for the world model.
 */
export interface WorldKnowledgeBase {
  /** Total number of entries */
  entryCount: number;
  /** Knowledge domains covered */
  domains: string[];
  /** Last knowledge base update timestamp */
  lastUpdatedAt: string;
  /** Index version for cache invalidation */
  indexVersion: string;
}

/**
 * A real-time event in the world model.
 */
export interface WorldEvent {
  /** Unique event identifier */
  id: string;
  /** Event type (e.g., "deployment", "alert", "user-action") */
  type: string;
  /** Event description */
  description: string;
  /** Event timestamp */
  timestamp: string;
  /** Severity of the event */
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  /** Related agent IDs */
  relatedAgents?: string[];
  /** Event payload */
  payload?: Record<string, unknown>;
}

/**
 * Overall system state summary within the world model.
 */
export interface WorldSystemState {
  /** Overall health status */
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'CRITICAL';
  /** Uptime in seconds */
  uptimeSeconds: number;
  /** Active mission count */
  activeMissions: number;
  /** Active agent count */
  activeAgents: number;
  /** System load average (0.0 - 1.0) */
  loadAverage: number;
  /** Pending approval count */
  pendingApprovals: number;
  /** Last state update timestamp */
  lastUpdatedAt: string;
}

// ============================================================================
// SECTION 4: CONSTITUTIONAL GOVERNANCE
// ============================================================================

/**
 * Classification of constitutional rule types.
 */
export enum RuleType {
  PROHIBITION = 'PROHIBITION',
  REQUIREMENT = 'REQUIREMENT',
  CONSTRAINT = 'CONSTRAINT',
  GUIDELINE = 'GUIDELINE',
}

/**
 * Severity levels for constitutional rules.
 */
export enum RuleSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Enforcement mechanisms for constitutional rules.
 */
export enum RuleEnforcement {
  BLOCK = 'BLOCK',
  WARN = 'WARN',
  LOG = 'LOG',
}

/**
 * A permanent rule in the constitutional governance layer that
 * governs agent behavior and system operations.
 */
export interface ConstitutionalRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Detailed description of the rule and its purpose */
  description: string;
  /** Classification of the rule type */
  ruleType: RuleType;
  /** Severity level of the rule */
  severity: RuleSeverity;
  /** How this rule is enforced when violated */
  enforcement: RuleEnforcement;
  /** Conditions under which this rule applies (evaluated expression) */
  conditions: string[];
  /** Whether this rule is currently active */
  isActive: boolean;
  /** Timestamp when the rule was created */
  createdAt: string;
  /** Timestamp when the rule was last updated */
  updatedAt: string;
  /** Optional rule category for grouping */
  category?: string;
  /** Optional audit trail of rule changes */
  changeLog?: ConstitutionalRuleChange[];
}

/**
 * A change entry in a constitutional rule's audit trail.
 */
export interface ConstitutionalRuleChange {
  /** Timestamp of the change */
  timestamp: string;
  /** Who or what initiated the change */
  changedBy: string;
  /** Description of the change */
  description: string;
  /** Previous value snapshot */
  previousValue?: Record<string, unknown>;
}

/**
 * Record of a constitutional rule violation by an agent.
 */
export interface ConstitutionalViolation {
  /** The rule that was violated */
  ruleId: string;
  /** The agent that committed the violation */
  agentId: string;
  /** The action that triggered the violation */
  action: string;
  /** Timestamp of the violation */
  timestamp: string;
  /** Whether the action was blocked by enforcement */
  blocked: boolean;
  /** Detailed reason for the violation */
  reason: string;
  /** Unique violation identifier */
  id?: string;
  /** Additional context about the violation */
  context?: Record<string, unknown>;
}

// ============================================================================
// SECTION 5: MISSION DEFINITION & PLANNING
// ============================================================================

/**
 * Status of a mission through its lifecycle.
 */
export enum MissionStatus {
  DRAFT = 'DRAFT',
  SIMULATING = 'SIMULATING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Full mission definition encompassing objectives, task graphs,
 * dependencies, and execution metadata.
 */
export interface MissionDefinition {
  /** Unique mission identifier */
  id: string;
  /** Human-readable mission name */
  name: string;
  /** Detailed mission description */
  description: string;
  /** Current lifecycle status */
  status: MissionStatus;
  /** Mission-level objectives */
  objectives: MissionObjective[];
  /** Task dependency graph for execution planning */
  taskGraph: MissionTaskGraph;
  /** Dependency graph representation */
  dependencyGraph: Record<string, string[]>;
  /** Execution graph for runtime tracking */
  executionGraph: MissionExecutionGraph;
  /** Result graph capturing output artifacts */
  resultGraph: MissionResultGraph;
  /** Mission priority (higher = more important) */
  priority: number;
  /** Agent or user who created the mission */
  createdBy: string;
  /** Timestamp when the mission was created */
  createdAt: string;
  /** Timestamp when the mission was last updated */
  updatedAt: string;
  /** Timestamp when mission execution started */
  startedAt?: string;
  /** Timestamp when mission execution completed */
  completedAt?: string;
  /** Arbitrary metadata for extensibility */
  metadata: Record<string, unknown>;
}

/**
 * An objective within a mission.
 */
export interface MissionObjective {
  /** Unique objective identifier */
  id: string;
  /** Parent mission identifier */
  missionId: string;
  /** Detailed description of the objective */
  description: string;
  /** Current objective status */
  status: ObjectiveStatus;
  /** Nested sub-objectives */
  subObjectives: MissionObjective[];
  /** Agent IDs assigned to this objective */
  assignedAgents: string[];
  /** Task IDs associated with this objective */
  taskIds: string[];
  /** Progress as a fraction (0.0 - 1.0) */
  progress: number;
  /** Target completion date */
  targetDate?: string;
  /** Objective-specific metrics */
  metrics?: Record<string, number>;
}

/**
 * Task graph representing the full DAG of tasks within a mission.
 */
export interface MissionTaskGraph {
  /** Array of task nodes */
  nodes: MissionTaskNode[];
  /** Array of directed edges between tasks */
  edges: MissionTaskEdge[];
  /** Ordered list of node IDs on the critical path */
  criticalPath: string[];
}

/**
 * A single task node in the mission task graph.
 */
export interface MissionTaskNode {
  /** Unique task node identifier */
  id: string;
  /** Task type (e.g., "computation", "io", "approval", "notification") */
  type: string;
  /** Agent ID assigned to execute this task */
  agentId: string;
  /** Required capability to execute this task */
  capability: string;
  /** IDs of tasks this task depends on */
  dependencies: string[];
  /** Estimated execution duration in milliseconds */
  estimatedDurationMs: number;
  /** Actual execution duration in milliseconds (post-execution) */
  actualDurationMs?: number;
  /** Current task status */
  status: MissionStatus;
  /** Task input parameters */
  input?: Record<string, unknown>;
  /** Task output results */
  output?: Record<string, unknown>;
  /** Retry count */
  retryCount?: number;
  /** Maximum allowed retries */
  maxRetries?: number;
}

/**
 * Type of dependency between two task nodes.
 */
export enum TaskEdgeType {
  HARD_DEPENDENCY = 'HARD_DEPENDENCY',
  SOFT_DEPENDENCY = 'SOFT_DEPENDENCY',
  RESOURCE_DEPENDENCY = 'RESOURCE_DEPENDENCY',
}

/**
 * A directed edge in the mission task graph.
 */
export interface MissionTaskEdge {
  /** Source task node ID */
  fromId: string;
  /** Target task node ID */
  toId: string;
  /** Type of dependency this edge represents */
  type: TaskEdgeType;
  /** Optional description of the dependency */
  description?: string;
}

/**
 * Execution graph tracking runtime state of mission tasks.
 */
export interface MissionExecutionGraph {
  /** Map of task ID to execution state */
  taskStates: Record<string, MissionTaskExecutionState>;
  /** Currently executing task IDs */
  activeTasks: string[];
  /** Completed task IDs */
  completedTasks: string[];
  /** Failed task IDs */
  failedTasks: string[];
  /** Total elapsed execution time in milliseconds */
  elapsedMs: number;
}

/**
 * Runtime execution state of a single mission task.
 */
export interface MissionTaskExecutionState {
  /** Task node ID */
  taskId: string;
  /** Execution status */
  status: MissionStatus;
  /** Timestamp when execution started */
  startedAt?: string;
  /** Timestamp when execution completed or failed */
  completedAt?: string;
  /** Agent ID currently executing */
  executingAgentId?: string;
  /** Retry attempt number (0 = first attempt) */
  attempt: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Result graph capturing output artifacts of a mission.
 */
export interface MissionResultGraph {
  /** Map of task ID to result artifact references */
  taskResults: Record<string, MissionTaskResult>;
  /** Overall mission result summary */
  missionSummary?: string;
  /** Aggregated mission metrics */
  metrics: Record<string, number>;
}

/**
 * Result artifact from a single mission task.
 */
export interface MissionTaskResult {
  /** Task node ID */
  taskId: string;
  /** Output data from the task */
  output: Record<string, unknown>;
  /** Artifact references (file paths, URLs, etc.) */
  artifacts: string[];
  /** Quality score (0.0 - 1.0) */
  qualityScore?: number;
  /** Timestamp when the result was produced */
  producedAt: string;
}

// ============================================================================
// SECTION 6: SIMULATION & APPROVAL
// ============================================================================

/**
 * Risk level classification for simulation results.
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Result of pre-execution simulation for a mission or action,
 * including cost, time, risk, and resource estimates.
 */
export interface SimulationResult {
  /** Estimated total cost in USD or internal credits */
  costEstimate: number;
  /** Estimated total execution time in milliseconds */
  timeEstimate: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** Probability of success (0.0 - 1.0) */
  successProbability: number;
  /** Identified bottlenecks */
  bottlenecks: SimulationBottleneck[];
  /** Recommendations for improving the plan */
  recommendations: string[];
  /** Required resources and quantities */
  resourceRequirements: SimulationResourceRequirement[];
  /** Simulation model version */
  modelVersion?: string;
  /** Confidence in the simulation result (0.0 - 1.0) */
  confidence?: number;
}

/**
 * A bottleneck identified during simulation.
 */
export interface SimulationBottleneck {
  /** Description of the bottleneck */
  description: string;
  /** Affected task IDs */
  affectedTaskIds: string[];
  /** Severity of the bottleneck */
  severity: RiskLevel;
  /** Suggested mitigation */
  mitigation?: string;
}

/**
 * A resource requirement identified during simulation.
 */
export interface SimulationResourceRequirement {
  /** Resource type needed */
  resourceType: ResourceType;
  /** Estimated quantity needed */
  quantity: number;
  /** Estimated duration of usage in milliseconds */
  durationMs: number;
  /** Estimated cost for this resource */
  estimatedCost: number;
}

/**
 * Classification of approval action types that require human authorization.
 */
export enum ApprovalActionType {
  DELETE = 'DELETE',
  DEPLOY_PRODUCTION = 'DEPLOY_PRODUCTION',
  PAYMENT = 'PAYMENT',
  EMAIL_SEND = 'EMAIL_SEND',
  SOCIAL_MEDIA_POST = 'SOCIAL_MEDIA_POST',
  SSH_ACCESS = 'SSH_ACCESS',
  DNS_CHANGE = 'DNS_CHANGE',
  DATABASE_MIGRATION = 'DATABASE_MIGRATION',
  API_KEY_ROTATION = 'API_KEY_ROTATION',
}

/**
 * Status of an approval request.
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Request for human approval before executing a high-risk action.
 */
export interface ApprovalRequest {
  /** Unique approval request identifier */
  id: string;
  /** Agent ID requesting approval */
  agentId: string;
  /** Description of the action to be approved */
  action: string;
  /** Classification of the action type */
  actionType: ApprovalActionType;
  /** Payload containing action details */
  payload: Record<string, unknown>;
  /** Justification for why this action is needed */
  justification: string;
  /** Risk assessment for this action */
  riskAssessment: RiskLevel;
  /** Current approval status */
  status: ApprovalStatus;
  /** Timestamp when the request was submitted */
  requestedAt: string;
  /** Timestamp when the request was resolved */
  resolvedAt?: string;
  /** Agent or user who approved the request */
  approvedBy?: string;
  /** Reason for rejection if applicable */
  rejectionReason?: string;
  /** Expiration timestamp for this request */
  expiresAt?: string;
  /** Additional context or attachments */
  attachments?: ApprovalAttachment[];
}

/**
 * An attachment to an approval request (e.g., screenshot, log excerpt).
 */
export interface ApprovalAttachment {
  /** Attachment name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** Content (base64-encoded or URL) */
  content: string;
}

// ============================================================================
// SECTION 7: DIGITAL TWIN
// ============================================================================

/**
 * State of the infrastructure digital twin — a mirror of all
 * real-world infrastructure components for simulation and monitoring.
 */
export interface DigitalTwinState {
  /** Unique twin instance identifier */
  id: string;
  /** Timestamp of the last synchronization with real infrastructure */
  lastSyncAt: string;
  /** VPS instances in the twin */
  vps: TwinVPS[];
  /** Container instances in the twin */
  containers: TwinContainer[];
  /** Database instances in the twin */
  databases: TwinDatabase[];
  /** API endpoints in the twin */
  apis: TwinAPI[];
  /** Git repositories in the twin */
  gitRepos: TwinGitRepo[];
  /** Cloud services in the twin */
  cloudServices: TwinCloudService[];
  /** Browser instances in the twin */
  browsers: TwinBrowser[];
  /** Sync status */
  syncStatus: 'SYNCED' | 'SYNCING' | 'STALE' | 'ERROR';
  /** Sync error message if applicable */
  syncError?: string;
}

/**
 * Virtual Private Server representation in the digital twin.
 */
export interface TwinVPS {
  /** Hostname of the VPS */
  host: string;
  /** IP address of the VPS */
  ip: string;
  /** Current status of the VPS */
  status: 'RUNNING' | 'STOPPED' | 'REBOOTING' | 'PROVISIONING' | 'ERROR';
  /** CPU usage metrics */
  cpu: TwinResourceMetric;
  /** Memory usage metrics */
  memory: TwinResourceMetric;
  /** Disk usage metrics */
  disk: TwinResourceMetric;
  /** Operating system information */
  os: string;
  /** Services running on this VPS */
  services: TwinVPSService[];
}

/**
 * Resource metric for a digital twin component.
 */
export interface TwinResourceMetric {
  /** Current usage (e.g., percentage or absolute) */
  used: number;
  /** Total capacity */
  total: number;
  /** Unit of measurement (e.g., "%", "MB", "GB") */
  unit: string;
  /** Usage trend (positive = increasing, negative = decreasing) */
  trend?: number;
}

/**
 * A service running on a VPS in the digital twin.
 */
export interface TwinVPSService {
  /** Service name */
  name: string;
  /** Service status */
  status: 'RUNNING' | 'STOPPED' | 'FAILED';
  /** Service port */
  port?: number;
  /** Protocol */
  protocol?: string;
}

/**
 * Container representation in the digital twin.
 */
export interface TwinContainer {
  /** Unique container identifier */
  id: string;
  /** Container name */
  name: string;
  /** Container image */
  image: string;
  /** Container status */
  status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'RESTARTING' | 'ERROR' | 'DEAD';
  /** Port mappings */
  ports: TwinContainerPort[];
  /** Resource allocations */
  resources: TwinContainerResources;
  /** Health check result */
  health: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
}

/**
 * Port mapping for a container.
 */
export interface TwinContainerPort {
  /** Host port */
  hostPort: number;
  /** Container port */
  containerPort: number;
  /** Protocol */
  protocol: string;
}

/**
 * Resource allocations for a container.
 */
export interface TwinContainerResources {
  /** CPU limit in cores */
  cpuLimit: number;
  /** Memory limit in MB */
  memoryLimitMb: number;
  /** Current CPU usage as a fraction */
  cpuUsage: number;
  /** Current memory usage in MB */
  memoryUsageMb: number;
}

/**
 * Database representation in the digital twin.
 */
export interface TwinDatabase {
  /** Unique database identifier */
  id: string;
  /** Database type (e.g., "postgresql", "mysql", "mongodb", "redis") */
  type: string;
  /** Database host */
  host: string;
  /** Database status */
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
  /** Database size in MB */
  size: number;
  /** Current connection count */
  connections: number;
  /** Replication configuration */
  replication: TwinDatabaseReplication;
}

/**
 * Replication configuration for a database.
 */
export interface TwinDatabaseReplication {
  /** Whether replication is enabled */
  enabled: boolean;
  /** Replication role (primary, replica, etc.) */
  role: 'PRIMARY' | 'REPLICA' | 'NONE';
  /** Number of replicas */
  replicaCount: number;
  /** Replication lag in milliseconds */
  replicationLagMs?: number;
}

/**
 * API endpoint representation in the digital twin.
 */
export interface TwinAPI {
  /** Unique API identifier */
  id: string;
  /** API name */
  name: string;
  /** API endpoint URL */
  endpoint: string;
  /** API status */
  status: 'UP' | 'DOWN' | 'DEGRADED';
  /** Average response latency in milliseconds */
  latency: number;
  /** Rate limit configuration */
  rateLimit: TwinAPIRateLimit;
  /** Authentication type */
  authType?: string;
}

/**
 * Rate limit configuration for an API.
 */
export interface TwinAPIRateLimit {
  /** Maximum requests per time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Current usage count in the window */
  currentUsage: number;
}

/**
 * Git repository representation in the digital twin.
 */
export interface TwinGitRepo {
  /** Unique repository identifier */
  id: string;
  /** Repository name */
  name: string;
  /** Repository URL */
  url: string;
  /** Currently checked-out branch */
  branch: string;
  /** Last commit information */
  lastCommit: TwinGitCommit;
  /** Repository status */
  status: 'CLEAN' | 'DIRTY' | 'AHEAD' | 'BEHIND' | 'DIVERGED';
}

/**
 * Git commit information.
 */
export interface TwinGitCommit {
  /** Commit hash */
  hash: string;
  /** Commit message */
  message: string;
  /** Commit author */
  author: string;
  /** Commit timestamp */
  timestamp: string;
}

/**
 * Cloud service representation in the digital twin.
 */
export interface TwinCloudService {
  /** Unique service identifier */
  id: string;
  /** Cloud provider (e.g., "aws", "gcp", "azure", "cloudflare") */
  provider: string;
  /** Service name (e.g., "s3", "lambda", "cloudfront") */
  service: string;
  /** Deployment region */
  region: string;
  /** Service status */
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';
  /** Monthly cost in USD */
  cost: number;
  /** Service-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Browser instance representation in the digital twin.
 */
export interface TwinBrowser {
  /** Unique browser instance identifier */
  id: string;
  /** Browser type (e.g., "chromium", "firefox", "webkit") */
  type: string;
  /** Browser version */
  version: string;
  /** Active browser sessions */
  sessions: TwinBrowserSession[];
  /** Browser status */
  status: 'READY' | 'BUSY' | 'CRASHED' | 'CLOSED';
}

/**
 * A session within a browser instance.
 */
export interface TwinBrowserSession {
  /** Session identifier */
  sessionId: string;
  /** Current URL */
  currentUrl?: string;
  /** Session status */
  status: 'ACTIVE' | 'IDLE' | 'CLOSED';
  /** Number of open tabs */
  tabCount: number;
}

// ============================================================================
// SECTION 8: TEMPORAL MEMORY
// ============================================================================

/**
 * Time granularity levels for temporal memory indexing.
 */
export enum TimeGranularity {
  MOMENT = 'MOMENT',
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  PROJECT = 'PROJECT',
  ARCHIVE = 'ARCHIVE',
}

/**
 * A single entry in the temporal memory system, indexed by
 * time granularity for efficient retrieval and summarization.
 */
export interface TemporalMemoryEntry {
  /** Unique memory entry identifier */
  id: string;
  /** Agent ID that created this memory */
  agentId: string;
  /** Memory content (text, structured data, or reference) */
  content: string;
  /** Timestamp when this memory was recorded */
  timestamp: string;
  /** Time granularity level for indexing */
  timeGranularity: TimeGranularity;
  /** Associated project identifier */
  project: string;
  /** Tags for categorization and search */
  tags: string[];
  /** Importance score (0.0 - 1.0) */
  importance: number;
  /** Number of times this memory has been accessed */
  accessCount: number;
  /** Embedding vector for semantic search */
  embedding?: number[];
  /** Memory type classification */
  memoryType?: 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL';
  /** Related memory entry IDs */
  relatedEntries?: string[];
}

/**
 * Query parameters for temporal memory retrieval.
 */
export interface TemporalQuery {
  /** Start of the time range (ISO-8601) */
  from: string;
  /** End of the time range (ISO-8601) */
  to: string;
  /** Desired granularity for aggregation */
  granularity: TimeGranularity;
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by project */
  project?: string;
  /** Filter by tags */
  tags?: string[];
  /** Minimum importance threshold (0.0 - 1.0) */
  importanceThreshold?: number;
  /** Maximum number of results to return */
  limit: number;
  /** Text search query */
  searchText?: string;
  /** Sort direction */
  sortOrder?: 'ASC' | 'DESC';
}

// ============================================================================
// SECTION 9: RESOURCE MANAGEMENT
// ============================================================================

/**
 * Classification of resource types available for allocation.
 */
export enum ResourceType {
  LLM = 'LLM',
  BROWSER = 'BROWSER',
  GPU = 'GPU',
  WORKER = 'WORKER',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  QUEUE = 'QUEUE',
  STORAGE = 'STORAGE',
}

/**
 * A specific resource allocation binding a resource to a task and agent.
 */
export interface ResourceAllocation {
  /** Unique allocation identifier */
  id: string;
  /** Task ID this resource is allocated to */
  taskId: string;
  /** Agent ID this resource is allocated to */
  agentId: string;
  /** Type of resource allocated */
  resourceType: ResourceType;
  /** Resource provider identifier */
  provider: string;
  /** Provider-specific configuration */
  config: Record<string, unknown>;
  /** Estimated cost for this allocation */
  costEstimate: number;
  /** Timestamp when the resource was allocated */
  allocatedAt: string;
  /** Timestamp when the resource was released */
  releasedAt?: string;
  /** Allocation status */
  status?: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'FAILED';
}

/**
 * A candidate resource available for allocation, used during
 * resource selection and comparison.
 */
export interface ResourceCandidate {
  /** Type of resource */
  resourceType: ResourceType;
  /** Resource provider identifier */
  provider: string;
  /** Provider-specific configuration */
  config: Record<string, unknown>;
  /** Cost per unit of usage */
  costPerUnit: number;
  /** Expected latency in milliseconds */
  latencyMs: number;
  /** Current availability (0.0 - 1.0) */
  availability: number;
  /** Quality score (0.0 - 1.0) */
  quality: number;
  /** Maximum capacity */
  maxCapacity?: number;
  /** Current load (0.0 - 1.0) */
  currentLoad?: number;
  /** Geographic region */
  region?: string;
}

// ============================================================================
// SECTION 10: OBSERVABILITY
// ============================================================================

/**
 * A point-in-time snapshot of system observability data,
 * including logs, metrics, traces, and health indicators.
 */
export interface ObservabilitySnapshot {
  /** Timestamp of this snapshot */
  timestamp: string;
  /** Recent log entries */
  logs: ObservabilityLogEntry[];
  /** System metrics */
  metrics: ObservabilityMetric[];
  /** Distributed traces */
  traces: ObservabilityTrace[];
  /** Experience Quality Index score (0.0 - 1.0) */
  eqiScore: number;
  /** Memory subsystem health */
  memory: ObservabilitySubsystemHealth;
  /** Browser subsystem health */
  browser: ObservabilitySubsystemHealth;
  /** Agent health summary */
  agentHealth: ObservabilityAgentHealth[];
  /** CPU usage metrics */
  cpu: ObservabilityResourceHealth;
  /** GPU usage metrics */
  gpu: ObservabilityResourceHealth;
  /** Redis subsystem health */
  redis: ObservabilitySubsystemHealth;
  /** RabbitMQ subsystem health */
  rabbitmq: ObservabilitySubsystemHealth;
  /** PostgreSQL subsystem health */
  postgresql: ObservabilitySubsystemHealth;
}

/**
 * A single observability metric measurement.
 */
export interface ObservabilityMetric {
  /** Metric name (e.g., "cpu.usage", "memory.available") */
  name: string;
  /** Current metric value */
  value: number;
  /** Unit of measurement (e.g., "%", "ms", "MB") */
  unit: string;
  /** Timestamp of the measurement */
  timestamp: string;
  /** Key-value labels for dimensional metrics */
  labels: Record<string, string>;
}

/**
 * A log entry in the observability system.
 */
export interface ObservabilityLogEntry {
  /** Log level */
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: string;
  /** Source agent or service */
  source: string;
  /** Correlation/trace ID */
  traceId?: string;
  /** Structured log data */
  data?: Record<string, unknown>;
}

/**
 * A distributed trace in the observability system.
 */
export interface ObservabilityTrace {
  /** Trace identifier */
  traceId: string;
  /** Root span name */
  name: string;
  /** Start timestamp */
  startedAt: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Span count */
  spanCount: number;
  /** Status */
  status: 'OK' | 'ERROR' | 'TIMEOUT';
}

/**
 * Health status of a subsystem (memory, browser, redis, etc.).
 */
export interface ObservabilitySubsystemHealth {
  /** Subsystem name */
  name: string;
  /** Health status */
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  /** Response latency in milliseconds */
  latencyMs: number;
  /** Error rate as a fraction (0.0 - 1.0) */
  errorRate: number;
  /** Uptime percentage (0.0 - 100.0) */
  uptimePercent: number;
  /** Subsystem-specific details */
  details?: Record<string, unknown>;
}

/**
 * Health status of a computational resource (CPU, GPU).
 */
export interface ObservabilityResourceHealth {
  /** Resource name */
  name: string;
  /** Current utilization as a fraction (0.0 - 1.0) */
  utilization: number;
  /** Temperature in Celsius */
  temperature?: number;
  /** Available capacity */
  available: number;
  /** Total capacity */
  total: number;
  /** Unit */
  unit: string;
}

/**
 * Health status of an individual agent.
 */
export interface ObservabilityAgentHealth {
  /** Agent identifier */
  agentId: string;
  /** Agent status */
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE';
  /** Last heartbeat timestamp */
  lastHeartbeatAt: string;
  /** Current task count */
  activeTasks: number;
  /** Error count in the last window */
  recentErrors: number;
  /** Memory usage in MB */
  memoryUsageMb: number;
}

// ============================================================================
// SECTION 11: AUTO-RECOVERY
// ============================================================================

/**
 * Classification of failure types that can trigger auto-recovery.
 */
export enum FailureType {
  CRASH = 'CRASH',
  TIMEOUT = 'TIMEOUT',
  OOM = 'OOM',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  UNHANDLED_EXCEPTION = 'UNHANDLED_EXCEPTION',
  DEADLOCK = 'DEADLOCK',
}

/**
 * Classification of recovery strategies.
 */
export enum RecoveryStrategy {
  RESTART = 'RESTART',
  RESTORE_MEMORY_RESUME = 'RESTORE_MEMORY_RESUME',
  FAILOVER = 'FAILOVER',
  SCALE_OUT = 'SCALE_OUT',
  DEGRADE = 'DEGRADE',
  QUARANTINE = 'QUARANTINE',
}

/**
 * An auto-recovery action taken by the system in response to a failure.
 */
export interface AutoRecoveryAction {
  /** Unique recovery action identifier */
  id: string;
  /** Agent ID that experienced the failure */
  agentId: string;
  /** Type of failure detected */
  failureType: FailureType;
  /** Timestamp when the failure was detected */
  detectionTime: string;
  /** Recovery strategy chosen */
  recoveryStrategy: RecoveryStrategy;
  /** Current status of the recovery action */
  status: 'DETECTED' | 'RECOVERING' | 'RECOVERED' | 'FAILED' | 'ESCALATED';
  /** Number of recovery attempts made */
  attempts: number;
  /** Result of the recovery action */
  result?: string;
  /** Timestamp when recovery completed */
  recoveryTime?: string;
  /** Error details from the failure */
  failureDetails?: string;
  /** Contextual data about the failure */
  context?: Record<string, unknown>;
}

// ============================================================================
// SECTION 12: MARKETPLACE PLUGINS
// ============================================================================

/**
 * A plugin available in the marketplace or installed in the system.
 */
export interface MarketplacePlugin {
  /** Unique plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Semantic version */
  version: string;
  /** Plugin description */
  description: string;
  /** Cluster or category the plugin belongs to */
  cluster: string;
  /** Plugin author */
  author: string;
  /** Plugin homepage URL */
  homepage?: string;
  /** Source repository URL */
  repository?: string;
  /** Capabilities provided by this plugin */
  capabilities: string[];
  /** Dependencies on other plugins */
  dependencies: PluginDependency[];
  /** Whether this plugin is currently installed */
  installed: boolean;
  /** Timestamp when the plugin was installed */
  installedAt?: string;
  /** Whether this plugin is currently enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  config: Record<string, unknown>;
  /** Community rating (0.0 - 5.0) */
  rating: number;
  /** Total download count */
  downloads: number;
  /** Plugin license identifier */
  license?: string;
  /** Minimum Agent OS version required */
  minOsVersion?: string;
}

/**
 * A dependency on another plugin.
 */
export interface PluginDependency {
  /** Dependency plugin name */
  name: string;
  /** Required version range (semver) */
  versionRange: string;
  /** Whether this dependency is optional */
  optional: boolean;
}

/**
 * Plugin manifest file format, used for loading and validating
 * plugin metadata from the filesystem or registry.
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Semantic version */
  version: string;
  /** Plugin description */
  description: string;
  /** Cluster or category the plugin belongs to */
  cluster: string;
  /** Plugin author */
  author: string;
  /** Plugin homepage URL */
  homepage?: string;
  /** Source repository URL */
  repository?: string;
  /** Capabilities provided by this plugin */
  capabilities: string[];
  /** Dependencies on other plugins */
  dependencies: PluginDependency[];
  /** Whether this plugin is currently installed */
  installed: boolean;
  /** Timestamp when the plugin was installed */
  installedAt?: string;
  /** Whether this plugin is currently enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  config: Record<string, unknown>;
  /** Community rating (0.0 - 5.0) */
  rating: number;
  /** Total download count */
  downloads: number;
  /** Manifest schema version */
  manifestVersion: string;
  /** Entry point module path */
  entryPoint: string;
  /** Required permissions */
  permissions: string[];
  /** Checksum for integrity verification */
  checksum?: string;
}

// ============================================================================
// SECTION 13: LONG-HORIZON PLANNING
// ============================================================================

/**
 * A long-horizon plan that decomposes a complex mission into
 * hierarchical planning levels with sub-plans and task graphs.
 */
export interface LongHorizonPlan {
  /** Unique plan identifier */
  id: string;
  /** Parent mission identifier */
  missionId: string;
  /** Hierarchical planning levels */
  levels: PlanningLevel[];
  /** Total estimated duration across all levels in milliseconds */
  totalEstimatedDurationMs: number;
  /** Aggregate resource requirements */
  resourceRequirements: SimulationResourceRequirement[];
  /** Risk assessment for this plan */
  riskAssessment: RiskLevel;
  /** Simulation result for this plan */
  simulationResult?: SimulationResult;
  /** Plan status */
  status?: MissionStatus;
  /** Plan version for iteration tracking */
  version?: number;
  /** Timestamp when the plan was created */
  createdAt?: string;
}

/**
 * A single level in a hierarchical long-horizon plan.
 */
export interface PlanningLevel {
  /** Level number (0 = highest-level, increasing = more detailed) */
  level: number;
  /** Human-readable level name (e.g., "Strategic", "Tactical", "Operational") */
  name: string;
  /** Objectives for this planning level */
  objectives: string[];
  /** Sub-plans that decompose this level further */
  subPlans: LongHorizonPlan[];
  /** Task graph for this level */
  taskGraph: MissionTaskGraph;
  /** External dependencies for this level */
  dependencies: string[];
  /** Estimated duration for this level in milliseconds */
  estimatedDurationMs?: number;
  /** Confidence in this level's estimates (0.0 - 1.0) */
  confidence?: number;
}
