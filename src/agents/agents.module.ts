/**
 * AENEWS Agent OS X - Root Agents Module
 * Aggregates all agent framework modules into a single import.
 * Phase 1: Added AgentConnectorBridgeModule + all cluster modules
 * so agents can delegate to real connectors.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from './base/base-agent.module';
import { AgentRegistryModule } from './registry/agent-registry.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { MemoryModule } from './memory/memory.module';
import { EventsModule } from './events/events.module';
import { CommunicationModule } from './communication/communication.module';
import { HealthModule } from './health/health.module';
import { AgentConnectorBridgeModule } from './bridge';
import { BrowserClusterModule } from './browser/browser-cluster.module';
import { ComputerClusterModule } from './computer/computer-cluster.module';
import { CodingClusterModule } from './coding/coding-cluster.module';
import { OfficeClusterModule } from './office/office-cluster.module';
import { MarketingClusterModule } from './marketing/marketing-cluster.module';
import { BusinessClusterModule } from './business/business-cluster.module';
import { InfrastructureClusterModule } from './infrastructure/infrastructure-cluster.module';
import { SecurityClusterModule } from './security/security-cluster.module';
import { MetaIntelligenceClusterModule } from './meta-intelligence/meta-intelligence-cluster.module';
import { CertificationClusterModule } from './certification/certification-cluster.module';
import { SelfEvolutionClusterModule } from './self-evolution/self-evolution-cluster.module';

@Module({
  imports: [
    // ─── Core Framework ──────────────────────────────────────
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,

    // ─── Bridge to Real Connectors ───────────────────────────
    AgentConnectorBridgeModule,

    // ─── Agent Clusters (11 clusters, 80+ agents) ───────────
    BrowserClusterModule,
    ComputerClusterModule,
    CodingClusterModule,
    OfficeClusterModule,
    MarketingClusterModule,
    BusinessClusterModule,
    InfrastructureClusterModule,
    SecurityClusterModule,
    MetaIntelligenceClusterModule,
    CertificationClusterModule,
    SelfEvolutionClusterModule,
  ],
  exports: [
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
    AgentConnectorBridgeModule,
    BrowserClusterModule,
    ComputerClusterModule,
    CodingClusterModule,
    OfficeClusterModule,
    MarketingClusterModule,
    BusinessClusterModule,
    InfrastructureClusterModule,
    SecurityClusterModule,
    MetaIntelligenceClusterModule,
    CertificationClusterModule,
    SelfEvolutionClusterModule,
  ],
})
export class AgentsModule {}
