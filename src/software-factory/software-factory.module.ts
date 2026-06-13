/**
 * AENEWS Software Factory — Root Module
 * 
 * 7 Levels, 64 Agents:
 *   Level 1: Core Orchestration (10 permanent)
 *   Level 2: Browser Team (12 on-demand)
 *   Level 3: Development Team (12 on-demand)
 *   Level 4: Office Team (6 on-demand)
 *   Level 5: Business Team (8 on-demand)
 *   Level 6: Certification Team (8 on-demand)
 *   Level 7: Delivery Team (8 on-demand)
 * 
 * Philosophy: 10 permanent + 54 on-demand = 64 agents.
 * Typical mission: 15-25 agents active simultaneously.
 */

import { Module } from '@nestjs/common';

// Registry
import { AgentRegistryService } from './registry/agent-registry.service';

// Mission infrastructure
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { AgentPoolService } from './agent-pool/agent-pool.service';
import { MissionControlService } from './mission-control/mission-control.service';
import { DeliveryService } from './delivery/delivery.service';
import { MissionMemoryService } from './memory/mission-memory.service';
import { MissionArchiveService } from './archive/mission-archive.service';

// Core permanent agents (Level 1)
import {
  MissionOrchestratorAgent,
  MissionPlannerAgent,
  TaskSchedulerAgent,
  MemoryManagerAgent,
  ResourceManagerAgent,
  SecurityManagerAgent,
  CertificationManagerAgent,
  DeliveryManagerAgent,
  MonitoringManagerAgent,
  RecoveryManagerAgent,
} from './core/core-agents.service';

// Team coordinators (Levels 2-7)
import { BrowserTeamService } from './browser-team/browser-team.service';
import { DevTeamService } from './dev-team/dev-team.service';
import { OfficeTeamService } from './office-team/office-team.service';
import { BusinessTeamService } from './business-team/business-team.service';
import { CertTeamService } from './cert-team/cert-team.service';
import { DeliveryTeamService } from './delivery-team/delivery-team.service';

// Legacy team services (kept for backward compat)
import { PlanningTeamService } from './teams/planning/planning-team.service';
import { ExecutionTeamService } from './teams/execution/execution-team.service';
import { CertificationTeamService } from './teams/certification/certification-team.service';

@Module({
  providers: [
    // ─── Registry (must be first) ─────────────────────────────
    AgentRegistryService,

    // ─── Mission Infrastructure ───────────────────────────────
    MissionContractService,
    MissionStateMachineService,
    AgentPoolService,
    DeliveryService,
    MissionMemoryService,
    MissionArchiveService,

    // ─── Level 1: Core Permanent Agents (10) ──────────────────
    MissionOrchestratorAgent,
    MissionPlannerAgent,
    TaskSchedulerAgent,
    MemoryManagerAgent,
    ResourceManagerAgent,
    SecurityManagerAgent,
    CertificationManagerAgent,
    DeliveryManagerAgent,
    MonitoringManagerAgent,
    RecoveryManagerAgent,

    // ─── Level 2-7: Team Coordinators ─────────────────────────
    BrowserTeamService,
    DevTeamService,
    OfficeTeamService,
    BusinessTeamService,
    CertTeamService,
    DeliveryTeamService,

    // ─── Legacy Team Services ─────────────────────────────────
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,

    // ─── Orchestrator (depends on all above) ──────────────────
    MissionControlService,
  ],
  exports: [
    AgentRegistryService,
    MissionControlService,
    MissionContractService,
    MissionStateMachineService,
    AgentPoolService,
    MissionOrchestratorAgent,
    MissionPlannerAgent,
    TaskSchedulerAgent,
    MemoryManagerAgent,
    ResourceManagerAgent,
    SecurityManagerAgent,
    CertificationManagerAgent,
    DeliveryManagerAgent,
    MonitoringManagerAgent,
    RecoveryManagerAgent,
    BrowserTeamService,
    DevTeamService,
    OfficeTeamService,
    BusinessTeamService,
    CertTeamService,
    DeliveryTeamService,
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,
    DeliveryService,
    MissionMemoryService,
    MissionArchiveService,
  ],
})
export class SoftwareFactoryModule {}
