/**
 * AENEWS Agent OS X - LLM Intelligence Cluster Module
 * Aggregates all 6 LLM-powered intelligence agents into a single NestJS module.
 * Imports AgentConnectorBridgeModule for LLM access via the connector infrastructure.
 * These agents form the brain of the platform — using LLM for intelligent
 * decision-making instead of rule-based logic.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { LLMPlannerAgentService } from './llm-planner-agent.service';
import { LLMCriticAgentService } from './llm-critic-agent.service';
import { LLMJudgeAgentService } from './llm-judge-agent.service';
import { LLMDecomposerAgentService } from './llm-decomposer-agent.service';
import { LLMRepairAgentService } from './llm-repair-agent.service';
import { LLMValidatorAgentService } from './llm-validator-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. LLM Planner — intelligent mission planning with LLM reasoning
    LLMPlannerAgentService,
    // 2. LLM Critic — semantic quality critique using LLM analysis
    LLMCriticAgentService,
    // 3. LLM Judge — final go/no-go arbitration via LLM reasoning
    LLMJudgeAgentService,
    // 4. LLM Decomposer — intelligent task decomposition with dependency ordering
    LLMDecomposerAgentService,
    // 5. LLM Repair — LLM-powered failure diagnosis and repair strategy
    LLMRepairAgentService,
    // 6. LLM Validator — contextual deliverable validation against requirements
    LLMValidatorAgentService,
  ],
  exports: [
    LLMPlannerAgentService,
    LLMCriticAgentService,
    LLMJudgeAgentService,
    LLMDecomposerAgentService,
    LLMRepairAgentService,
    LLMValidatorAgentService,
  ],
})
export class LLMIntelligenceClusterModule {}
