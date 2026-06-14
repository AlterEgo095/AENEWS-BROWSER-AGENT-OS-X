/**
 * AENEWS Agent OS X - Intelligent Orchestration Cluster Module
 * Aggregates all 4 Intelligent Orchestration agents into a single NestJS module.
 * Imports BaseAgentModule for shared infrastructure and AgentConnectorBridgeModule
 * for LLM-driven decision-making.
 *
 * Agents:
 *   1. MissionOrchestratorAI — LLM-driven mission orchestration, pipeline creation, failure handling
 *   2. DynamicScheduler — Intelligent scheduling, parallel/sequential decisions, rescheduling
 *   3. ResourceNegotiator — Resource allocation, conflict resolution, rebalancing
 *   4. PriorityArbiter — Priority conflict resolution, rebalancing, escalation management
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { MissionOrchestratorAIAgentService } from './mission-orchestrator-ai-agent.service';
import { DynamicSchedulerAgentService } from './dynamic-scheduler-agent.service';
import { ResourceNegotiatorAgentService } from './resource-negotiator-agent.service';
import { PriorityArbiterAgentService } from './priority-arbiter-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Mission Orchestrator AI — LLM-driven mission orchestration, pipeline adaptation, failure recovery
    MissionOrchestratorAIAgentService,
    // 2. Dynamic Scheduler — intelligent scheduling, parallelism optimization, dynamic rescheduling
    DynamicSchedulerAgentService,
    // 3. Resource Negotiator — resource allocation, conflict negotiation, utilization optimization
    ResourceNegotiatorAgentService,
    // 4. Priority Arbiter — priority conflict resolution, rebalancing, escalation management
    PriorityArbiterAgentService,
  ],
  exports: [
    MissionOrchestratorAIAgentService,
    DynamicSchedulerAgentService,
    ResourceNegotiatorAgentService,
    PriorityArbiterAgentService,
  ],
})
export class IntelligentOrchestrationClusterModule {}
