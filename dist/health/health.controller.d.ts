import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
export declare class HealthController {
    private readonly health;
    constructor(health: HealthCheckService);
    check(): Promise<HealthCheckResult>;
    liveness(): {
        status: 'ok';
        timestamp: string;
    };
    readiness(): Promise<HealthCheckResult>;
}
