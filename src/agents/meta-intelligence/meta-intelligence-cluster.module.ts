/**
 * AENEWS Agent OS X - Meta Intelligence Cluster Module
 * Aggregates all 13 Meta Intelligence agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all meta intelligence agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { OrchestratorAgentService } from './orchestrator/orchestrator-agent.service';
import { PlannerAgentService } from './planner/planner-agent.service';
import { CriticAgentService } from './critic/critic-agent.service';
import { RepairAgentService } from './repair/repair-agent.service';
import { JudgeAgentService } from './judge/judge-agent.service';
import { LearningAgentService } from './learning/learning-agent.service';
import { MemoryManagerAgentService } from './memory-manager/memory-manager-agent.service';
import { SelfImprovementAgentService } from './self-improvement/self-improvement-agent.service';
import { MetaReasoningAgentService } from './meta-reasoning/meta-reasoning-agent.service';
import { TaskRouterAgentService } from './task-router/task-router-agent.service';
import { KnowledgeSynthesisAgentService } from './knowledge-synthesis/knowledge-synthesis-agent.service';
import { AdaptationAgentService } from './adaptation/adaptation-agent.service';
import { GovernanceAgentService } from './governance/governance-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Orchestrator — master orchestration, agent assignment, progress monitoring, workload rebalancing
    OrchestratorAgentService,
    // 2. Planner — strategic planning, goal decomposition, task prioritization, effort estimation
    PlannerAgentService,
    // 3. Critic — quality evaluation, scoring, issue identification, improvement suggestions
    CriticAgentService,
    // 4. Repair — failure diagnosis, output repair, retry with modifications, patch application
    RepairAgentService,
    // 5. Judge — final arbitration, decision making, conflict resolution, evidence evaluation
    JudgeAgentService,
    // 6. Learning — experience learning, knowledge updates, pattern identification, strategy adaptation
    LearningAgentService,
    // 7. Memory Manager — memory consolidation, storage optimization, archiving, context retrieval
    MemoryManagerAgentService,
    // 8. Self-Improvement — capability assessment, weakness identification, improvement planning
    SelfImprovementAgentService,
    // 9. Meta-Reasoning — reasoning analysis, bias detection, logic evaluation, inference validation
    MetaReasoningAgentService,
    // 10. Task Router — intelligent routing, agent selection, load balancing, overflow handling
    TaskRouterAgentService,
    // 11. Knowledge Synthesis — knowledge synthesis, insight merging, contradiction resolution, graph building
    KnowledgeSynthesisAgentService,
    // 12. Adaptation — configuration adaptation, parameter optimization, auto-tuning, change response
    AdaptationAgentService,
    // 13. Governance — policy enforcement, compliance auditing, governance review, exception management
    GovernanceAgentService,
  ],
  exports: [
    OrchestratorAgentService,
    PlannerAgentService,
    CriticAgentService,
    RepairAgentService,
    JudgeAgentService,
    LearningAgentService,
    MemoryManagerAgentService,
    SelfImprovementAgentService,
    MetaReasoningAgentService,
    TaskRouterAgentService,
    KnowledgeSynthesisAgentService,
    AdaptationAgentService,
    GovernanceAgentService,
  ],
})
export class MetaIntelligenceClusterModule {}
