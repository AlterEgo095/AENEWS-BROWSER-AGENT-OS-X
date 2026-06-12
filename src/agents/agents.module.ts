/**
 * AENEWS Agent OS X - Root Agents Module
 *
 * Architecture: Mission-Oriented Software Factory
 * "Transformer une instruction en langage naturel en un livrable complet, testé, audité et prêt à l'emploi."
 *
 * Layers:
 *   ┌─────────────────────────────────────────────┐
 *   │           Mission Orchestrator               │  ← NL → Mission → Certified Delivery
 *   ├─────────────────────────────────────────────┤
 *   │  Mission Planner │ Mission Memory │ Monitor  │
 *   ├─────────────────────────────────────────────┤
 *   │  Browser │ Dev │ Business │ Memory │ Cert │ Delivery  │  ← 6 Focused Teams
 *   ├─────────────────────────────────────────────┤
 *   │  Core Framework (Base, Registry, Events...) │
 *   ├─────────────────────────────────────────────┤
 *   │  Support (Constitutional, Approval, Recovery)│
 *   └─────────────────────────────────────────────┘
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from './base/base-agent.module';
import { AgentRegistryModule } from './registry/agent-registry.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { MemoryModule } from './memory/memory.module';
import { EventsModule } from './events/events.module';
import { CommunicationModule } from './communication/communication.module';
import { HealthModule } from './health/health.module';
import { GatewayModule } from '../gateway/gateway.module';
import { MissionModule } from '../mission/mission.module';
import { TeamsModule } from '../teams/teams.module';
import { MissionOsModule } from '../mission-os/mission-os.module';

// Legacy cluster modules (kept as implementation detail for team services)
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
    // ─── Core Framework ──────────────────────────────────────────────
    BaseAgentModule,
    EventsModule,
    MemoryModule,
    AgentRegistryModule,
    OrchestratorModule,
    CommunicationModule,
    HealthModule,
    GatewayModule,

    // ─── Mission Layer (PRIMARY INTERFACE) ───────────────────────────
    MissionModule,
    TeamsModule,

    // ─── Support Services ────────────────────────────────────────────
    MissionOsModule,

    // ─── Legacy Agent Clusters (implementation detail) ───────────────
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
    GatewayModule,
    MissionModule,
    TeamsModule,
    MissionOsModule,
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
