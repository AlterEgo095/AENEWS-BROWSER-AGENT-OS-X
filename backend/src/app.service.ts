import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getSystemInfo() {
    return {
      name: this.configService.get('app.name'),
      version: this.configService.get('app.version'),
      environment: this.configService.get('app.env'),
      status: 'operational',
      timestamp: new Date().toISOString(),
      clusters: {
        browser: { agents: 17, status: 'pending' },
        computer: { agents: 7, status: 'pending' },
        coding: { agents: 8, status: 'pending' },
        office: { agents: 6, status: 'pending' },
        marketing: { agents: 8, status: 'pending' },
        business: { agents: 8, status: 'pending' },
        infrastructure: { agents: 8, status: 'pending' },
        security: { agents: 6, status: 'pending' },
        metaIntelligence: { capabilities: 13, status: 'pending' },
      },
      governance: [
        'Plugin First',
        'Event Driven',
        'Cloud Native',
        'Multi Tenant',
        'Zero Trust',
        'Security By Design',
        'AI Native',
        'Agent Native',
        'Memory Native',
        'API First',
      ],
    };
  }

  getVersion() {
    return {
      version: this.configService.get('app.version'),
      apiVersion: 'v1',
      buildDate: new Date().toISOString(),
    };
  }
}
