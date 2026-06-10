/**
 * AENEWS Agent OS X - Agent Registry Module
 * Provides the central agent registry service for agent discovery,
 * routing, health monitoring, and lifecycle management.
 */

import { Module, Global } from '@nestjs/common';
import { AgentRegistryService } from './agent-registry.service';
import { EventsModule } from '../events/events.module';

@Global()
@Module({
  imports: [EventsModule],
  providers: [AgentRegistryService],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
