/**
 * AENEWS Agent OS X - Certification Types
 * Defines the type system for the EQI (Enterprise Quality Index) certification framework.
 * Covers certification levels, domains, weights, test results, and report structures.
 *
 * EQI Domain Weights (v2):
 *   Architecture   8%    - Structural integrity, dependency graph, coupling
 *   Agents        12%    - 81 agents lifecycle, tools, permissions, memory
 *   Orchestration 15%    - Pipeline decompose→plan→execute→critique→repair→validate→deliver
 *   Browser       10%    - 17 browser agents with functional validation
 *   Memory        12%    - Unified Memory Gateway, cross-tier retrieval, all 6+ tiers
 *   Security      15%    - Security Gateway, injection prevention, RBAC, audit
 *   Performance    8%    - Latency, throughput, concurrent agents, resource usage
 *   Tests         10%    - Unit, integration, E2E coverage
 *   Documentation  5%    - Auto-generated JSDoc, OpenAPI, Mermaid, ADR
 *   Observability  5%    - Metrics, tracing, logging, alerting
 *
 * Certification Levels:
 *   Platinum  >= 98%
 *   Gold      >= 95%
 *   Silver    >= 90%
 *   Refused   <  90%
 *
 * Milestones:
 *   75%  → Architecture stable
 *   85%  → MVP Enterprise
 *   90%  → Silver
 *   95%  → Gold
 *   98%  → Platinum
 *   99.5%+ → Autonomous Enterprise Grade
 */

// ─── Certification Level ──────────────────────────────────────────

export enum CertificationLevel {
  PLATINUM = 'PLATINUM', // EQI >= 98
  GOLD = 'GOLD', // EQI >= 95
  SILVER = 'SILVER', // EQI >= 90
  REJECTED = 'REJECTED', // EQI < 90
}

// ─── Certification Domain ─────────────────────────────────────────

export enum CertificationDomain {
  ARCHITECTURE = 'architecture',
  TESTS = 'tests',
  ORCHESTRATION = 'orchestration',
  AGENTS = 'agents',
  BROWSER = 'browser',
  MEMORY = 'memory',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  DOCUMENTATION = 'documentation',
  OBSERVABILITY = 'observability',
}

// ─── Domain Weights (v2 - updated) ────────────────────────────────

export interface DomainWeights {
  architecture: number; // 8%
  agents: number; // 12%
  orchestration: number; // 15%
  browser: number; // 10%
  memory: number; // 12%
  security: number; // 15%
  performance: number; // 8%
  tests: number; // 10%
  documentation: number; // 5%
  observability: number; // 5%
}

// ─── EQI Milestone ────────────────────────────────────────────────

export enum EqiMilestone {
  ARCHITECTURE_STABLE = 75,
  MVP_ENTERPRISE = 85,
  SILVER = 90,
  GOLD = 95,
  PLATINUM = 98,
  AUTONOMOUS_ENTERPRISE = 99.5,
}

// ─── Test Result ──────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  score: number; // 0-100
  durationMs: number;
  error?: string;
  details?: Record<string, any>;
}

// ─── Domain Result ────────────────────────────────────────────────

export interface DomainResult {
  domain: CertificationDomain;
  weight: number;
  score: number; // 0-100
  tests: TestResult[];
  passed: boolean;
  criticalFailures: string[];
}

// ─── Certification Report ─────────────────────────────────────────

export interface CertificationReport {
  timestamp: Date;
  eqi: number;
  level: CertificationLevel;
  milestone: EqiMilestone | null;
  domains: DomainResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  criticalIssues: string[];
  recommendations: string[];
  approved: boolean;
  governanceCompliant: boolean;
  previousEqi?: number;
  eqiDelta?: number;
}

// ─── Dependency Graph (for circular dependency detection) ─────────

export interface DependencyNode {
  filePath: string;
  imports: string[];
  module: string;
  cluster?: string;
}

export interface DependencyCycle {
  nodes: string[];
  length: number;
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface DependencyAnalysisResult {
  nodes: DependencyNode[];
  cycles: DependencyCycle[];
  crossClusterImports: CrossClusterImport[];
  couplingScore: number; // 0-100, 100 = no coupling
  violations: ArchitectureViolation[];
}

// ─── Cross Cluster Import ─────────────────────────────────────────

export interface CrossClusterImport {
  sourceFile: string;
  sourceCluster: string;
  targetFile: string;
  targetCluster: string;
  severity: 'critical' | 'warning' | 'info';
}

// ─── Architecture Violation ───────────────────────────────────────

export interface ArchitectureViolation {
  type:
    | 'circular_dependency'
    | 'cross_cluster_import'
    | 'naming_violation'
    | 'missing_interface_impl'
    | 'module_structure'
    | 'config_invalid'
    | 'dependency_direction_violation';
  source: string;
  target?: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

// ─── File Scan Result (for codebase analysis) ─────────────────────

export interface FileScanResult {
  filePath: string;
  relativePath: string;
  content: string;
  imports: string[];
  exports: string[];
  classes: string[];
  interfaces: string[];
}

// ─── Governance Rule ──────────────────────────────────────────────

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  requiredEqiLevel: CertificationLevel;
  enforceBlocking: boolean;
  domains: CertificationDomain[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Certification History Entry ──────────────────────────────────

export interface CertificationHistoryEntry {
  timestamp: Date;
  eqi: number;
  level: CertificationLevel;
  approved: boolean;
  domainScores: Record<CertificationDomain, number>;
  commitHash?: string;
  branch?: string;
  triggeredBy: 'manual' | 'ci' | 'self_evolution' | 'scheduled';
}
