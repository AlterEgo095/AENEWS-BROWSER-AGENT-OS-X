import { ExecutionResults } from '../../teams/execution/execution-team.service';
export interface TestResults {
    missionId: string;
    success: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
    failures: TestFailure[];
    errors: string[];
    durationMs: number;
}
export interface TestFailure {
    testName: string;
    suite: string;
    error: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface AuditResults {
    missionId: string;
    passed: boolean;
    score: number;
    findings: string[];
    criticalIssues: number;
    warnings: number;
    info: number;
    complianceChecks: ComplianceCheck[];
    durationMs: number;
}
export interface ComplianceCheck {
    name: string;
    category: 'security' | 'quality' | 'performance' | 'documentation' | 'compliance';
    passed: boolean;
    details: string;
}
export interface CertificationResult {
    missionId: string;
    certified: boolean;
    qualityScore: number;
    reasons: string[];
    checks: CertificationCheck[];
    issuedAt: Date;
    validUntil: Date;
    certifiedBy: string;
}
export interface CertificationCheck {
    domain: string;
    passed: boolean;
    score: number;
    details: string;
    artifacts: string[];
}
export declare class CertificationTeamService {
    private readonly logger;
    private readonly testResults;
    private readonly auditResults;
    private readonly certifications;
    runTests(missionId: string, buildResults: ExecutionResults | undefined): Promise<TestResults>;
    runAudit(missionId: string): Promise<AuditResults>;
    certify(missionId: string): Promise<CertificationResult>;
    getTestResults(missionId: string): TestResults | undefined;
    getAuditResults(missionId: string): AuditResults | undefined;
    getCertification(missionId: string): CertificationResult | undefined;
}
