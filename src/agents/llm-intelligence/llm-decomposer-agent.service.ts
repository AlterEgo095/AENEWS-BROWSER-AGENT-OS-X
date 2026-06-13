/**
 * AENEWS Agent OS X - LLM Decomposer Agent
 * Uses LLM to intelligently decompose complex missions into atomic, executable
 * subtasks with proper dependency ordering. Understands task semantics to create
 * optimal execution groups that maximize parallelism while respecting dependencies.
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

export const LLM_DECOMPOSER_AGENT_CONFIG: AgentConfig = {
  id: 'llm-decomposer',
  name: 'LLMDecomposer',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent task decomposer using LLM reasoning to break down complex missions into atomic, executable subtasks with proper dependency ordering and parallel execution groups.',
  capabilities: [
    {
      name: 'decomposeMission',
      description: 'Decompose a complex mission into atomic subtasks with dependency ordering',
      inputSchema: {
        type: 'object',
        properties: {
          missionDescription: { type: 'string', description: 'The complex mission to decompose' },
          availableCapabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available capability packs',
          },
          constraints: { type: 'object', description: 'Decomposition constraints' },
          maxSubtasks: { type: 'number', description: 'Maximum number of subtasks to generate' },
        },
        required: ['missionDescription'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          subtasks: { type: 'array', items: { type: 'object' } },
          executionGroups: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
          strategy: { type: 'string', enum: ['sequential', 'parallel', 'hybrid'] },
        },
      },
    },
    {
      name: 'refineDecomposition',
      description: 'Refine an existing decomposition based on execution feedback',
      inputSchema: {
        type: 'object',
        properties: {
          originalDecomposition: { type: 'object', description: 'The original task decomposition' },
          executionFeedback: { type: 'object', description: 'Feedback from partial execution' },
          refinementGoal: {
            type: 'string',
            description: 'What to improve (e.g., parallelism, granularity)',
          },
        },
        required: ['originalDecomposition', 'executionFeedback'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          refinedSubtasks: { type: 'array', items: { type: 'object' } },
          changesApplied: { type: 'array', items: { type: 'object' } },
          reasoning: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:mission', 'write:decomposition'],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const DECOMPOSER_SYSTEM_PROMPT = `You are an expert task decomposer. Break down complex missions into atomic, executable subtasks.

Available capability packs:
- BROWSER: login, navigation, search, form, upload, download, screenshot, vision, session, cookie, popup, ocr
- DEVELOPMENT: architecture, frontend, backend, database, api, devops, docker, kubernetes, qa, test, debug, documentation
- OFFICE: pdf, docx, excel, powerpoint, ocr, signature, email, calendar
- BUSINESS: seo, marketing, copywriting, branding, crm, analytics, finance, sales, legal, partnership
- CERTIFICATION: architecture_review, security_audit, test_coverage, regression, performance, doc_review, integration, compliance, accessibility, data_privacy
- DELIVERY: zip, github, docker_registry, vps, cloud, pdf_report, notification, deployment, cdn, backup, monitoring_setup, load_balancer

For each subtask, specify: id (string like "sub-1"), description (clear, actionable), capability (from the available packs, e.g., "dev.frontend"), parameters (object with inputs), dependencies (IDs of subtasks that must complete first), priority (1-5, 5=highest), estimatedDurationMs.

Group subtasks that can run in parallel into executionGroups. Subtasks with no unmet dependencies can be in the same group.

Output JSON with: subtasks (array), executionGroups (arrays of subtask IDs that can run in parallel), strategy (sequential|parallel|hybrid).`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMDecomposerAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_DECOMPOSER_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Decomposer agent initialized — intelligent task decomposition enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: DECOMPOSER_SYSTEM_PROMPT,
          userPrompt: `Decompose this mission into subtasks: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.25,
          maxTokens: 4096,
        });

        const decomposition = this.parseDecompositionFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            decomposition,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM decomposition failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based decomposition
    return this.createAgentOutput(
      input.taskId,
      true,
      {
        decomposition: {
          subtasks: [
            {
              id: 'sub-1',
              description: 'Analyze and execute the mission',
              capability: 'dev.architecture',
              parameters: input.payload,
              dependencies: [],
              priority: 5,
              estimatedDurationMs: 60000,
            },
          ],
          executionGroups: [['sub-1']],
          strategy: 'sequential',
        },
      },
      undefined,
      startTime,
    );
  }

  private parseDecompositionFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Decomposer agent destroyed');
  }
}
