export declare enum CertificationLevel {
    PLATINUM = "PLATINUM",
    GOLD = "GOLD",
    SILVER = "SILVER",
    REJECTED = "REJECTED"
}
export declare enum CertificationDomain {
    ARCHITECTURE = "architecture",
    TESTS = "tests",
    ORCHESTRATION = "orchestration",
    AGENTS = "agents",
    BROWSER = "browser",
    MEMORY = "memory",
    SECURITY = "security",
    PERFORMANCE = "performance",
    DOCUMENTATION = "documentation",
    OBSERVABILITY = "observability"
}
export interface DomainWeights {
    architecture: number;
    agents: number;
    orchestration: number;
    browser: number;
    memory: number;
    security: number;
    performance: number;
    tests: number;
    documentation: number;
    observability: number;
}
export declare enum EqiMilestone {
    ARCHITECTURE_STABLE = 75,
    MVP_ENTERPRISE = 85,
    SILVER = 90,
    GOLD = 95,
    PLATINUM = 98,
    AUTONOMOUS_ENTERPRISE = 99.5
}
export interface TestResult {
    name: string;
    passed: boolean;
    score: number;
    durationMs: number;
    error?: string;
    details?: Record<string, any>;
}
export interface DomainResult {
    domain: CertificationDomain;
    weight: number;
    score: number;
    tests: TestResult[];
    passed: boolean;
    criticalFailures: string[];
}
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
    couplingScore: number;
    violations: ArchitectureViolation[];
}
export interface CrossClusterImport {
    sourceFile: string;
    sourceCluster: string;
    targetFile: string;
    targetCluster: string;
    severity: 'critical' | 'warning' | 'info';
}
export interface ArchitectureViolation {
    type: 'circular_dependency' | 'cross_cluster_import' | 'naming_violation' | 'missing_interface_impl' | 'module_structure' | 'config_invalid' | 'dependency_direction_violation';
    source: string;
    target?: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
}
export interface FileScanResult {
    filePath: string;
    relativePath: string;
    content: string;
    imports: string[];
    exports: string[];
    classes: string[];
    interfaces: string[];
}
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
