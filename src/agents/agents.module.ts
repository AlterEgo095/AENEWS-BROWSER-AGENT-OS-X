/**
 * AENEWS Agent OS X - Root Agents Module
 * Aggregates all agent framework modules and 9 cluster modules.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from './base/base-agent.module';
import { AgentRegistryModule } from './registry/agent-registry.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { MemoryModule } from './memory/memory.module';
import { EventsModule } from './events/events.module';
import { CommunicationModule } from './communication/communication.module';
import { HealthModule } from './health/health.module';
import { BrowserClusterModule } from './browser/browser-cluster.module';
import { ComputerClusterModule } from './computer/computer-cluster.module';
import { CodingClusterModule } from './coding/coding-cluster.module';
import { OfficeClusterModule } from './office/office-cluster.module';
import { MarketingClusterModule } from './marketing/marketing-cluster.module';
import { BusinessClusterModule } from './business/business-cluster.module';
import { InfrastructureClusterModule } from './infrastructure/infrastructure-cluster.module';
import { SecurityClusterModule } from './security/security-cluster.module';
import { MetaIntelligenceClusterModule } from './meta-intelligence/meta-intelligence-cluster.module';

@Module({
  imports: [
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
    BrowserClusterModule,
    ComputerClusterModule,
    CodingClusterModule,
    OfficeClusterModule,
    MarketingClusterModule,
    BusinessClusterModule,
    InfrastructureClusterModule,
    SecurityClusterModule,
    MetaIntelligenceClusterModule,
  ],
  exports: [
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
    BrowserClusterModule,
    ComputerClusterModule,
    CodingClusterModule,
    OfficeClusterModule,
    MarketingClusterModule,
    BusinessClusterModule,
    InfrastructureClusterModule,
    SecurityClusterModule,
    MetaIntelligenceClusterModule,
  ],
})
export class AgentsModule {}
