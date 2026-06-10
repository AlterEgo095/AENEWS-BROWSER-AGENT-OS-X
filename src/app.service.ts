import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppInfo {
  name: string;
  version: string;
  description: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime: number;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
  }

  getInfo(): AppInfo {
    return {
      name: this.configService.get<string>('app.name', 'AENEWS-Agent-OS-X'),
      version: this.configService.get<string>('app.version', '0.0.1'),
      description: this.configService.get<string>(
        'app.description',
        'AENEWS Agent OS X - Enterprise Autonomous Browser Platform',
      ),
      environment: this.configService.get<string>('app.env', 'development'),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }

  getHealthStatus(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }
}
