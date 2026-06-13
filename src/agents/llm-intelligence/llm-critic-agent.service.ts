/**
 * AENEWS Agent OS X - LLM Critic Agent
 * Uses LLM to intelligently critique execution results, going beyond rule-based
 * checks to understand semantic quality, correctness, completeness, and efficiency.
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

export const LLM_CRITIC_AGENT_CONFIG: AgentConfig = {
  id: 'llm-critic',
  name: 'LLMCritic',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent quality critic using LLM reasoning to evaluate execution results. Performs semantic quality analysis beyond rule-based checks — understands correctness, completeness, efficiency, and adherence to requirements.',
  capabilities: [
    {
      name: 'critiqueResult',
      description: 'Critique an execution result using LLM-based semantic analysis',
      inputSchema: {
        type: 'object',
        properties: {
          executionResult: { type: 'object', description: 'The execution result to critique' },
          requirements: { type: 'object', description: 'Requirements the result should satisfy' },
          evaluationCriteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific criteria to evaluate',
          },
        },
        required: ['executionResult'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          score: { type: 'number', minimum: 0, maximum: 100 },
          issues: { type: 'array', items: { type: 'object' } },
          strengths: { type: 'array', items: { type: 'string' } },
          overallAssessment: { type: 'string' },
        },
      },
    },
    {
      name: 'compareResults',
      description: 'Compare two execution results and determine which is superior',
      inputSchema: {
        type: 'object',
        properties: {
          resultA: { type: 'object', description: 'First execution result' },
          resultB: { type: 'object', description: 'Second execution result' },
          comparisonCriteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Criteria for comparison',
          },
        },
        required: ['resultA', 'resultB'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          preferredResult: { type: 'string', enum: ['A', 'B', 'tie'] },
          analysis: { type: 'object' },
          reasoning: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:result', 'write:critique'],
  maxConcurrentTasks: 5,
  timeout: 45000,
  retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const CRITIC_SYSTEM_PROMPT = `You are an expert quality critic for AI agent execution results. Analyze the provided execution results and evaluate: correctness, completeness, efficiency, adherence to requirements, and potential improvements.

For each issue found, classify its severity (critical|major|minor|info) and category (correctness|completeness|efficiency|compliance|usability|maintainability).

Output JSON with: score (0-100), issues (array of {severity, category, message, suggestion}), strengths, overallAssessment.`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMCriticAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_CRITIC_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Critic agent initialized — semantic quality evaluation enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: CRITIC_SYSTEM_PROMPT,
          userPrompt: `Critique this execution result: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.3,
          maxTokens: 4096,
        });

        const critique = this.parseCritiqueFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            critique,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM critique failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based critique
    const payload = input.payload || {};
    const score = payload.success !== false ? 70 : 30;
    return this.createAgentOutput(
      input.taskId,
      true,
      {
        critique: {
          score,
          issues:
            payload.success === false
              ? [
                  {
                    severity: 'critical',
                    category: 'correctness',
                    message: 'Execution failed',
                    suggestion: 'Review error details and retry',
                  },
                ]
              : [],
          strengths: payload.success !== false ? ['Execution completed successfully'] : [],
          overallAssessment: score >= 60 ? 'Acceptable result' : 'Result needs improvement',
        },
      },
      undefined,
      startTime,
    );
  }

  private parseCritiqueFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Critic agent destroyed');
  }
}
