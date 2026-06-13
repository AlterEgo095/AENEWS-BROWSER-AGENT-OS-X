import { AppService, AppInfo } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getInfo(): AppInfo;
    getStatus(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
}
