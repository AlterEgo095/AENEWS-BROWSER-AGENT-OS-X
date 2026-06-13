/**
 * AENEWS Software Factory — Complete Agent Architecture
 * 
 * 7 Levels, 64 Agents:
 *   Level 1: Core Orchestration (10 permanent)
 *   Level 2: Browser Team (12 on-demand)
 *   Level 3: Development Team (12 on-demand)
 *   Level 4: Office Team (6 on-demand)
 *   Level 5: Business Team (8 on-demand)
 *   Level 6: Certification Team (8 on-demand)
 *   Level 7: Delivery Team (8 on-demand)
 * 
 * Philosophy: Minimum permanent agents, maximum specialized on-demand.
 * Typical mission: 15-25 agents active simultaneously.
 */

// ─── Agent Levels ──────────────────────────────────────────────

export enum AgentLevel {
  CORE = 'CORE',           // 10 permanent agents
  BROWSER = 'BROWSER',     // 12 browser specialists
  DEVELOPMENT = 'DEVELOPMENT', // 12 dev specialists
  OFFICE = 'OFFICE',       // 6 office specialists
  BUSINESS = 'BUSINESS',   // 8 business specialists
  CERTIFICATION = 'CERTIFICATION', // 8 cert specialists
  DELIVERY = 'DELIVERY',   // 8 delivery specialists
}

// ─── Core Agents (Level 1) — 10 Permanent ─────────────────────

export enum CoreAgent {
  MISSION_ORCHESTRATOR = 'MISSION_ORCHESTRATOR',
  MISSION_PLANNER = 'MISSION_PLANNER',
  TASK_SCHEDULER = 'TASK_SCHEDULER',
  MEMORY_MANAGER = 'MEMORY_MANAGER',
  RESOURCE_MANAGER = 'RESOURCE_MANAGER',
  SECURITY_MANAGER = 'SECURITY_MANAGER',
  CERTIFICATION_MANAGER = 'CERTIFICATION_MANAGER',
  DELIVERY_MANAGER = 'DELIVERY_MANAGER',
  MONITORING_MANAGER = 'MONITORING_MANAGER',
  RECOVERY_MANAGER = 'RECOVERY_MANAGER',
}

// ─── Browser Team (Level 2) — 12 On-Demand ────────────────────

export enum BrowserAgent {
  LOGIN = 'BROWSER_LOGIN',
  NAVIGATION = 'BROWSER_NAVIGATION',
  SEARCH = 'BROWSER_SEARCH',
  FORM = 'BROWSER_FORM',
  UPLOAD = 'BROWSER_UPLOAD',
  DOWNLOAD = 'BROWSER_DOWNLOAD',
  SCREENSHOT = 'BROWSER_SCREENSHOT',
  VISION = 'BROWSER_VISION',
  SESSION = 'BROWSER_SESSION',
  COOKIE = 'BROWSER_COOKIE',
  POPUP = 'BROWSER_POPUP',
  OCR = 'BROWSER_OCR',
}

// ─── Development Team (Level 3) — 12 On-Demand ────────────────

export enum DevAgent {
  ARCHITECT = 'DEV_ARCHITECT',
  FRONTEND = 'DEV_FRONTEND',
  BACKEND = 'DEV_BACKEND',
  DATABASE = 'DEV_DATABASE',
  API = 'DEV_API',
  DEVOPS = 'DEV_DEVOPS',
  DOCKER = 'DEV_DOCKER',
  KUBERNETES = 'DEV_KUBERNETES',
  QA = 'DEV_QA',
  TEST = 'DEV_TEST',
  DEBUG = 'DEV_DEBUG',
  DOCUMENTATION = 'DEV_DOCUMENTATION',
}

// ─── Office Team (Level 4) — 6 On-Demand ──────────────────────

export enum OfficeAgent {
  PDF = 'OFFICE_PDF',
  DOCX = 'OFFICE_DOCX',
  EXCEL = 'OFFICE_EXCEL',
  POWERPOINT = 'OFFICE_POWERPOINT',
  OFFICE_OCR = 'OFFICE_OCR',
  SIGNATURE = 'OFFICE_SIGNATURE',
}

// ─── Business Team (Level 5) — 8 On-Demand ────────────────────

export enum BusinessAgent {
  SEO = 'BIZ_SEO',
  MARKETING = 'BIZ_MARKETING',
  COPYWRITING = 'BIZ_COPYWRITING',
  BRANDING = 'BIZ_BRANDING',
  CRM = 'BIZ_CRM',
  ANALYTICS = 'BIZ_ANALYTICS',
  FINANCE = 'BIZ_FINANCE',
  SALES = 'BIZ_SALES',
}

// ─── Certification Team (Level 6) — 8 On-Demand ───────────────

export enum CertAgent {
  ARCH_CERT = 'CERT_ARCHITECTURE',
  SECURITY = 'CERT_SECURITY',
  TESTS = 'CERT_TESTS',
  REGRESSION = 'CERT_REGRESSION',
  PERFORMANCE = 'CERT_PERFORMANCE',
  DOCS = 'CERT_DOCUMENTATION',
  INTEGRATION = 'CERT_INTEGRATION',
  COMPLIANCE = 'CERT_COMPLIANCE',
}

// ─── Delivery Team (Level 7) — 8 On-Demand ────────────────────

export enum DeliveryAgent {
  GITHUB = 'DELIVERY_GITHUB',
  DELIVERY_DOCKER = 'DELIVERY_DOCKER',
  VPS = 'DELIVERY_VPS',
  CLOUD = 'DELIVERY_CLOUD',
  ZIP = 'DELIVERY_ZIP',
  PDF_REPORT = 'DELIVERY_PDF_REPORT',
  NOTIFICATION = 'DELIVERY_NOTIFICATION',
  DEPLOYMENT = 'DELIVERY_DEPLOYMENT',
}

// ─── Unified Agent ID Type ────────────────────────────────────

export type SpecializedAgentId =
  | CoreAgent
  | BrowserAgent
  | DevAgent
  | OfficeAgent
  | BusinessAgent
  | CertAgent
  | DeliveryAgent;

// ─── Agent Definition ──────────────────────────────────────────

export interface AgentDefinition {
  id: SpecializedAgentId;
  name: string;
  level: AgentLevel;
  permanent: boolean;
  description: string;
  skills: string[];
  tools: string[];
  dependencies: SpecializedAgentId[];
  maxConcurrentTasks: number;
  estimatedCostPerTask: number;
}

// ─── Team Composition ─────────────────────────────────────────

export interface TeamComposition {
  level: AgentLevel;
  name: string;
  agents: SpecializedAgentId[];
  total: number;
  permanent: boolean;
}

// ─── Spawning Context ─────────────────────────────────────────

export interface SpawnContext {
  missionId: string;
  contractId: string;
  agentId: SpecializedAgentId;
  parentAgentId?: string;
  taskDescription: string;
  input: Record<string, any>;
  skills: string[];
  constraints: {
    maxCostUsd: number;
    maxDurationMs: number;
    maxRetries: number;
  };
}

// ─── Agent Execution Result ───────────────────────────────────

export interface AgentExecutionResult {
  agentId: SpecializedAgentId;
  missionId: string;
  success: boolean;
  output: Record<string, any>;
  artifacts: ArtifactRef[];
  cost: number;
  durationMs: number;
  logs: string[];
  errors: string[];
  nextAgents?: SpecializedAgentId[];
}

export interface ArtifactRef {
  id: string;
  name: string;
  type: string;
  path: string;
  size: number;
}

// ─── Mission Pipeline Step ────────────────────────────────────

export interface PipelineStep {
  phase: string;
  state: string;
  requiredAgents: SpecializedAgentId[];
  optionalAgents: SpecializedAgentId[];
  estimatedDurationMs: number;
  dependsOn: string[];
}

// ─── Statistics ───────────────────────────────────────────────

export interface FactoryStats {
  totalAgents: number;
  permanentAgents: number;
  onDemandAgents: number;
  currentlyActive: number;
  byLevel: Record<AgentLevel, number>;
  totalCostUsd: number;
  missionsCompleted: number;
  missionsActive: number;
}
