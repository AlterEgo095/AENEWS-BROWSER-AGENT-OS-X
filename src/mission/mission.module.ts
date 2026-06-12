/**
 * AENEWS Agent OS X - Mission Module
 *
 * Aggregates all mission-related services into a single NestJS module:
 *   - MissionOrchestratorService  — End-to-end mission lifecycle management
 *   - MissionPlannerService       — Instruction decomposition & plan generation
 *   - MissionMemoryService        — Scoped context, history & RAG within a mission
 *   - MissionMonitorService       — Progress tracking, health checks & alerts
 */

import { Module } from '@nestjs/common';
import { MissionOrchestratorService } from './mission-orchestrator.service';
import { MissionPlannerService } from './mission-planner.service';
import { MissionMemoryService } from './mission-memory.service';
import { MissionMonitorService } from './mission-monitor.service';

@Module({
  providers: [
    MissionOrchestratorService,
    MissionPlannerService,
    MissionMemoryService,
    MissionMonitorService,
  ],
  exports: [
    MissionOrchestratorService,
    MissionPlannerService,
    MissionMemoryService,
    MissionMonitorService,
  ],
})
export class MissionModule {}
