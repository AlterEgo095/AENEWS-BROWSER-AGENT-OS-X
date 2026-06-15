/**
 * AENEWS Software Factory — Mission Interface
 *
 * Defines the mission contract, lifecycle states, objectives,
 * constraints, and all related data structures.
 */

// ─── Mission Quality ─────────────────────────────────────────

export enum MissionQuality {
  DRAFT = 'draft',
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  MISSION_CRITICAL = 'mission_critical',
}

// ─── Deliverable Types ───────────────────────────────────────

export enum DeliverableType {
  SOURCE_CODE = 'source_code',
  DOCKER_IMAGE = 'docker_image',
  PDF_REPORT = 'pdf_report',
  TEST_SUITE = 'test_suite',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  README = 'readme',
  ARCHIVE_ZIP = 'archive_zip',
  DATABASE_SCRIPT = 'database_script',
  API_SPEC = 'api_spec',
  CONFIGURATION = 'configuration',
  PRESENTATION = 'presentation',
  SPREADSHEET = 'spreadsheet',
  VIDEO = 'video',
  CUSTOM = 'custom',
}

// ─── Mission Contract ────────────────────────────────────────

export interface MissionObjective {
  id: string;
  description: string;
  successCriteria: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface DeliverableSpec {
  type: DeliverableType;
  description: string;
  format?: string;
  required: boolean;
  path?: string;
  validated: boolean;
  validationNotes?: string;
}

export interface BudgetConstraint {
  maxApiCostUsd: number;
  currentSpendUsd: number;
  maxComputeHours: number;
  currentComputeHours: number;
  maxAgentInstances: number;
  currentAgentInstances: number;
}

export interface TimeConstraint {
  deadline: Date;
  estimatedDuration: string;
  startedAt?: Date;
  completedAt?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  state: MissionState;
  estimatedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  category: 'functional' | 'performance' | 'security' | 'quality' | 'compliance';
  mandatory: boolean;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface MissionConstraint {
  type: 'technical' | 'business' | 'legal' | 'security' | 'resource';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  enforced: boolean;
}

export interface MissionContract {
  id: string;
  mission: string;
  description: string;
  quality: MissionQuality;
  deadline: TimeConstraint;
  budget: BudgetConstraint;
  deliverables: DeliverableSpec[];
  acceptanceCriteria: AcceptanceCriterion[];
  constraints: MissionConstraint[];
  objectives: MissionObjective[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  parentId?: string;
  tags: string[];
  metadata: Record<string, any>;
}

// ─── Contract Negotiation ────────────────────────────────────

export interface ContractNegotiationResult {
  accepted: boolean;
  modifiedContract?: Partial<MissionContract>;
  warnings: string[];
  estimatedCost: number;
  estimatedDuration: string;
  feasibilityScore: number;
}

export interface ContractViolation {
  id: string;
  contractId: string;
  type: 'budget_exceeded' | 'deadline_missed' | 'quality_below_minimum' | 'deliverable_missing' | 'constraint_broken';
  description: string;
  severity: 'warning' | 'critical' | 'fatal';
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
}

// ─── Mission State Machine ───────────────────────────────────

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
  ARCHIVED = 'ARCHIVED',
}

export enum TransitionTrigger {
  SUBMIT = 'SUBMIT',
  APPROVE_PLAN = 'APPROVE_PLAN',
  START_RESEARCH = 'START_RESEARCH',
  START_BUILD = 'START_BUILD',
  START_TESTING = 'START_TESTING',
  START_AUDIT = 'START_AUDIT',
  START_CERTIFICATION = 'START_CERTIFICATION',
  START_DELIVERY = 'START_DELIVERY',
  MARK_COMPLETE = 'MARK_COMPLETE',
  ARCHIVE = 'ARCHIVE',
  REJECT = 'REJECT',
  FAIL = 'FAIL',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  ROLLBACK = 'ROLLBACK',
}

export interface StateTransition {
  from: MissionState;
  to: MissionState;
  trigger: TransitionTrigger;
  description: string;
}

export interface TransitionContext {
  missionId: string;
  contractId: string;
  currentState: MissionState;
  trigger: TransitionTrigger;
  agentId?: string;
  payload?: Record<string, any>;
  artifacts?: string[];
}

export interface TransitionResult {
  success: boolean;
  previousState: MissionState;
  newState: MissionState;
  timestamp: Date;
  error?: string;
  warnings: string[];
}

export interface MissionTimelineEntry {
  state: MissionState;
  enteredAt: Date;
  exitedAt?: Date;
  duration?: number;
  trigger: TransitionTrigger;
  agentId?: string;
  notes: string;
  artifacts: string[];
}

export interface MissionTimeline {
  missionId: string;
  entries: MissionTimelineEntry[];
  currentState: MissionState;
  totalDuration?: number;
  stateDurations: Record<MissionState, number>;
}

// ─── Mission Execution ───────────────────────────────────────

export interface MissionExecution {
  missionId: string;
  contractId: string;
  status: MissionState;
  progress: number;
  currentPhase: string;
  activeWorkers: number;
  totalCost: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  errors: string[];
  warnings: string[];
}

export interface MissionRequest {
  instruction: string;
  description?: string;
  quality?: MissionQuality;
  deadline?: Date;
  budgetMaxUsd?: number;
  deliverables?: string[];
  tags?: string[];
  createdBy?: string;
}

// ─── Capability Packs ────────────────────────────────────────

export enum CapabilityPack {
  BROWSER = 'BROWSER',
  DEVELOPMENT = 'DEVELOPMENT',
  OFFICE = 'OFFICE',
  BUSINESS = 'BUSINESS',
  CERTIFICATION = 'CERTIFICATION',
  DELIVERY = 'DELIVERY',
}

export enum BrowserCapability {
  LOGIN = 'browser.login',
  NAVIGATION = 'browser.navigation',
  SEARCH = 'browser.search',
  FORM = 'browser.form',
  UPLOAD = 'browser.upload',
  DOWNLOAD = 'browser.download',
  SCREENSHOT = 'browser.screenshot',
  VISION = 'browser.vision',
  SESSION = 'browser.session',
  COOKIE = 'browser.cookie',
  POPUP = 'browser.popup',
  OCR = 'browser.ocr',
}

export enum DevCapability {
  ARCHITECTURE = 'dev.architecture',
  FRONTEND = 'dev.frontend',
  BACKEND = 'dev.backend',
  DATABASE = 'dev.database',
  API = 'dev.api',
  DEVOPS = 'dev.devops',
  DOCKER = 'dev.docker',
  KUBERNETES = 'dev.kubernetes',
  QA = 'dev.qa',
  TEST = 'dev.test',
  DEBUG = 'dev.debug',
  DOCUMENTATION = 'dev.documentation',
}

export enum OfficeCapability {
  PDF = 'office.pdf',
  DOCX = 'office.docx',
  EXCEL = 'office.excel',
  POWERPOINT = 'office.powerpoint',
  OCR = 'office.ocr',
  SIGNATURE = 'office.signature',
  EMAIL = 'office.email',
  CALENDAR = 'office.calendar',
}

export enum BusinessCapability {
  SEO = 'business.seo',
  MARKETING = 'business.marketing',
  COPYWRITING = 'business.copywriting',
  BRANDING = 'business.branding',
  CRM = 'business.crm',
  ANALYTICS = 'business.analytics',
  FINANCE = 'business.finance',
  SALES = 'business.sales',
  LEGAL = 'business.legal',
  PARTNERSHIP = 'business.partnership',
}

export enum CertCapability {
  ARCHITECTURE_REVIEW = 'cert.architecture_review',
  SECURITY_AUDIT = 'cert.security_audit',
  TEST_COVERAGE = 'cert.test_coverage',
  REGRESSION = 'cert.regression',
  PERFORMANCE = 'cert.performance',
  DOC_REVIEW = 'cert.doc_review',
  INTEGRATION = 'cert.integration',
  COMPLIANCE = 'cert.compliance',
  ACCESSIBILITY = 'cert.accessibility',
  DATA_PRIVACY = 'cert.data_privacy',
}

export enum DeliveryCapability {
  GITHUB = 'delivery.github',
  DOCKER_REGISTRY = 'delivery.docker_registry',
  VPS = 'delivery.vps',
  CLOUD = 'delivery.cloud',
  ZIP = 'delivery.zip',
  PDF_REPORT = 'delivery.pdf_report',
  NOTIFICATION = 'delivery.notification',
  DEPLOYMENT = 'delivery.deployment',
  CDN = 'delivery.cdn',
  BACKUP = 'delivery.backup',
  MONITORING_SETUP = 'delivery.monitoring_setup',
  LOAD_BALANCER = 'delivery.load_balancer',
}

export type CapabilityId =
  | BrowserCapability
  | DevCapability
  | OfficeCapability
  | BusinessCapability
  | CertCapability
  | DeliveryCapability;

// ─── Valid Transitions ───────────────────────────────────────

export const VALID_TRANSITIONS: StateTransition[] = [
  { from: MissionState.DRAFT, to: MissionState.PLANNED, trigger: TransitionTrigger.SUBMIT, description: 'Mission submitted for planning' },
  { from: MissionState.PLANNED, to: MissionState.RESEARCH, trigger: TransitionTrigger.START_RESEARCH, description: 'Plan approved, starting research' },
  { from: MissionState.PLANNED, to: MissionState.DRAFT, trigger: TransitionTrigger.REJECT, description: 'Plan rejected, back to draft' },
  { from: MissionState.RESEARCH, to: MissionState.BUILDING, trigger: TransitionTrigger.START_BUILD, description: 'Research complete, starting build' },
  { from: MissionState.RESEARCH, to: MissionState.PLANNED, trigger: TransitionTrigger.ROLLBACK, description: 'Research insufficient, re-planning' },
  { from: MissionState.BUILDING, to: MissionState.TESTING, trigger: TransitionTrigger.START_TESTING, description: 'Build complete, starting tests' },
  { from: MissionState.BUILDING, to: MissionState.RESEARCH, trigger: TransitionTrigger.ROLLBACK, description: 'Build blocked, need more research' },
  { from: MissionState.TESTING, to: MissionState.AUDITING, trigger: TransitionTrigger.START_AUDIT, description: 'Tests passing, starting audit' },
  { from: MissionState.TESTING, to: MissionState.BUILDING, trigger: TransitionTrigger.ROLLBACK, description: 'Tests failed, back to building' },
  { from: MissionState.AUDITING, to: MissionState.CERTIFYING, trigger: TransitionTrigger.START_CERTIFICATION, description: 'Audit passed, certifying' },
  { from: MissionState.AUDITING, to: MissionState.BUILDING, trigger: TransitionTrigger.ROLLBACK, description: 'Audit found issues, back to building' },
  { from: MissionState.CERTIFYING, to: MissionState.DELIVERING, trigger: TransitionTrigger.START_DELIVERY, description: 'Certified, starting delivery' },
  { from: MissionState.CERTIFYING, to: MissionState.AUDITING, trigger: TransitionTrigger.ROLLBACK, description: 'Certification failed, re-auditing' },
  { from: MissionState.DELIVERING, to: MissionState.COMPLETED, trigger: TransitionTrigger.MARK_COMPLETE, description: 'Delivered, mission complete' },
  { from: MissionState.DELIVERING, to: MissionState.CERTIFYING, trigger: TransitionTrigger.ROLLBACK, description: 'Delivery failed, re-certifying' },
  { from: MissionState.COMPLETED, to: MissionState.ARCHIVED, trigger: TransitionTrigger.ARCHIVE, description: 'Mission archived' },
];
