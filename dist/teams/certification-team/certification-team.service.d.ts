export interface CertificationTask {
    id: string;
    capability: 'test' | 'audit' | 'regression' | 'performance' | 'security' | 'doc_check' | 'full_certification';
    params: Record<string, any>;
    missionId: string;
}
export interface CertificationResult {
    taskId: string;
    success: boolean;
    score: number;
    passed: boolean;
    domains: CertificationDomainResult[];
    report: string;
    error?: string;
    durationMs: number;
}
export interface CertificationDomainResult {
    domain: string;
    score: number;
    passed: boolean;
    details: string;
    issues: string[];
}
export declare class CertificationTeamService {
    private readonly logger;
    private readonly runs;
    private readonly taskLog;
    private metrics;
    execute(task: CertificationTask): Promise<CertificationResult>;
    runTests(target: string, missionId?: string): Promise<CertificationResult>;
    auditCode(code: string, missionId?: string): Promise<CertificationResult>;
    checkRegression(baseline: Record<string, number>, current: Record<string, number>, missionId?: string): Promise<CertificationResult>;
    benchmarkPerformance(target: string, missionId?: string): Promise<CertificationResult>;
    securityScan(target: string, missionId?: string): Promise<CertificationResult>;
    checkDocumentation(target: string, missionId?: string): Promise<CertificationResult>;
    fullCertification(missionId: string): Promise<CertificationResult>;
    getStatus(): {
        team: string;
        activeRuns: number;
        tasksCompleted: number;
        tasksFailed: number;
        certificationsPassed: number;
        certificationsFailed: number;
        averageScore: number;
        passingThreshold: number;
        avgDurationMs: number;
        runs: Array<{
            missionId: string;
            totalRuns: number;
            lastScore: number;
            lastPassed: boolean;
            lastRunAt: Date;
        }>;
    };
    private ensureRun;
    private recordRun;
    private generateReport;
    private sleep;
}
