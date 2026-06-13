/**
 * AENEWS Agent OS X - LLM Judge Agent
 * Final arbiter that uses LLM to make go/no-go decisions on mission results.
 * Goes beyond simple pass/fail by understanding the full context and producing
 * nuanced verdicts (approved, rejected, conditional) with detailed reasoning.
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

export const LLM_JUDGE_AGENT_CONFIG: AgentConfig = {
  id: 'llm-judge',
  name: 'LLMJudge',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent final arbiter using LLM reasoning for go/no-go decisions on mission results. Produces nuanced verdicts with detailed reasoning, confidence scores, and conditional requirements when applicable.',
  capabilities: [
    {
      name: 'judgeResult',
      description: 'Make a go/no-go decision on a mission result using LLM reasoning',
      inputSchema: {
        type: 'object',
        properties: {
          missionRequirements: { type: 'object', description: 'Original mission requirements' },
          executionResults: { type: 'object', description: 'The execution results to judge' },
          critiqueFeedback: { type: 'object', description: 'Prior critique feedback (if any)' },
        },
        required: ['missionRequirements', 'executionResults'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['approved', 'rejected', 'conditional'] },
          confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
          reasoning: { type: 'string' },
          conditions: { type: 'array', items: { type: 'string' } },
          requiredActions: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'arbitrateDispute',
      description: 'Arbitrate between conflicting agent outputs or recommendations',
      inputSchema: {
        type: 'object',
        properties: {
          conflictingOutputs: {
            type: 'array',
            items: { type: 'object' },
            description: 'Conflicting outputs to arbitrate',
          },
          context: { type: 'object', description: 'Context for arbitration' },
          criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Arbitration criteria',
          },
        },
        required: ['conflictingOutputs'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          selectedOutput: { type: 'string' },
          reasoning: { type: 'string' },
          confidenceScore: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:mission', 'write:verdict'],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `You are the final judge for AI mission results. Given the mission requirements and execution results, make a definitive assessment.

Consider:
- Were all requirements met?
- Is the quality sufficient for the stated purpose?
- Are there any risks or concerns with the deliverables?
- Is additional work needed before the results can be accepted?

Output JSON with: verdict (approved|rejected|conditional), confidenceScore (0-1), reasoning, conditions (if conditional, list of conditions that must be met), requiredActions (if conditional or rejected, list of {action, priority, assignee}).`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMJudgeAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_JUDGE_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Judge agent initialized — intelligent arbitration enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: JUDGE_SYSTEM_PROMPT,
          userPrompt: `Judge this mission result: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.15,
          maxTokens: 4096,
        });

        const verdict = this.parseVerdictFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            verdict,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM judging failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based judging
    const payload = input.payload || {};
    const isSuccess =
      payload.executionResults?.success !== false && payload.executionResults?.error === undefined;
    return this.createAgentOutput(
      input.taskId,
      true,
      {
        verdict: {
          verdict: isSuccess ? 'approved' : 'rejected',
          confidenceScore: isSuccess ? 0.7 : 0.6,
          reasoning: isSuccess
            ? 'Execution completed without errors (rule-based assessment)'
            : 'Execution reported failures or errors (rule-based assessment)',
          conditions: [],
          requiredActions: isSuccess
            ? []
            : [
                {
                  action: 'Review and fix reported errors',
                  priority: 'high',
                  assignee: 'repair-agent',
                },
              ],
        },
      },
      undefined,
      startTime,
    );
  }

  private parseVerdictFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Judge agent destroyed');
  }
}
