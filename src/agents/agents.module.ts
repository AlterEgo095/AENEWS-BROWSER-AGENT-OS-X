/**
 * AENEWS Agent OS X - Root Agents Module
 * Aggregates all agent framework modules into a single import.
 * Imports: BaseAgentModule, AgentRegistryModule, EventsModule,
 * OrchestratorModule, MemoryModule, CommunicationModule, HealthModule.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from './base/base-agent.module';
import { AgentRegistryModule } from './registry/agent-registry.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { MemoryModule } from './memory/memory.module';
import { EventsModule } from './events/events.module';
import { CommunicationModule } from './communication/communication.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
  ],
  exports: [
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
  ],
})
export class AgentsModule {}
