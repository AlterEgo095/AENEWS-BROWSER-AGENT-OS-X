import { ConfigService } from '@nestjs/config';
export interface AppInfo {
    name: string;
    version: string;
    description: string;
    environment: string;
    uptime: number;
    timestamp: string;
}
export declare class AppService {
    private readonly configService;
    private readonly logger;
    private readonly startTime;
    constructor(configService: ConfigService);
    getInfo(): AppInfo;
    getHealthStatus(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
}
