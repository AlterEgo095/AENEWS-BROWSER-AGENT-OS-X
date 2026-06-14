/**
 * AENEWS Agent OS X - Meta Reasoning Agent
 * Reasoning about reasoning, meta-cognition for the Meta Intelligence cluster.
 * Handles reasoning analysis, bias detection, logic evaluation, reasoning improvement,
 * alternative generation, and inference validation.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const META_REASONING_AGENT_CONFIG: AgentConfig = {
  id: 'meta-reasoning',
  name: 'MetaReasoning',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Meta-reasoning agent that analyzes reasoning processes, detects biases, evaluates logic, improves reasoning strategies, generates alternatives, and validates inferences across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'analyzeReasoning',
      description: 'Analyze the reasoning process used in a decision or output',
      inputSchema: {
        type: 'object',
        properties: { reasoning: { type: 'object' }, depth: { type: 'string' } },
        required: ['reasoning'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          analysisId: { type: 'string' },
          structure: { type: 'object' },
          gaps: { type: 'array' },
          soundness: { type: 'number' },
        },
      },
    },
    {
      name: 'detectBias',
      description: 'Detect biases in reasoning or decision-making',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'any' },
          biasTypes: { type: 'array', items: { type: 'string' } },
        },
        required: ['content'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          biases: { type: 'array', items: { type: 'object' } },
          overallBiasScore: { type: 'number' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'evaluateLogic',
      description: 'Evaluate the logical soundness of an argument or reasoning chain',
      inputSchema: {
        type: 'object',
        properties: {
          premises: { type: 'array', items: { type: 'string' } },
          conclusion: { type: 'string' },
          logicType: { type: 'string' },
        },
        required: ['premises', 'conclusion'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          soundness: { type: 'number' },
          fallacies: { type: 'array', items: { type: 'string' } },
          evaluationId: { type: 'string' },
        },
      },
    },
    {
      name: 'improveReasoning',
      description: 'Suggest improvements to a reasoning process',
      inputSchema: {
        type: 'object',
        properties: {
          reasoning: { type: 'object' },
          targetArea: { type: 'string' },
          improvementGoal: { type: 'string' },
        },
        required: ['reasoning'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          improvements: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
          improvedReasoning: { type: 'object' },
        },
      },
    },
    {
      name: 'generateAlternative',
      description: 'Generate alternative reasoning paths or conclusions',
      inputSchema: {
        type: 'object',
        properties: {
          reasoning: { type: 'object' },
          count: { type: 'number' },
          constraints: { type: 'object' },
        },
        required: ['reasoning'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          alternatives: { type: 'array', items: { type: 'object' } },
          bestAlternative: { type: 'string' },
          diversityScore: { type: 'number' },
        },
      },
    },
    {
      name: 'validateInference',
      description: 'Validate that an inference is logically sound',
      inputSchema: {
        type: 'object',
        properties: {
          inference: { type: 'object' },
          evidence: { type: 'array', items: { type: 'object' } },
        },
        required: ['inference'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          confidence: { type: 'number' },
          issues: { type: 'array', items: { type: 'string' } },
          validationId: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:reasoning', 'write:analysis', 'read:logic'],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class MetaReasoningAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
    this.agentBridge = bridge ?? null;
  }
  private analyses: Map<string, any> = new Map();

  protected defineConfig(): AgentConfig {
    return META_REASONING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'analyzeReasoning',
      description: 'Analyze the reasoning process used in a decision or output',
      execute: async (params: { reasoning: Record<string, any>; depth?: string }) =>
        this.analyzeReasoning(params),
    });
    this.registerTool({
      name: 'detectBias',
      description: 'Detect biases in reasoning or decision-making',
      execute: async (params: { content: any; biasTypes?: string[] }) => this.detectBias(params),
    });
    this.registerTool({
      name: 'evaluateLogic',
      description: 'Evaluate the logical soundness of an argument or reasoning chain',
      execute: async (params: { premises: string[]; conclusion: string; logicType?: string }) =>
        this.evaluateLogic(params),
    });
    this.registerTool({
      name: 'improveReasoning',
      description: 'Suggest improvements to a reasoning process',
      execute: async (params: {
        reasoning: Record<string, any>;
        targetArea?: string;
        improvementGoal?: string;
      }) => this.improveReasoning(params),
    });
    this.registerTool({
      name: 'generateAlternative',
      description: 'Generate alternative reasoning paths or conclusions',
      execute: async (params: {
        reasoning: Record<string, any>;
        count?: number;
        constraints?: Record<string, any>;
      }) => this.generateAlternative(params),
    });
    this.registerTool({
      name: 'validateInference',
      description: 'Validate that an inference is logically sound',
      execute: async (params: {
        inference: Record<string, any>;
        evidence?: Array<{ claim: string; strength: number }>;
      }) => this.validateInference(params),
    });

    await this.storeInWorkingMemory(
      'meta-reasoning:initializedAt',
      new Date().toISOString(),
      600000,
    );
    this.logger.log('MetaReasoning agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    // Bridge: use LLM for reasoning analysis, bias detection, and logic evaluation
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed reasoning analysis, bias detection, and logic evaluation.`,
          userPrompt: JSON.stringify(input.payload),
          temperature: 0.3,
          maxTokens: 2048,
        });

        const analysis = llmResult.content;

        return this.createAgentOutput(
          input.taskId,
          true,
          { analysis, costUsd: llmResult.costUsd, tokensUsed: llmResult.tokenCount },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge LLM failed, fallback: ${(error as Error).message}`);
      }
    }

    const { action, ...params } = input.payload;
    if (!action)
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    const supportedActions = [
      'analyzeReasoning',
      'detectBias',
      'evaluateLogic',
      'improveReasoning',
      'generateAlternative',
      'validateInference',
    ];
    if (!supportedActions.includes(action))
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown meta-reasoning action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    try {
      const tool = this.getTool(action);
      if (!tool)
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      const result = await tool.execute(params);
      await this.storeInWorkingMemory(
        `meta-reasoning:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaReasoning execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.analyses.clear();
    this.logger.log('MetaReasoning agent destroyed, analyses cleared');
  }

  private async analyzeReasoning(params: {
    reasoning: Record<string, any>;
    depth?: string;
  }): Promise<{
    analysisId: string;
    structure: { type: string; steps: number; branching: boolean };
    gaps: string[];
    soundness: number;
  }> {
    const { reasoning, depth = 'standard' } = params;
    if (!reasoning || typeof reasoning !== 'object')
      throw new Error('Valid reasoning object is required');
    const analysisId = this.generateId();

    // Try LLM-powered reasoning analysis
    try {
      const systemPrompt = `You are a meta-reasoning expert. Analyze the reasoning process and identify its structure, gaps, and soundness. Return JSON: { "structure": { "type": "deductive|inductive|abductive|analogical", "steps": number, "branching": boolean }, "gaps": ["string"], "soundness": 0-100 }. Be thorough and specific.`;
      const userPrompt = `Reasoning: ${JSON.stringify(reasoning)}\nDepth: ${depth}\nAnalyze this reasoning process.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 1500,
        temperature: 0.3,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed?.structure || parsed?.gaps) {
        const result = {
          analysisId,
          structure: parsed.structure || {
            type: 'unknown',
            steps: Object.keys(reasoning).length,
            branching: false,
          },
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
          soundness: typeof parsed.soundness === 'number' ? parsed.soundness : 50,
        };
        this.analyses.set(analysisId, { reasoning, depth, ...result, timestamp: new Date() });
        this.logger.log(
          `LLM reasoning analyzed: id=${analysisId}, soundness=${result.soundness}, gaps=${result.gaps.length}`,
        );
        return result;
      }
    } catch (error) {
      this.logger.warn(
        `LLM reasoning analysis failed, using heuristic: ${(error as Error).message}`,
      );
    }

    // Heuristic fallback
    const steps = reasoning.steps ? reasoning.steps.length : Object.keys(reasoning).length;
    const hasBranching = reasoning.branches || reasoning.alternatives || false;
    const gaps: string[] = [];
    if (!reasoning.premises && !reasoning.assumptions)
      gaps.push('Missing explicit premises or assumptions');
    if (!reasoning.conclusion && !reasoning.outcome)
      gaps.push('Missing explicit conclusion or outcome');
    if (!reasoning.evidence && !reasoning.support) gaps.push('No supporting evidence provided');
    if (steps < 2) gaps.push('Reasoning chain is too short; may need more intermediate steps');
    const soundness = Math.max(20, 100 - gaps.length * 20 - (hasBranching ? 5 : 0));
    this.analyses.set(analysisId, { reasoning, depth, soundness, gaps, timestamp: new Date() });
    this.logger.log(
      `Reasoning analyzed: id=${analysisId}, steps=${steps}, soundness=${soundness}, gaps=${gaps.length}`,
    );
    return {
      analysisId,
      structure: { type: reasoning.type || 'deductive', steps, branching: hasBranching },
      gaps,
      soundness,
    };
  }

  private async detectBias(params: { content: any; biasTypes?: string[] }): Promise<{
    biases: Array<{ type: string; description: string; severity: string; location: string }>;
    overallBiasScore: number;
    recommendations: string[];
  }> {
    const {
      content,
      biasTypes = ['confirmation', 'anchoring', 'availability', 'recency', 'selection'],
    } = params;
    if (content === null || content === undefined)
      throw new Error('Content cannot be null or undefined');

    // Try LLM-powered bias detection
    try {
      const systemPrompt = `You are a cognitive bias detection expert. Analyze the content for the following bias types: ${biasTypes.join(', ')}. Return JSON: { "biases": [{ "type": "string", "description": "string", "severity": "low|medium|high", "location": "content|structure|methodology" }], "overallBiasScore": 0-100, "recommendations": ["string"] }. Be specific about where and how each bias manifests.`;
      const userPrompt = `Content: ${typeof content === 'string' ? content : JSON.stringify(content)}\nBias types to check: ${biasTypes.join(', ')}\nDetect cognitive biases.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 1500,
        temperature: 0.3,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed?.biases && Array.isArray(parsed.biases)) {
        this.logger.log(
          `LLM bias detected: count=${parsed.biases.length}, score=${parsed.overallBiasScore}`,
        );
        return {
          biases: parsed.biases,
          overallBiasScore:
            typeof parsed.overallBiasScore === 'number'
              ? parsed.overallBiasScore
              : Math.round(Math.max(0, 100 - parsed.biases.length * 20)),
          recommendations: parsed.recommendations || [
            'Review identified biases and consider alternative perspectives',
          ],
        };
      }
    } catch (error) {
      this.logger.warn(`LLM bias detection failed, using heuristic: ${(error as Error).message}`);
    }

    // Heuristic fallback
    const biases: Array<{ type: string; description: string; severity: string; location: string }> =
      [];
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const lower = contentStr.toLowerCase();
    if (
      biasTypes.includes('confirmation') &&
      (lower.includes('confirm') || lower.includes('prove'))
    ) {
      biases.push({
        type: 'confirmation',
        description: 'Language suggests seeking confirmation rather than disconfirmation',
        severity: 'medium',
        location: 'content',
      });
    }
    if (
      biasTypes.includes('anchoring') &&
      (lower.includes('initial') || lower.includes('starting') || lower.includes('baseline'))
    ) {
      biases.push({
        type: 'anchoring',
        description: 'Potential over-reliance on initial values or estimates',
        severity: 'low',
        location: 'content',
      });
    }
    if (
      biasTypes.includes('recency') &&
      (lower.includes('recent') || lower.includes('latest') || lower.includes('current'))
    ) {
      biases.push({
        type: 'recency',
        description: 'May over-weight recent information over historical data',
        severity: 'low',
        location: 'content',
      });
    }
    if (biasTypes.includes('selection') && typeof content === 'object' && content !== null) {
      const keys = Object.keys(content);
      if (keys.length < 3)
        biases.push({
          type: 'selection',
          description: 'Limited data points may indicate selective presentation',
          severity: 'medium',
          location: 'structure',
        });
    }
    const overallBiasScore = Math.round(Math.max(0, 100 - biases.length * 20));
    const recommendations =
      biases.length > 0
        ? [
            'Consider seeking disconfirming evidence',
            'Validate assumptions with diverse data sources',
            'Apply systematic review processes',
          ]
        : ['No significant biases detected; continue monitoring'];
    this.logger.log(`Bias detected: count=${biases.length}, score=${overallBiasScore}`);
    return { biases, overallBiasScore, recommendations };
  }

  private async evaluateLogic(params: {
    premises: string[];
    conclusion: string;
    logicType?: string;
  }): Promise<{ valid: boolean; soundness: number; fallacies: string[]; evaluationId: string }> {
    const { premises, conclusion, logicType = 'deductive' } = params;
    if (!premises || !Array.isArray(premises) || premises.length === 0)
      throw new Error('Non-empty premises array is required');
    if (!conclusion || typeof conclusion !== 'string')
      throw new Error('Valid conclusion string is required');
    const evaluationId = this.generateId();

    // Try LLM-powered logic evaluation
    try {
      const systemPrompt = `You are a formal logic expert. Evaluate whether the conclusion logically follows from the premises using ${logicType} reasoning. Identify any logical fallacies. Return JSON: { "valid": boolean, "soundness": 0-100, "fallacies": ["string"], "reasoning": "string" }. Be precise in your logical analysis.`;
      const userPrompt = `Premises: ${JSON.stringify(premises)}\nConclusion: ${conclusion}\nLogic type: ${logicType}\nEvaluate the logical validity.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 1500,
        temperature: 0.2,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed && typeof parsed.valid === 'boolean') {
        this.logger.log(
          `LLM logic evaluated: valid=${parsed.valid}, soundness=${parsed.soundness}, fallacies=${parsed.fallacies?.length || 0}`,
        );
        return {
          valid: parsed.valid,
          soundness:
            typeof parsed.soundness === 'number' ? parsed.soundness : parsed.valid ? 80 : 30,
          fallacies: Array.isArray(parsed.fallacies) ? parsed.fallacies : [],
          evaluationId,
        };
      }
    } catch (error) {
      this.logger.warn(`LLM logic evaluation failed, using heuristic: ${(error as Error).message}`);
    }

    // Heuristic fallback
    const fallacies: string[] = [];
    if (premises.length === 1 && logicType === 'deductive')
      fallacies.push('Oversimplified deduction: single premise rarely supports robust conclusion');
    const conclusionWords = conclusion.toLowerCase().split(/\s+/);
    const premiseWords = premises.flatMap((p) => p.toLowerCase().split(/\s+/));
    const overlap = conclusionWords.filter((w) => w.length > 3 && premiseWords.includes(w)).length;
    if (overlap < conclusionWords.length * 0.2)
      fallacies.push('Non sequitur risk: conclusion terms not well-connected to premises');
    if (conclusion.toLowerCase().includes('all') || conclusion.toLowerCase().includes('every'))
      fallacies.push('Hasty generalization risk: universal claims from limited premises');
    const soundness = Math.max(10, 100 - fallacies.length * 25);
    const valid = fallacies.length === 0 && soundness >= 60;
    this.logger.log(
      `Logic evaluated: valid=${valid}, soundness=${soundness}, fallacies=${fallacies.length}`,
    );
    return { valid, soundness, fallacies, evaluationId };
  }

  private async improveReasoning(params: {
    reasoning: Record<string, any>;
    targetArea?: string;
    improvementGoal?: string;
  }): Promise<{
    improvements: Array<{ area: string; suggestion: string; priority: string }>;
    confidence: number;
    improvedReasoning: Record<string, any>;
  }> {
    const { reasoning, targetArea = 'all', improvementGoal = 'soundness' } = params;
    if (!reasoning || typeof reasoning !== 'object')
      throw new Error('Valid reasoning object is required');

    // Try LLM-powered reasoning improvement
    try {
      const systemPrompt = `You are a reasoning improvement expert. Analyze the reasoning and suggest specific improvements targeting ${targetArea} with the goal of ${improvementGoal}. Return JSON: { "improvements": [{ "area": "string", "suggestion": "string", "priority": "high|medium|low" }], "confidence": 0.0-1.0, "improvedReasoning": { } }. The improvedReasoning should incorporate the improvements into a better version of the original reasoning.`;
      const userPrompt = `Reasoning: ${JSON.stringify(reasoning)}\nTarget area: ${targetArea}\nImprovement goal: ${improvementGoal}\nSuggest improvements.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 2048,
        temperature: 0.4,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed?.improvements && Array.isArray(parsed.improvements)) {
        this.logger.log(
          `LLM reasoning improved: improvements=${parsed.improvements.length}, confidence=${parsed.confidence}`,
        );
        return {
          improvements: parsed.improvements,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          improvedReasoning: parsed.improvedReasoning || {
            ...reasoning,
            _improvements: parsed.improvements.map((i: any) => i.area),
          },
        };
      }
    } catch (error) {
      this.logger.warn(
        `LLM reasoning improvement failed, using heuristic: ${(error as Error).message}`,
      );
    }

    // Heuristic fallback
    const improvements: Array<{ area: string; suggestion: string; priority: string }> = [];
    if (!reasoning.premises && !reasoning.assumptions)
      improvements.push({
        area: 'premises',
        suggestion: 'Add explicit premises or assumptions to strengthen the foundation',
        priority: 'high',
      });
    if (!reasoning.evidence && !reasoning.support)
      improvements.push({
        area: 'evidence',
        suggestion: 'Include supporting evidence to back reasoning steps',
        priority: 'high',
      });
    if (!reasoning.alternatives && !reasoning.counterarguments)
      improvements.push({
        area: 'alternatives',
        suggestion: 'Consider alternative viewpoints and counterarguments',
        priority: 'medium',
      });
    if (!reasoning.limitations)
      improvements.push({
        area: 'limitations',
        suggestion: 'Acknowledge limitations and boundary conditions',
        priority: 'medium',
      });
    if (!reasoning.confidence)
      improvements.push({
        area: 'confidence',
        suggestion: 'Add confidence levels to reasoning steps',
        priority: 'low',
      });
    const improvedReasoning = JSON.parse(JSON.stringify(reasoning));
    improvedReasoning._improvements = improvements.map((i) => i.area);
    improvedReasoning._improvedAt = new Date().toISOString();
    if (!improvedReasoning.premises)
      improvedReasoning.premises = ['[Added: explicit premise required]'];
    if (!improvedReasoning.confidence) improvedReasoning.confidence = 0.7;
    const confidence =
      improvements.length === 0 ? 0.9 : Math.max(0.4, 0.9 - improvements.length * 0.1);
    this.logger.log(
      `Reasoning improved: improvements=${improvements.length}, confidence=${confidence.toFixed(2)}`,
    );
    return { improvements, confidence, improvedReasoning };
  }

  private async generateAlternative(params: {
    reasoning: Record<string, any>;
    count?: number;
    constraints?: Record<string, any>;
  }): Promise<{
    alternatives: Array<{ id: string; description: string; approach: string; feasibility: number }>;
    bestAlternative: string;
    diversityScore: number;
  }> {
    const { reasoning, count = 3, constraints = {} } = params;
    if (!reasoning || typeof reasoning !== 'object')
      throw new Error('Valid reasoning object is required');

    // Try LLM-powered alternative generation
    try {
      const systemPrompt = `You are a reasoning alternative generator. Generate ${count} alternative reasoning paths or conclusions for the given reasoning. Consider constraints: ${JSON.stringify(constraints)}. Return JSON: { "alternatives": [{ "id": "string", "description": "string", "approach": "inductive|deductive|abductive|analogical|statistical", "feasibility": 0.0-1.0 }], "bestAlternative": "id of best", "diversityScore": 0.0-1.0 }. Ensure alternatives are meaningfully different.`;
      const userPrompt = `Reasoning: ${JSON.stringify(reasoning)}\nCount: ${count}\nConstraints: ${JSON.stringify(constraints)}\nGenerate alternative reasoning paths.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 1500,
        temperature: 0.6,
      });

      const parsed = this.parseLLMResponse(response);
      if (
        parsed?.alternatives &&
        Array.isArray(parsed.alternatives) &&
        parsed.alternatives.length > 0
      ) {
        this.logger.log(
          `LLM alternatives generated: count=${parsed.alternatives.length}, best=${parsed.bestAlternative}, diversity=${parsed.diversityScore}`,
        );
        return {
          alternatives: parsed.alternatives,
          bestAlternative: parsed.bestAlternative || parsed.alternatives[0]?.id || 'alt-0',
          diversityScore:
            typeof parsed.diversityScore === 'number'
              ? parsed.diversityScore
              : Math.min(1.0, (parsed.alternatives.length / 3) * 0.7 + 0.3),
        };
      }
    } catch (error) {
      this.logger.warn(
        `LLM alternative generation failed, using heuristic: ${(error as Error).message}`,
      );
    }

    // Heuristic fallback
    const approaches = ['inductive', 'deductive', 'abductive', 'analogical', 'statistical'];
    const alternatives = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
      id: `alt-${i}`,
      description: `Alternative ${i + 1}: Approach the problem using ${approaches[i % approaches.length]} reasoning`,
      approach: approaches[i % approaches.length],
      feasibility: 0.5 + Math.random() * 0.4,
    }));
    alternatives.sort((a, b) => b.feasibility - a.feasibility);
    const bestAlternative = alternatives[0].id;
    const diversityScore = Math.min(1.0, (alternatives.length / 3) * 0.7 + 0.3);
    this.logger.log(
      `Alternatives generated: count=${alternatives.length}, best=${bestAlternative}, diversity=${diversityScore.toFixed(2)}`,
    );
    return { alternatives, bestAlternative, diversityScore };
  }

  private async validateInference(params: {
    inference: Record<string, any>;
    evidence?: Array<{ claim: string; strength: number }>;
  }): Promise<{ valid: boolean; confidence: number; issues: string[]; validationId: string }> {
    const { inference, evidence = [] } = params;
    if (!inference || typeof inference !== 'object')
      throw new Error('Valid inference object is required');
    const validationId = this.generateId();

    // Try LLM-powered inference validation
    try {
      const systemPrompt = `You are an inference validation expert. Validate that the inference is logically sound given the evidence. Return JSON: { "valid": boolean, "confidence": 0.0-1.0, "issues": ["string"], "reasoning": "string" }. Be thorough and identify any logical gaps.`;
      const userPrompt = `Inference: ${JSON.stringify(inference)}\nEvidence: ${JSON.stringify(evidence)}\nValidate the inference.`;

      const response = await this.executeWithLLM(systemPrompt, userPrompt, {
        maxTokens: 1500,
        temperature: 0.3,
      });

      const parsed = this.parseLLMResponse(response);
      if (parsed && typeof parsed.valid === 'boolean') {
        this.logger.log(
          `LLM inference validated: valid=${parsed.valid}, confidence=${parsed.confidence}, issues=${parsed.issues?.length || 0}`,
        );
        return {
          valid: parsed.valid,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          validationId,
        };
      }
    } catch (error) {
      this.logger.warn(
        `LLM inference validation failed, using heuristic: ${(error as Error).message}`,
      );
    }

    // Heuristic fallback
    const issues: string[] = [];
    if (!inference.premise && !inference.input)
      issues.push('Inference lacks explicit premise or input');
    if (!inference.conclusion && !inference.output)
      issues.push('Inference lacks explicit conclusion or output');
    if (evidence.length === 0) issues.push('No supporting evidence provided for validation');
    const avgEvidenceStrength =
      evidence.length > 0 ? evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length : 0;
    if (avgEvidenceStrength < 0.5) issues.push('Supporting evidence has low average strength');
    const confidence = Math.max(0.1, 0.9 - issues.length * 0.2);
    const valid = issues.length === 0;
    this.logger.log(
      `Inference validated: valid=${valid}, confidence=${confidence.toFixed(2)}, issues=${issues.length}`,
    );
    return { valid, confidence, issues, validationId };
  }
}
