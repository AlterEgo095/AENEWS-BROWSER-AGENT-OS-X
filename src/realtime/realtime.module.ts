/**
 * AENEWS Agent OS X - Real-Time Module
 *
 * Wires the WebSocket gateway with the event bus for
 * real-time mission/agent/orchestration updates.
 */

import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { EventsModule } from '../agents/events/events.module';

@Module({
  imports: [EventsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
