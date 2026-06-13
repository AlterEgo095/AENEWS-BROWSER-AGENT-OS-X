/**
 * AENEWS Agent OS X - LLM Planner Agent
 * Intelligent mission planner that uses LLM reasoning to produce optimal execution
 * strategies. Goes beyond rule-based planning by understanding mission semantics,
 * capability trade-offs, and constraint interactions.
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

export const LLM_PLANNER_AGENT_CONFIG: AgentConfig = {
  id: 'llm-planner',
  name: 'LLMPlanner',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent mission planner using LLM reasoning for optimal execution strategies. Understands mission semantics, capability trade-offs, and constraint interactions to produce detailed, actionable execution plans.',
  capabilities: [
    {
      name: 'planMission',
      description: 'Create an intelligent execution plan for a mission using LLM reasoning',
      inputSchema: {
        type: 'object',
        properties: {
          missionDescription: { type: 'string', description: 'Description of the mission to plan' },
          availableCapabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available capability packs',
          },
          constraints: {
            type: 'object',
            description: 'Planning constraints (time, budget, resources)',
          },
        },
        required: ['missionDescription'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          steps: { type: 'array', items: { type: 'object' } },
          strategy: { type: 'string', enum: ['sequential', 'parallel', 'hybrid'] },
          estimatedDurationMs: { type: 'number' },
          riskAssessment: { type: 'object' },
        },
      },
    },
    {
      name: 'replanMission',
      description: 'Re-plan a mission based on execution feedback and changed circumstances',
      inputSchema: {
        type: 'object',
        properties: {
          originalPlan: { type: 'object', description: 'The original execution plan' },
          executionFeedback: { type: 'object', description: 'Feedback from execution so far' },
          changedConstraints: { type: 'object', description: 'Updated constraints' },
        },
        required: ['originalPlan', 'executionFeedback'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          revisedPlan: { type: 'object' },
          changesFromOriginal: { type: 'array', items: { type: 'object' } },
          reasoning: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:mission', 'write:plan'],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const PLANNER_SYSTEM_PROMPT = `You are an expert mission planner for an AI agent platform. Given a mission description, available capabilities, and constraints, create a detailed execution plan.

Available capability packs:
- BROWSER: login, navigation, search, form, upload, download, screenshot, vision, session, cookie, popup, ocr
- DEVELOPMENT: architecture, frontend, backend, database, api, devops, docker, kubernetes, qa, test, debug, documentation
- OFFICE: pdf, docx, excel, powerpoint, ocr, signature, email, calendar
- BUSINESS: seo, marketing, copywriting, branding, crm, analytics, finance, sales, legal, partnership
- CERTIFICATION: architecture_review, security_audit, test_coverage, regression, performance, doc_review, integration, compliance, accessibility, data_privacy
- DELIVERY: zip, github, docker_registry, vps, cloud, pdf_report, notification, deployment, cdn, backup, monitoring_setup, load_balancer

Output a JSON execution plan with: steps (array of {capability, parameters, dependsOn}), strategy (sequential|parallel|hybrid), estimatedDurationMs, riskAssessment.`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMPlannerAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_PLANNER_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Planner agent initialized — intelligent mission planning enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: PLANNER_SYSTEM_PROMPT,
          userPrompt: `Plan this mission: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.2,
          maxTokens: 4096,
        });

        const plan = this.parsePlanFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            plan,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM planning failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based planning
    return this.createAgentOutput(
      input.taskId,
      true,
      {
        plan: {
          steps: [
            {
              capability: 'dev.architecture',
              parameters: input.payload,
              dependsOn: [],
            },
          ],
          strategy: 'sequential',
          estimatedDurationMs: 120000,
          riskAssessment: { level: 'low', notes: 'Fallback plan — LLM unavailable' },
        },
      },
      undefined,
      startTime,
    );
  }

  private parsePlanFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Planner agent destroyed');
  }
}
