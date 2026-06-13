/**
 * AENEWS Software Factory — Capability Interface
 *
 * The fundamental unit of work is not an "agent" but a "capability".
 * 64 capabilities are organized in 6 Capability Packs.
 * Workers are ephemeral — they receive injected capabilities, execute, then are destroyed.
 *
 * 3 concepts only:
 *   1. Mission   → what the client requests
 *   2. Capability → what the platform knows how to do
 *   3. Worker    → who temporarily executes these capabilities
 */

// ─── Capability Packs ────────────────────────────────────────

export enum CapabilityPack {
  BROWSER = 'BROWSER',
  DEVELOPMENT = 'DEVELOPMENT',
  OFFICE = 'OFFICE',
  BUSINESS = 'BUSINESS',
  CERTIFICATION = 'CERTIFICATION',
  DELIVERY = 'DELIVERY',
}

// ─── Browser Capabilities (12) ──────────────────────────────

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

// ─── Development Capabilities (12) ──────────────────────────

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

// ─── Office Capabilities (8) ────────────────────────────────

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

// ─── Business Capabilities (10) ─────────────────────────────

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

// ─── Certification Capabilities (10) ────────────────────────

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

// ─── Delivery Capabilities (12) ─────────────────────────────

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

// ─── Union type: all capabilities ────────────────────────────

export type CapabilityId =
  | BrowserCapability
  | DevCapability
  | OfficeCapability
  | BusinessCapability
  | CertCapability
  | DeliveryCapability;

// ─── Capability Definition ───────────────────────────────────

export interface CapabilityDefinition {
  id: CapabilityId;
  name: string;
  description: string;
  pack: CapabilityPack;
  tools: string[];
  permissions: string[];
  cost: CapabilityCost;
  latency: CapabilityLatency;
  requirements: string[];
  keywords: string[]; // for matching mission text to capabilities
}

export interface CapabilityCost {
  estimatedUsdPerExecution: number;
  computeMinutesPerExecution: number;
}

export interface CapabilityLatency {
  estimatedMs: number;
  minMs: number;
  maxMs: number;
}

// ─── Capability Resolution ───────────────────────────────────

export interface ResolvedCapability {
  capabilityId: CapabilityId;
  definition: CapabilityDefinition;
  priority: number; // 1 = highest, 10 = lowest
  reason: string; // why this capability was selected
  dependencies: CapabilityId[]; // capabilities that must execute first
}

export interface CapabilityResolution {
  missionId: string;
  requiredCapabilities: ResolvedCapability[];
  packsNeeded: CapabilityPack[];
  estimatedTotalCost: number;
  estimatedTotalDurationMs: number;
  confidence: number; // 0-1, how confident the resolver is
}

// ─── Capability Execution Result ─────────────────────────────

export interface CapabilityExecutionResult {
  capabilityId: CapabilityId;
  success: boolean;
  output: any;
  artifacts: string[];
  durationMs: number;
  costUsd: number;
  error?: string;
  metadata: Record<string, any>;
}
