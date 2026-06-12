/**
 * AENEWS Agent OS X - Certification Types
 * Defines the type system for the EQI (Enterprise Quality Index) certification framework.
 * Covers certification levels, domains, weights, test results, and report structures.
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
}

// ─── Domain Weights ───────────────────────────────────────────────

export interface DomainWeights {
  architecture: number; // 10%
  tests: number; // 10%
  orchestration: number; // 15%
  agents: number; // 15%
  browser: number; // 10%
  memory: number; // 10%
  security: number; // 15%
  performance: number; // 10%
  documentation: number; // 5%
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
}

// ─── Dependency Graph (for circular dependency detection) ─────────

export interface DependencyNode {
  filePath: string;
  imports: string[];
}

export interface DependencyCycle {
  nodes: string[];
  length: number;
}

// ─── Architecture Violation ───────────────────────────────────────

export interface ArchitectureViolation {
  type:
    | 'circular_dependency'
    | 'cross_cluster_import'
    | 'naming_violation'
    | 'missing_interface_impl'
    | 'module_structure'
    | 'config_invalid';
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
