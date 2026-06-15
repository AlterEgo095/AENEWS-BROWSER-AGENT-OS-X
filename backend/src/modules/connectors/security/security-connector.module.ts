/**
 * AENEWS Agent OS X — Security Connector Module
 *
 * NestJS module that provides security capabilities.
 *
 * Provides:
 *   - SecurityConnectorService: Authentication, encryption, vulnerability scanning, audit, threat detection
 *
 * On module init:
 *   - Registers the security connector with AgentBridgeService
 *
 * Configuration via environment variables:
 *   SECURITY_ENABLED=true
 *   ENCRYPTION_KEY=
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SecurityConnectorService } from './security-connector.service';
import { AgentBridgeService, SoftwareFactoryConnector } from '../../agent-framework/services/agent-bridge.service';
import { AgentFrameworkModule } from '../../agent-framework/agent-framework.module';

// ─── Security Bridge Connector ────────────────────────────────────

class SecurityBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'security';
  readonly description = 'Security — authentication, encryption, vulnerability scanning, audit, threat detection';
  readonly actions = [
    'hashPassword', 'verifyPassword', 'generateToken', 'verifyToken',
    'encrypt', 'decrypt', 'generateKey',
    'scanDependencies', 'checkSecrets', 'checkPermissions',
    'createAuditLog', 'searchAuditLog', 'generateReport',
    'analyzePayload', 'rateRequest',
  ];

  constructor(private readonly securityService: SecurityConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    return this.securityService.executeAction(action, params);
  }
}

@Module({
  imports: [
    AgentFrameworkModule,
    JwtModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret') ?? configService.get<string>('JWT_SECRET');
        if (!secret) {
          if (process.env.APP_ENV === 'production') {
            throw new Error('FATAL: JWT_SECRET must be set for SecurityConnectorModule in production.');
          }
          console.warn('⚠️  WARNING: No JWT secret configured for SecurityConnectorModule. Token operations will fail.');
        }
        return {
          secret: secret || 'insecure-dev-only-secret',
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  providers: [SecurityConnectorService],
  exports: [SecurityConnectorService, JwtModule],
})
export class SecurityConnectorModule implements OnModuleInit {
  private readonly logger = new Logger(SecurityConnectorModule.name);

  constructor(
    private readonly securityService: SecurityConnectorService,
    private readonly agentBridge: AgentBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.agentBridge.registerConnector(
      'security',
      new SecurityBridgeConnector(this.securityService),
      'real',
    );

    this.logger.log(
      `Security connector registered with AgentBridge ` +
        `(actions: ${this.securityService.getSupportedActions().length})`,
    );
  }
}
