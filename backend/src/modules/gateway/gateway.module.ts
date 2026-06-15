/**
 * AENEWS Agent OS X — Gateway Module
 *
 * Wires the WebSocket EventsGateway into the NestJS application.
 *
 * Imports:
 *   - AgentFrameworkModule: provides AgentEventBusService (global, already available)
 *   - AuthModule: provides JwtService for connection authentication
 *   - SecurityModule: provides SecurityGatewayService, ThreatIntelligenceService, SecurityMetricsService
 */

import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => SecurityModule),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
