/**
 * AENEWS Agent OS X - LLM Validator Agent
 * Uses LLM to validate mission deliverables against requirements contextually.
 * Goes beyond schema validation to understand whether deliverables truly meet
 * the intent and spirit of the requirements, not just their letter.
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

export const LLM_VALIDATOR_AGENT_CONFIG: AgentConfig = {
  id: 'llm-validator',
  name: 'LLMValidator',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'Intelligent deliverable validator using LLM reasoning to contextually validate mission results against requirements. Understands the intent behind requirements, not just their literal specification.',
  capabilities: [
    {
      name: 'validateDeliverables',
      description:
        'Validate mission deliverables against requirements using LLM contextual analysis',
      inputSchema: {
        type: 'object',
        properties: {
          missionRequirements: { type: 'object', description: 'Original mission requirements' },
          deliverables: { type: 'object', description: 'Produced deliverables to validate' },
          validationCriteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific validation criteria',
          },
          strictMode: { type: 'boolean', description: 'Whether to apply strict validation rules' },
        },
        required: ['missionRequirements', 'deliverables'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          validationScore: { type: 'number', minimum: 0, maximum: 100 },
          missingElements: { type: 'array', items: { type: 'string' } },
          qualityIssues: { type: 'array', items: { type: 'object' } },
          complianceStatus: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'validateCompliance',
      description: 'Validate deliverables against specific compliance standards',
      inputSchema: {
        type: 'object',
        properties: {
          deliverables: { type: 'object', description: 'Deliverables to check' },
          complianceStandards: {
            type: 'array',
            items: { type: 'string' },
            description: 'Compliance standards to check against',
          },
          context: { type: 'object', description: 'Validation context' },
        },
        required: ['deliverables', 'complianceStandards'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          compliant: { type: 'boolean' },
          violations: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:mission', 'write:validation'],
  maxConcurrentTasks: 5,
  timeout: 45000,
  retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};

// ─── System Prompt ────────────────────────────────────────────────

const VALIDATOR_SYSTEM_PROMPT = `You are an expert deliverable validator. Given the mission requirements and the produced deliverables, validate whether they meet the requirements.

Consider:
- Do the deliverables satisfy all stated requirements?
- Are there missing elements that were expected but not delivered?
- Are there quality issues that would prevent the deliverables from being used?
- Do the deliverables comply with relevant standards and best practices?
- Are there any gaps between what was requested and what was delivered?

Output JSON with: isValid (boolean), validationScore (0-100), missingElements (array of strings describing what is missing), qualityIssues (array of {severity, category, description}), complianceStatus ({overall: compliant|partial|non-compliant, details}), recommendations (array of strings suggesting improvements).`;

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LLMValidatorAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  protected defineConfig(): AgentConfig {
    return LLM_VALIDATOR_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('LLM Validator agent initialized — contextual deliverable validation enabled');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: VALIDATOR_SYSTEM_PROMPT,
          userPrompt: `Validate these deliverables against their requirements: ${JSON.stringify(input.payload, null, 2)}`,
          temperature: 0.2,
          maxTokens: 4096,
        });

        const validation = this.parseValidationFromLLM(llmResult.content);

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            validation,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
            tokensUsed: llmResult.tokenCount,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `LLM validation failed, falling back to rule-based: ${(error as Error).message}`,
        );
      }
    }

    // Fallback: simple rule-based validation
    const payload = input.payload || {};
    const hasDeliverables = payload.deliverables !== undefined && payload.deliverables !== null;
    const hasError = payload.deliverables?.error !== undefined;
    const isValid = hasDeliverables && !hasError;

    return this.createAgentOutput(
      input.taskId,
      true,
      {
        validation: {
          isValid,
          validationScore: isValid ? 60 : 20,
          missingElements: hasError
            ? [payload.deliverables.error]
            : hasDeliverables
              ? []
              : ['No deliverables provided'],
          qualityIssues: isValid
            ? []
            : [
                {
                  severity: 'major',
                  category: 'completeness',
                  description: 'Deliverables missing or contain errors',
                },
              ],
          complianceStatus: {
            overall: isValid ? 'partial' : 'non-compliant',
            details: 'Rule-based validation only — LLM unavailable for contextual analysis',
          },
          recommendations: isValid
            ? ['Consider LLM-based validation for deeper analysis']
            : ['Review deliverables for errors and retry'],
        },
      },
      undefined,
      startTime,
    );
  }

  private parseValidationFromLLM(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log('LLM Validator agent destroyed');
  }
}
