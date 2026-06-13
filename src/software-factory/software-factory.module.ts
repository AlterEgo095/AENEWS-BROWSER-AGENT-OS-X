/**
 * AENEWS Software Factory — Root Module
 *
 * Architecture: 3 concepts only
 *   1. Mission     → what the client requests
 *   2. Capabilities → what the platform knows how to do (64 in 6 packs)
 *   3. Workers     → who temporarily executes these capabilities (ephemeral)
 *
 * 10 permanent kernel services.
 * Everything else is dynamic.
 *
 * Sprint 2: Real Connectors — 6 connectors bridge capabilities to real tools
 */

import { Module } from '@nestjs/common';

// Capability Registry (the catalog)
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';

// Execution Graph & Resolution
import { ExecutionGraphBuilderService } from './execution-graph/execution-graph-builder.service';
import { CapabilityResolverService } from './capability-resolver/capability-resolver.service';

// Worker Factory (creates/destroys ephemeral workers)
import { WorkerFactoryService } from './worker-factory/worker-factory.service';

// 10 Kernel Services (permanent)
import {
  MissionOrchestratorService,
  MissionPlannerService,
  TaskSchedulerService,
  ResourceManagerService,
  SecurityManagerService,
  CertificationManagerService,
  DeliveryManagerService,
  MonitoringManagerService,
  RecoveryManagerService,
} from './kernel/kernel-services';

// Mission Infrastructure
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { MissionMemoryService } from './memory/mission-memory.service';
import { MissionArchiveService } from './archive/mission-archive.service';

// Pipeline Orchestrator
import { MissionOrchestratorPipeline } from './mission-orchestrator/mission-orchestrator.service';

// Mission Runtime Engine — THE execution motor
import { MissionRuntimeEngine } from './runtime/mission-runtime.engine';

// Mission Metrics Tracker — KPI #1 = MSR
import { MissionMetricsService } from './runtime/mission-metrics.service';

// Sprint 2: Real Connectors
import { DevelopmentConnector } from './connectors/development-connector';
import { BrowserConnector } from './connectors/browser-connector';
import { CertificationConnector } from './connectors/certification-connector';
import { DeliveryConnector } from './connectors/delivery-connector';
import { OfficeConnector } from './connectors/office-connector';
import { BusinessConnector } from './connectors/business-connector';
import { ConnectorRegistry } from './connectors/connector-registry';

// API Controller
import { SoftwareFactoryController } from './software-factory.controller';

@Module({
  controllers: [SoftwareFactoryController],
  providers: [
    // ─── Capability Catalog (must be first) ───────────────────
    CapabilityRegistryService,

    // ─── Execution Graph & Resolution ─────────────────────────
    ExecutionGraphBuilderService,
    CapabilityResolverService,

    // ─── Sprint 2: Real Connectors (6 connectors) ────────────
    DevelopmentConnector,
    BrowserConnector,
    CertificationConnector,
    DeliveryConnector,
    OfficeConnector,
    BusinessConnector,
    ConnectorRegistry,

    // ─── Worker Factory (depends on ConnectorRegistry) ────────
    WorkerFactoryService,

    // ─── 10 Kernel Services (permanent) ───────────────────────
    MissionOrchestratorService,
    MissionPlannerService,
    TaskSchedulerService,
    ResourceManagerService,
    SecurityManagerService,
    CertificationManagerService,
    DeliveryManagerService,
    MonitoringManagerService,
    RecoveryManagerService,

    // ─── Mission Infrastructure ───────────────────────────────
    MissionContractService,
    MissionStateMachineService,
    MissionMemoryService,
    MissionArchiveService,

    // ─── Pipeline Orchestrator (depends on all above) ─────────
    MissionOrchestratorPipeline,

    // ─── Mission Runtime Engine — THE motor ───────────────────
    MissionRuntimeEngine,

    // ─── Mission Metrics Tracker — KPI #1 = MSR ───────────────
    MissionMetricsService,
  ],
  exports: [
    CapabilityRegistryService,
    ExecutionGraphBuilderService,
    CapabilityResolverService,
    WorkerFactoryService,
    ConnectorRegistry,
    MissionOrchestratorPipeline,
    MissionRuntimeEngine,
    MissionMetricsService,
    MissionContractService,
    MissionStateMachineService,
    MissionMemoryService,
    MissionArchiveService,
  ],
})
export class SoftwareFactoryModule {}
