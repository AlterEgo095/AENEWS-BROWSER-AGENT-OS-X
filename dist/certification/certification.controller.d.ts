import { CertificationRunnerService } from './certification-runner.service';
import { CertificationDomain, CertificationReport } from './types';
export declare class CertificationController {
    private readonly certificationRunner;
    private readonly logger;
    constructor(certificationRunner: CertificationRunnerService);
    runFullCertification(): Promise<CertificationReport>;
    getStatus(): Promise<{
        hasReport: boolean;
        isRunning: boolean;
        eqi?: number;
        level?: string;
        approved?: boolean;
        timestamp?: Date;
    }>;
    getReport(): Promise<CertificationReport>;
    runDomainCertification(domain: string): Promise<{
        domain: CertificationDomain;
        weight: number;
        score: number;
        tests: any[];
        passed: boolean;
        criticalFailures: string[];
    }>;
}
