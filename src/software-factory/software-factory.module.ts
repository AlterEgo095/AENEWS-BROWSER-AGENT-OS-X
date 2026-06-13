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

@Module({
  providers: [
    // ─── Capability Catalog (must be first) ───────────────────
    CapabilityRegistryService,

    // ─── Execution Graph & Resolution ─────────────────────────
    ExecutionGraphBuilderService,
    CapabilityResolverService,

    // ─── Worker Factory ───────────────────────────────────────
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
  ],
  exports: [
    CapabilityRegistryService,
    ExecutionGraphBuilderService,
    CapabilityResolverService,
    WorkerFactoryService,
    MissionOrchestratorPipeline,
    MissionContractService,
    MissionStateMachineService,
    MissionMemoryService,
    MissionArchiveService,
  ],
})
export class SoftwareFactoryModule {}
