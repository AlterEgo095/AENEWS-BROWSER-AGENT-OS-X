/**
 * AENEWS Agent OS X — Gateway Module
 *
 * Wires the WebSocket EventsGateway into the NestJS application.
 *
 * Imports:
 *   - AgentFrameworkModule: provides AgentEventBusService (global, already available)
 *   - AuthModule: provides JwtService for connection authentication
 *
 * The EventsGateway is the central WebSocket hub that broadcasts
 * agent, mission, and system events to connected clients.
 */

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // JwtService comes from AuthModule
    AuthModule,
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
