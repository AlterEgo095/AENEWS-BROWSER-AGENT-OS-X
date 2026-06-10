/**
 * AENEWS Agent OS X - Orchestrator Module
 * Provides the full orchestration pipeline:
 * Decompose → Plan → Execute → Critique → Repair → Validate → Deliver
 */

import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { TaskDecomposerService } from './task-decomposer.service';
import { TaskPlannerService } from './task-planner.service';
import { TaskExecutorService } from './task-executor.service';
import { TaskCriticService } from './task-critic.service';
import { TaskRepairService } from './task-repair.service';
import { TaskValidatorService } from './task-validator.service';
import { TaskDeliveryService } from './task-delivery.service';
import { EventsModule } from '../events/events.module';
import { MemoryModule } from '../memory/memory.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';

@Module({
  imports: [EventsModule, MemoryModule, AgentRegistryModule],
  providers: [
    OrchestratorService,
    TaskDecomposerService,
    TaskPlannerService,
    TaskExecutorService,
    TaskCriticService,
    TaskRepairService,
    TaskValidatorService,
    TaskDeliveryService,
  ],
  exports: [
    OrchestratorService,
    TaskDecomposerService,
    TaskPlannerService,
    TaskExecutorService,
    TaskCriticService,
    TaskRepairService,
    TaskValidatorService,
    TaskDeliveryService,
  ],
})
export class OrchestratorModule {}
