/**
 * AENEWS Software Factory — Root Module
 * 
 * The Software Factory is a mission-oriented orchestrator that transforms
 * natural language instructions into certified, delivered results.
 * 
 * Architecture:
 *   Mission Control Center (orchestrator)
 *     ├── Mission Contract (single source of truth)
 *     ├── Mission State Machine (lifecycle management)
 *     ├── Dynamic Agent Pool (ephemeral agents)
 *     ├── Planning Team (Research, Architecture, Business, Marketing)
 *     ├── Execution Team (Browser, Coding, Office, Deployment)
 *     ├── Certification Team (QA, Security, Performance, Documentation)
 *     ├── Delivery Service (package & deliver artifacts)
 *     ├── Mission Memory (context + RAG + history)
 *     └── Mission Archive (reproducibility)
 */

import { Module } from '@nestjs/common';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine/mission-state-machine.service';
import { AgentPoolService } from './agent-pool/agent-pool.service';
import { MissionControlService } from './mission-control/mission-control.service';
import { PlanningTeamService } from './teams/planning/planning-team.service';
import { ExecutionTeamService } from './teams/execution/execution-team.service';
import { CertificationTeamService } from './teams/certification/certification-team.service';
import { DeliveryService } from './delivery/delivery.service';
import { MissionMemoryService } from './memory/mission-memory.service';
import { MissionArchiveService } from './archive/mission-archive.service';

@Module({
  providers: [
    // Core Services
    MissionContractService,
    MissionStateMachineService,
    AgentPoolService,

    // Teams
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,

    // Delivery & Support
    DeliveryService,
    MissionMemoryService,
    MissionArchiveService,

    // Orchestrator (depends on all above)
    MissionControlService,
  ],
  exports: [
    MissionControlService,
    MissionContractService,
    MissionStateMachineService,
    AgentPoolService,
    PlanningTeamService,
    ExecutionTeamService,
    CertificationTeamService,
    DeliveryService,
    MissionMemoryService,
    MissionArchiveService,
  ],
})
export class SoftwareFactoryModule {}
