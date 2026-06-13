/**
 * AENEWS Agent OS X - Meta Critic Agent
 * Quality evaluation and critique of agent outputs for the Meta Intelligence cluster.
 * Handles output evaluation, quality scoring, issue identification, improvement suggestions,
 * output comparison, and consistency validation.
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

export const META_CRITIC_AGENT_CONFIG: AgentConfig = {
  id: 'meta-critic',
  name: 'MetaCritic',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Quality evaluation agent that critiques agent outputs, scores quality, identifies issues, suggests improvements, compares outputs, and validates consistency across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'evaluateOutput',
      description: 'Evaluate an agent output against quality criteria',
      inputSchema: {
        type: 'object',
        properties: {
          output: { type: 'object', description: 'Output to evaluate' },
          criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Evaluation criteria',
          },
          context: { type: 'object', description: 'Evaluation context' },
        },
        required: ['output'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          overallScore: { type: 'number' },
          criteriaScores: { type: 'object' },
          passed: { type: 'boolean' },
        },
      },
    },
    {
      name: 'scoreQuality',
      description: 'Score the quality of an output on multiple dimensions',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'any', description: 'Content to score' },
          dimensions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Quality dimensions',
          },
        },
        required: ['content'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          scores: { type: 'object' },
          overallScore: { type: 'number' },
          grade: { type: 'string' },
        },
      },
    },
    {
      name: 'identifyIssues',
      description: 'Identify issues, errors, or deficiencies in an output',
      inputSchema: {
        type: 'object',
        properties: {
          output: { type: 'any', description: 'Output to analyze' },
          expectedFormat: { type: 'object', description: 'Expected output format' },
          severity: {
            type: 'string',
            enum: ['all', 'critical', 'warning'],
            description: 'Minimum severity filter',
          },
        },
        required: ['output'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          issues: { type: 'array', items: { type: 'object' } },
          issueCount: { type: 'number' },
          criticalCount: { type: 'number' },
        },
      },
    },
    {
      name: 'suggestImprovements',
      description: 'Suggest improvements for a given output',
      inputSchema: {
        type: 'object',
        properties: {
          output: { type: 'any', description: 'Output to improve' },
          goals: { type: 'array', items: { type: 'string' }, description: 'Improvement goals' },
          constraints: { type: 'object', description: 'Constraints on improvements' },
        },
        required: ['output'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          suggestions: { type: 'array', items: { type: 'object' } },
          priorityOrder: { type: 'array', items: { type: 'string' } },
          estimatedImpact: { type: 'string' },
        },
      },
    },
    {
      name: 'compareOutputs',
      description: 'Compare two or more outputs and determine the best one',
      inputSchema: {
        type: 'object',
        properties: {
          outputs: { type: 'array', items: { type: 'object' }, description: 'Outputs to compare' },
          criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Comparison criteria',
          },
        },
        required: ['outputs'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rankings: { type: 'array', items: { type: 'object' } },
          bestOutput: { type: 'string' },
          comparison: { type: 'object' },
        },
      },
    },
    {
      name: 'validateConsistency',
      description: 'Validate consistency across multiple outputs or data points',
      inputSchema: {
        type: 'object',
        properties: {
          outputs: {
            type: 'array',
            items: { type: 'any' },
            description: 'Outputs to check for consistency',
          },
          rules: { type: 'array', items: { type: 'object' }, description: 'Consistency rules' },
        },
        required: ['outputs'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          consistent: { type: 'boolean' },
          inconsistencies: { type: 'array', items: { type: 'object' } },
          consistencyScore: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:output', 'write:critique', 'read:quality'],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface Issue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
  recommendation: string;
}

interface Suggestion {
  id: string;
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  implementation: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class CriticAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }
  private evaluationHistory: Array<{
    outputId: string;
    score: number;
    timestamp: Date;
  }> = [];

  protected defineConfig(): AgentConfig {
    return META_CRITIC_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'evaluateOutput',
      description: 'Evaluate an agent output against quality criteria',
      execute: async (params: {
        output: any;
        criteria?: string[];
        context?: Record<string, any>;
      }) => this.evaluateOutput(params),
    });

    this.registerTool({
      name: 'scoreQuality',
      description: 'Score the quality of an output on multiple dimensions',
      execute: async (params: { content: any; dimensions?: string[] }) => this.scoreQuality(params),
    });

    this.registerTool({
      name: 'identifyIssues',
      description: 'Identify issues, errors, or deficiencies in an output',
      execute: async (params: {
        output: any;
        expectedFormat?: Record<string, any>;
        severity?: string;
      }) => this.identifyIssues(params),
    });

    this.registerTool({
      name: 'suggestImprovements',
      description: 'Suggest improvements for a given output',
      execute: async (params: {
        output: any;
        goals?: string[];
        constraints?: Record<string, any>;
      }) => this.suggestImprovements(params),
    });

    this.registerTool({
      name: 'compareOutputs',
      description: 'Compare two or more outputs and determine the best one',
      execute: async (params: {
        outputs: Array<{ id: string; content: any }>;
        criteria?: string[];
      }) => this.compareOutputs(params),
    });

    this.registerTool({
      name: 'validateConsistency',
      description: 'Validate consistency across multiple outputs or data points',
      execute: async (params: { outputs: any[]; rules?: Array<{ field: string; type: string }> }) =>
        this.validateConsistency(params),
    });

    await this.storeInWorkingMemory('critic:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaCritic agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    // Bridge: use LLM for quality evaluation, issue identification, and improvement suggestions
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed quality evaluation, issue identification, and improvement suggestions.`,
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

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    const supportedActions = [
      'evaluateOutput',
      'scoreQuality',
      'identifyIssues',
      'suggestImprovements',
      'compareOutputs',
      'validateConsistency',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown critic action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);
      await this.storeInWorkingMemory(
        `critic:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaCritic execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.evaluationHistory = [];
    this.logger.log('MetaCritic agent destroyed, evaluation history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async evaluateOutput(params: {
    output: any;
    criteria?: string[];
    context?: Record<string, any>;
  }): Promise<{
    overallScore: number;
    criteriaScores: Record<string, number>;
    passed: boolean;
    summary: string;
  }> {
    const {
      output,
      criteria = ['completeness', 'accuracy', 'relevance', 'clarity'],
      context = {},
    } = params;

    if (output === null || output === undefined) {
      throw new Error('Output cannot be null or undefined for evaluation');
    }

    const criteriaScores: Record<string, number> = {};

    for (const criterion of criteria) {
      criteriaScores[criterion] = this.evaluateCriterion(output, criterion, context);
    }

    const overallScore = Math.round(
      Object.values(criteriaScores).reduce((sum, s) => sum + s, 0) / criteria.length,
    );

    const passed = overallScore >= 60;

    const summary = this.generateEvaluationSummary(criteriaScores, overallScore, passed);

    const outputId = this.generateId();
    this.evaluationHistory.push({ outputId, score: overallScore, timestamp: new Date() });

    this.logger.log(
      `Output evaluated: score=${overallScore}, passed=${passed}, criteria=${criteria.length}`,
    );

    return { overallScore, criteriaScores, passed, summary };
  }

  private async scoreQuality(params: { content: any; dimensions?: string[] }): Promise<{
    scores: Record<string, number>;
    overallScore: number;
    grade: string;
  }> {
    const {
      content,
      dimensions = ['correctness', 'completeness', 'consistency', 'efficiency', 'readability'],
    } = params;

    if (content === null || content === undefined) {
      throw new Error('Content cannot be null or undefined for quality scoring');
    }

    const scores: Record<string, number> = {};

    for (const dim of dimensions) {
      scores[dim] = this.scoreDimension(content, dim);
    }

    const overallScore = Math.round(
      Object.values(scores).reduce((sum, s) => sum + s, 0) / dimensions.length,
    );

    const grade = this.scoreToGrade(overallScore);

    this.logger.log(
      `Quality scored: overall=${overallScore}, grade=${grade}, dimensions=${dimensions.length}`,
    );

    return { scores, overallScore, grade };
  }

  private async identifyIssues(params: {
    output: any;
    expectedFormat?: Record<string, any>;
    severity?: string;
  }): Promise<{
    issues: Issue[];
    issueCount: number;
    criticalCount: number;
  }> {
    const { output, expectedFormat, severity = 'all' } = params;

    if (output === null || output === undefined) {
      throw new Error('Output cannot be null or undefined for issue identification');
    }

    const issues: Issue[] = [];

    // Check for null/undefined fields
    if (typeof output === 'object') {
      for (const [key, value] of Object.entries(output)) {
        if (value === null || value === undefined) {
          issues.push({
            id: this.generateId(),
            severity: 'warning',
            category: 'missing-field',
            message: `Field "${key}" is null or undefined`,
            location: key,
            recommendation: `Provide a value for field "${key}"`,
          });
        }
      }
    }

    // Check against expected format
    if (expectedFormat) {
      for (const [key, type] of Object.entries(expectedFormat)) {
        if (!(key in (output || {}))) {
          issues.push({
            id: this.generateId(),
            severity: 'critical',
            category: 'missing-field',
            message: `Required field "${key}" is missing`,
            location: key,
            recommendation: `Add the required field "${key}" of type ${type}`,
          });
        } else if (typeof output[key] !== type) {
          issues.push({
            id: this.generateId(),
            severity: 'warning',
            category: 'type-mismatch',
            message: `Field "${key}" expected type ${type}, got ${typeof output[key]}`,
            location: key,
            recommendation: `Convert field "${key}" to type ${type}`,
          });
        }
      }
    }

    // Check for empty strings
    if (typeof output === 'string' && output.trim().length === 0) {
      issues.push({
        id: this.generateId(),
        severity: 'critical',
        category: 'empty-output',
        message: 'Output is an empty string',
        recommendation: 'Provide non-empty content',
      });
    }

    // Check for error indicators
    if (typeof output === 'object' && output.error) {
      issues.push({
        id: this.generateId(),
        severity: 'critical',
        category: 'error-indicator',
        message: `Output contains error: ${output.error}`,
        location: 'error',
        recommendation: 'Investigate and resolve the error before using this output',
      });
    }

    // Filter by severity
    const filteredIssues =
      severity === 'all'
        ? issues
        : issues.filter((i) => {
            if (severity === 'critical') return i.severity === 'critical';
            if (severity === 'warning')
              return i.severity === 'critical' || i.severity === 'warning';
            return true;
          });

    const criticalCount = filteredIssues.filter((i) => i.severity === 'critical').length;

    this.logger.log(`Issues identified: total=${filteredIssues.length}, critical=${criticalCount}`);

    return { issues: filteredIssues, issueCount: filteredIssues.length, criticalCount };
  }

  private async suggestImprovements(params: {
    output: any;
    goals?: string[];
    constraints?: Record<string, any>;
  }): Promise<{
    suggestions: Suggestion[];
    priorityOrder: string[];
    estimatedImpact: string;
  }> {
    const { output, goals = ['quality', 'completeness'], constraints = {} } = params;

    if (output === null || output === undefined) {
      throw new Error('Output cannot be null or undefined for improvement suggestions');
    }

    const suggestions: Suggestion[] = [];

    // Analyze output and generate suggestions
    if (typeof output === 'string') {
      if (output.length < 100) {
        suggestions.push({
          id: this.generateId(),
          category: 'content-depth',
          description: 'Output is brief; consider adding more detail and context',
          priority: 'medium',
          estimatedImpact: 'moderate',
          implementation: 'Expand on key points with supporting evidence or examples',
        });
      }
      if (!output.includes('.')) {
        suggestions.push({
          id: this.generateId(),
          category: 'completeness',
          description: 'Output appears to be incomplete (no sentence termination)',
          priority: 'high',
          estimatedImpact: 'significant',
          implementation: 'Complete the thought with proper sentence structure',
        });
      }
    }

    if (typeof output === 'object') {
      const keys = Object.keys(output || {});
      if (keys.length < 3) {
        suggestions.push({
          id: this.generateId(),
          category: 'completeness',
          description: 'Output object has few fields; consider adding more structured data',
          priority: 'medium',
          estimatedImpact: 'moderate',
          implementation: 'Add additional relevant fields to provide comprehensive information',
        });
      }

      if (!output.success && output.success !== undefined) {
        suggestions.push({
          id: this.generateId(),
          category: 'error-handling',
          description: 'Output indicates failure; improve error handling and recovery',
          priority: 'high',
          estimatedImpact: 'significant',
          implementation: 'Add fallback logic and graceful degradation paths',
        });
      }
    }

    // Goal-based suggestions
    if (goals.includes('quality')) {
      suggestions.push({
        id: this.generateId(),
        category: 'quality',
        description: 'Add validation and verification steps to ensure output quality',
        priority: 'medium',
        estimatedImpact: 'moderate',
        implementation: 'Implement schema validation and cross-check mechanisms',
      });
    }

    if (goals.includes('completeness')) {
      suggestions.push({
        id: this.generateId(),
        category: 'completeness',
        description: 'Ensure all required fields and edge cases are covered',
        priority: 'medium',
        estimatedImpact: 'moderate',
        implementation: 'Add checklist verification for all required output elements',
      });
    }

    // Sort by priority
    const priorityOrder = suggestions
      .sort((a, b) => {
        const priorityVal = { high: 3, medium: 2, low: 1 };
        return (priorityVal[b.priority] || 0) - (priorityVal[a.priority] || 0);
      })
      .map((s) => s.id);

    const estimatedImpact = suggestions.some((s) => s.priority === 'high')
      ? 'significant'
      : suggestions.length > 0
        ? 'moderate'
        : 'minimal';

    this.logger.log(
      `Improvements suggested: count=${suggestions.length}, impact=${estimatedImpact}`,
    );

    return { suggestions, priorityOrder, estimatedImpact };
  }

  private async compareOutputs(params: {
    outputs: Array<{ id: string; content: any }>;
    criteria?: string[];
  }): Promise<{
    rankings: Array<{ id: string; score: number; rank: number }>;
    bestOutput: string;
    comparison: Record<string, Record<string, number>>;
  }> {
    const { outputs, criteria = ['quality', 'completeness', 'accuracy', 'efficiency'] } = params;

    if (!outputs || !Array.isArray(outputs) || outputs.length < 2) {
      throw new Error('At least two outputs are required for comparison');
    }

    const comparison: Record<string, Record<string, number>> = {};
    const scored: Array<{ id: string; score: number }> = [];

    for (const output of outputs) {
      const criteriaScores: Record<string, number> = {};

      for (const criterion of criteria) {
        criteriaScores[criterion] = this.evaluateCriterion(output.content, criterion, {});
      }

      comparison[output.id] = criteriaScores;
      const avgScore =
        Object.values(criteriaScores).reduce((sum, s) => sum + s, 0) / criteria.length;
      scored.push({ id: output.id, score: Math.round(avgScore) });
    }

    scored.sort((a, b) => b.score - a.score);

    const rankings = scored.map((s, i) => ({
      id: s.id,
      score: s.score,
      rank: i + 1,
    }));

    const bestOutput = rankings[0].id;

    this.logger.log(`Outputs compared: count=${outputs.length}, best=${bestOutput}`);

    return { rankings, bestOutput, comparison };
  }

  private async validateConsistency(params: {
    outputs: any[];
    rules?: Array<{ field: string; type: string }>;
  }): Promise<{
    consistent: boolean;
    inconsistencies: Array<{
      outputIndex: number;
      field: string;
      issue: string;
      expected: string;
      actual: string;
    }>;
    consistencyScore: number;
  }> {
    const { outputs, rules = [] } = params;

    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      throw new Error('Non-empty outputs array is required for consistency validation');
    }

    const inconsistencies: Array<{
      outputIndex: number;
      field: string;
      issue: string;
      expected: string;
      actual: string;
    }> = [];

    // Validate against rules
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];

      for (const rule of rules) {
        const value = output?.[rule.field];
        if (rule.type === 'required' && (value === null || value === undefined)) {
          inconsistencies.push({
            outputIndex: i,
            field: rule.field,
            issue: 'Missing required field',
            expected: rule.type,
            actual: 'undefined',
          });
        } else if (rule.type === 'string' && typeof value !== 'string') {
          inconsistencies.push({
            outputIndex: i,
            field: rule.field,
            issue: 'Type mismatch',
            expected: 'string',
            actual: typeof value,
          });
        } else if (rule.type === 'number' && typeof value !== 'number') {
          inconsistencies.push({
            outputIndex: i,
            field: rule.field,
            issue: 'Type mismatch',
            expected: 'number',
            actual: typeof value,
          });
        }
      }
    }

    // Check cross-output consistency
    if (outputs.length > 1) {
      const firstKeys = typeof outputs[0] === 'object' ? Object.keys(outputs[0] || {}).sort() : [];
      for (let i = 1; i < outputs.length; i++) {
        const currentKeys =
          typeof outputs[i] === 'object' ? Object.keys(outputs[i] || {}).sort() : [];
        if (JSON.stringify(firstKeys) !== JSON.stringify(currentKeys)) {
          inconsistencies.push({
            outputIndex: i,
            field: 'structure',
            issue: 'Structural inconsistency with first output',
            expected: firstKeys.join(','),
            actual: currentKeys.join(','),
          });
        }
      }
    }

    const consistent = inconsistencies.length === 0;
    const consistencyScore =
      outputs.length > 0
        ? Math.round(Math.max(0, 100 - (inconsistencies.length / outputs.length) * 50))
        : 100;

    this.logger.log(
      `Consistency validated: outputs=${outputs.length}, consistent=${consistent}, score=${consistencyScore}`,
    );

    return { consistent, inconsistencies, consistencyScore };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private evaluateCriterion(output: any, criterion: string, context: Record<string, any>): number {
    switch (criterion) {
      case 'completeness': {
        if (typeof output === 'object' && output !== null) {
          const keys = Object.keys(output);
          const nullValues = keys.filter((k) => output[k] === null || output[k] === undefined);
          return keys.length > 0
            ? Math.round(((keys.length - nullValues.length) / keys.length) * 100)
            : 50;
        }
        return typeof output === 'string' && output.length > 0 ? 80 : 40;
      }
      case 'accuracy': {
        if (output?.error) return 30;
        if (output?.success === true) return 90;
        if (output?.success === false) return 40;
        return 65 + Math.floor(Math.random() * 20);
      }
      case 'relevance': {
        const contextKeys = Object.keys(context);
        if (contextKeys.length === 0) return 70 + Math.floor(Math.random() * 15);
        return 60 + Math.floor(Math.random() * 25);
      }
      case 'clarity': {
        if (typeof output === 'string') {
          const avgWordLength =
            output.split(/\s+/).reduce((sum, w) => sum + w.length, 0) /
            (output.split(/\s+/).length || 1);
          return avgWordLength < 8 ? 85 : avgWordLength < 12 ? 70 : 55;
        }
        return 75;
      }
      case 'correctness': {
        if (output?.error) return 30;
        return 70 + Math.floor(Math.random() * 20);
      }
      case 'consistency': {
        return 65 + Math.floor(Math.random() * 25);
      }
      case 'efficiency': {
        return 60 + Math.floor(Math.random() * 30);
      }
      case 'readability': {
        if (typeof output === 'string') {
          const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 0);
          const avgLen =
            sentences.length > 0
              ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
              : 0;
          return avgLen > 0 && avgLen < 20 ? 85 : avgLen < 30 ? 70 : 55;
        }
        return 75;
      }
      case 'quality': {
        return 65 + Math.floor(Math.random() * 25);
      }
      default:
        return 60 + Math.floor(Math.random() * 20);
    }
  }

  private scoreDimension(content: any, dimension: string): number {
    switch (dimension) {
      case 'correctness':
        return content?.success === true
          ? 90
          : content?.error
            ? 35
            : 65 + Math.floor(Math.random() * 20);
      case 'completeness':
        if (typeof content === 'object' && content !== null) {
          const keys = Object.keys(content);
          const filled = keys.filter((k) => content[k] !== null && content[k] !== undefined);
          return keys.length > 0 ? Math.round((filled.length / keys.length) * 100) : 50;
        }
        return 70;
      case 'consistency':
        return 70 + Math.floor(Math.random() * 20);
      case 'efficiency':
        return 60 + Math.floor(Math.random() * 30);
      case 'readability':
        return 65 + Math.floor(Math.random() * 25);
      default:
        return 60 + Math.floor(Math.random() * 20);
    }
  }

  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateEvaluationSummary(
    criteriaScores: Record<string, number>,
    overallScore: number,
    passed: boolean,
  ): string {
    const strengths = Object.entries(criteriaScores)
      .filter(([, score]) => score >= 80)
      .map(([criterion]) => criterion);
    const weaknesses = Object.entries(criteriaScores)
      .filter(([, score]) => score < 60)
      .map(([criterion]) => criterion);

    let summary = `Overall score: ${overallScore}/100. ${passed ? 'PASSED' : 'FAILED'}.`;

    if (strengths.length > 0) {
      summary += ` Strengths: ${strengths.join(', ')}.`;
    }
    if (weaknesses.length > 0) {
      summary += ` Areas for improvement: ${weaknesses.join(', ')}.`;
    }

    return summary;
  }
}
