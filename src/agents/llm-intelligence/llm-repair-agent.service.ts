/**
 * AENEWS Agent OS X - LLM Repair Agent
 * Uses LLM to intelligently diagnose failures and propose targeted fixes.
 * Goes beyond simple retry logic by understanding root causes and generating
 * context-aware repair strategies (retry, reassign, simplify, decompose, fallback, skip).
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const LLM_REPAIR_AGENT_CONFIG: AgentConfig = {
  id: 'llm-repair',
  name: 'LLMRepair',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent failure analyst and repair strategist using LLM reasoning. Diagnoses root causes of failures and proposes targeted, context-aware repair strategies with confidence levels and alternatives.',
  capabilities: [
    {
      name: 'diagnoseAndRepair',
      description: 'Diagnose a failure and propose a targeted repair strategy using LLM reasoning',
      inputSchema: {
        type: 'object',
        properties: {
          failedResult: { type: 'object', description: 'The failed execution result' },
          errorDetails: { type: 'object', description: 'Error details and stack traces' },
          executionContext: {
            type: 'object',
            description: 'Context in which the failure occurred',
          },
          attemptCount: { type: 'number', description: 'Number of previous attempts' },
        },
        required: ['failedResult', 'errorDetails'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rootCause: { type: 'string' },
          repairStrategy: {
            type: 'string',
            enum: ['retry', 'reassign', 'simplify', 'decompose', 'fallback', 'skip'],
          },
          repairParameters: { type: 'object' },
          confidenceLevel: { type: 'number', minimum: 0, maximum: 1 },
          alternativeStrategies: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'evaluateRepairOptions',
      description: 'Evaluate multiple repair options and recommend the best approach',
      inputSchema: {
        type: 'object',
        properties: {
          failureContext: { type: 'object', description: 'Full context of the failure' },
          availableOptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available repair options',
          },
          constraints: {
            type: 'object',
            description: 'Constraints on repair (time, budget, resources)',
          },
        },
        required: ['failureContext', 'availableOptions'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          recommendedOption: { type: 'string' },
          reasoning: { type: 'string' },
          tradeoffs: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:failure', 'write:repair'],
  maxConcurrentTasks: 4,
  timeout: 45000,
  retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const REPAIR_SYSTEM_PROMPT = `You are an expert failure analyst and repair strategist. Given a failed execution result with its error details and context, analyze the root cause and propose a specific repair strategy.

Repair strategies:
- retry: Same approach, try again (for transient errors)
- reassign: Assign to a different agent or capability (for capability mismatch)
- simplify: Simplify the task or reduce scope (for overly complex tasks)
- decompose: Break the failing task into smaller subtasks (for tasks too large to handle)
- fallback: Use an alternative approach entirely (for fundamental approach issues)
- skip: Skip this task as non-critical (for optional tasks blocking critical path)

Output JSON with: rootCause (string describing the root cause), repairStrategy (retry|reassign|simplify|decompose|fallback|skip), repairParameters (object with specific parameters for the repair), confidenceLevel (0-1 how confident you are in this repair), alternativeStrategies (array of {strategy, parameters, confidence} as backups).`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMRepairAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_REPAIR_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Repair agent initialized — intelligent failure diagnosis enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: REPAIR_SYSTEM_PROMPT,
          userPrompt: `Analyze this failure and propose a repair strategy: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.3,
          maxTokens: 4096,
        });

        const repair = this.parseRepairFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            repair,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM repair diagnosis failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based repair
    const payload = input.payload || {};
    const attemptCount = payload.attemptCount || 0;
    const strategy = attemptCount >= 3 ? 'fallback' : 'retry';

    return this.createAgentOutput(
      input.taskId,
      true,
      {
        repair: {
          rootCause: `Execution failed (rule-based diagnosis)`,
          repairStrategy: strategy,
          repairParameters:
            strategy === 'retry'
              ? { maxRetries: 2, delayMs: 3000, backoffMultiplier: 2 }
              : {
                  fallbackCapability: 'dev.backend',
                  reason: 'Switching to alternative approach after multiple failures',
                },
          confidenceLevel: 0.5,
          alternativeStrategies: [
            { strategy: 'simplify', parameters: { reduceScope: true }, confidence: 0.4 },
            { strategy: 'decompose', parameters: { maxSubtasks: 3 }, confidence: 0.35 },
          ],
        },
      },
      undefined,
      startTime,
    );
  }

  private parseRepairFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Repair agent destroyed');
  }
}
