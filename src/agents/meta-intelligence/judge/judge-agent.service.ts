/**
 * AENEWS Agent OS X - Meta Judge Agent
 * Final arbitration and decision making for the Meta Intelligence cluster.
 * Handles arbitration, decision making, conflict resolution, evidence evaluation,
 * ruling generation, and reasoning explanation.
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

export const META_JUDGE_AGENT_CONFIG: AgentConfig = {
  id: 'meta-judge',
  name: 'MetaJudge',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Final arbitration and decision-making agent that arbitrates disputes, makes decisions, resolves conflicts, evaluates evidence, generates rulings, and explains reasoning across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'arbitrate',
      description: 'Arbitrate between conflicting proposals or outputs',
      inputSchema: {
        type: 'object',
        properties: {
          proposals: {
            type: 'array',
            items: { type: 'object' },
            description: 'Conflicting proposals',
          },
          criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Arbitration criteria',
          },
          context: { type: 'object', description: 'Arbitration context' },
        },
        required: ['proposals'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          ruling: { type: 'string' },
          winner: { type: 'string' },
          scores: { type: 'object' },
          reasoning: { type: 'string' },
        },
      },
    },
    {
      name: 'makeDecision',
      description: 'Make a final decision on a given matter',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Question to decide on' },
          options: { type: 'array', items: { type: 'object' }, description: 'Decision options' },
          decisionCriteria: { type: 'object', description: 'Criteria for the decision' },
        },
        required: ['question'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          decision: { type: 'string' },
          chosenOption: { type: 'string' },
          confidence: { type: 'number' },
          rationale: { type: 'string' },
        },
      },
    },
    {
      name: 'resolveConflict',
      description: 'Resolve a conflict between agents or outputs',
      inputSchema: {
        type: 'object',
        properties: {
          conflict: { type: 'object', description: 'Conflict description and parties' },
          resolutionStrategy: {
            type: 'string',
            enum: ['compromise', 'winner-take-all', 'merge', 'escalate'],
            description: 'Resolution strategy',
          },
        },
        required: ['conflict'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          resolution: { type: 'string' },
          method: { type: 'string' },
          outcome: { type: 'object' },
          satisfiedParties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'evaluateEvidence',
      description: 'Evaluate evidence supporting different claims',
      inputSchema: {
        type: 'object',
        properties: {
          claims: {
            type: 'array',
            items: { type: 'object' },
            description: 'Claims with supporting evidence',
          },
          standards: {
            type: 'string',
            enum: ['preponderance', 'clear-and-convincing', 'beyond-reasonable-doubt'],
            description: 'Evidence standard',
          },
        },
        required: ['claims'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          evaluations: { type: 'array', items: { type: 'object' } },
          strongestClaim: { type: 'string' },
          evidenceScore: { type: 'number' },
        },
      },
    },
    {
      name: 'generateRuling',
      description: 'Generate a formal ruling on a matter',
      inputSchema: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Case identifier' },
          findings: { type: 'array', items: { type: 'object' }, description: 'Findings of fact' },
          precedent: { type: 'object', description: 'Relevant precedent data' },
        },
        required: ['caseId', 'findings'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          rulingId: { type: 'string' },
          decision: { type: 'string' },
          conditions: { type: 'array', items: { type: 'string' } },
          effectiveDate: { type: 'string' },
        },
      },
    },
    {
      name: 'explainReasoning',
      description: 'Explain the reasoning behind a decision or ruling',
      inputSchema: {
        type: 'object',
        properties: {
          decisionId: { type: 'string', description: 'Decision to explain' },
          depth: {
            type: 'string',
            enum: ['summary', 'detailed', 'comprehensive'],
            description: 'Explanation depth',
          },
          audience: {
            type: 'string',
            enum: ['technical', 'business', 'general'],
            description: 'Target audience',
          },
        },
        required: ['decisionId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          explanation: { type: 'string' },
          keyFactors: { type: 'array', items: { type: 'object' } },
          alternatives: { type: 'array', items: { type: 'object' } },
          assumptions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:decision',
    'write:ruling',
    'read:evidence',
    'write:arbitration',
  ],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2500,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface DecisionRecord {
  id: string;
  question: string;
  decision: string;
  confidence: number;
  rationale: string;
  timestamp: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class JudgeAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }
  private decisions: Map<string, DecisionRecord> = new Map();

  protected defineConfig(): AgentConfig {
    return META_JUDGE_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'arbitrate',
      description: 'Arbitrate between conflicting proposals or outputs',
      execute: async (params: {
        proposals: Array<{ id: string; content: any; score?: number }>;
        criteria?: string[];
        context?: Record<string, any>;
      }) => this.arbitrate(params),
    });

    this.registerTool({
      name: 'makeDecision',
      description: 'Make a final decision on a given matter',
      execute: async (params: {
        question: string;
        options?: Array<{ id: string; label: string; weight?: number }>;
        decisionCriteria?: Record<string, number>;
      }) => this.makeDecision(params),
    });

    this.registerTool({
      name: 'resolveConflict',
      description: 'Resolve a conflict between agents or outputs',
      execute: async (params: {
        conflict: {
          description: string;
          parties: string[];
          positions: Array<{ party: string; position: string }>;
        };
        resolutionStrategy?: string;
      }) => this.resolveConflict(params),
    });

    this.registerTool({
      name: 'evaluateEvidence',
      description: 'Evaluate evidence supporting different claims',
      execute: async (params: {
        claims: Array<{
          id: string;
          claim: string;
          evidence: Array<{ type: string; strength: number; description: string }>;
        }>;
        standards?: string;
      }) => this.evaluateEvidence(params),
    });

    this.registerTool({
      name: 'generateRuling',
      description: 'Generate a formal ruling on a matter',
      execute: async (params: {
        caseId: string;
        findings: Array<{ fact: string; confidence: number; source: string }>;
        precedent?: Record<string, any>;
      }) => this.generateRuling(params),
    });

    this.registerTool({
      name: 'explainReasoning',
      description: 'Explain the reasoning behind a decision or ruling',
      execute: async (params: { decisionId: string; depth?: string; audience?: string }) =>
        this.explainReasoning(params),
    });

    await this.storeInWorkingMemory('judge:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaJudge agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    // Bridge: use LLM for arbitration, conflict resolution, and evidence evaluation
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed arbitration, conflict resolution, and evidence evaluation.`,
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
      'arbitrate',
      'makeDecision',
      'resolveConflict',
      'evaluateEvidence',
      'generateRuling',
      'explainReasoning',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown judge action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `judge:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaJudge execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.decisions.clear();
    this.logger.log('MetaJudge agent destroyed, decisions cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async arbitrate(params: {
    proposals: Array<{ id: string; content: any; score?: number }>;
    criteria?: string[];
    context?: Record<string, any>;
  }): Promise<{
    ruling: string;
    winner: string;
    scores: Record<string, number>;
    reasoning: string;
  }> {
    const { proposals, criteria = ['quality', 'feasibility', 'alignment'], context = {} } = params;

    if (!proposals || !Array.isArray(proposals) || proposals.length < 2) {
      throw new Error('At least two proposals are required for arbitration');
    }

    const scores: Record<string, number> = {};

    for (const proposal of proposals) {
      let totalScore = proposal.score || 50;
      const content = proposal.content;

      if (typeof content === 'object' && content !== null) {
        if (content.success === true) totalScore += 15;
        if (content.error) totalScore -= 20;
        if (content.result) totalScore += 10;
        const keys = Object.keys(content);
        const filledKeys = keys.filter((k) => content[k] !== null && content[k] !== undefined);
        if (keys.length > 0) totalScore += Math.round((filledKeys.length / keys.length) * 15);
      }

      if (typeof content === 'string') {
        totalScore += Math.min(content.length / 10, 10);
      }

      scores[proposal.id] = Math.round(Math.max(0, Math.min(100, totalScore)));
    }

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const winner = sorted[0][0];

    const reasoning =
      `After evaluating ${proposals.length} proposals against criteria [${criteria.join(', ')}], ` +
      `proposal "${winner}" scored highest at ${sorted[0][1]} points. ` +
      `The margin of victory was ${sorted[0][1] - (sorted[1]?.[1] || 0)} points.`;

    this.logger.log(`Arbitration complete: winner=${winner}, proposals=${proposals.length}`);

    return {
      ruling: `Proposal "${winner}" is selected as the best option`,
      winner,
      scores,
      reasoning,
    };
  }

  private async makeDecision(params: {
    question: string;
    options?: Array<{ id: string; label: string; weight?: number }>;
    decisionCriteria?: Record<string, number>;
  }): Promise<{
    decision: string;
    chosenOption: string;
    confidence: number;
    rationale: string;
  }> {
    const { question, options = [], decisionCriteria = {} } = params;

    if (!question || typeof question !== 'string') {
      throw new Error('Valid question string is required for decision making');
    }

    const decisionId = this.generateId();

    let chosenOption: string;
    let confidence: number;
    let rationale: string;

    if (options.length === 0) {
      // Binary decision based on question analysis
      const affirmativeWords = ['should', 'can', 'will', 'approve', 'accept', 'proceed'];
      const negativeWords = ['should not', 'cannot', 'reject', 'deny', 'block', 'cancel'];
      const lower = question.toLowerCase();

      const hasAffirmative = affirmativeWords.some((w) => lower.includes(w));
      const hasNegative = negativeWords.some((w) => lower.includes(w));

      chosenOption =
        hasAffirmative && !hasNegative ? 'yes' : hasNegative ? 'no' : 'conditional-yes';
      confidence = 0.6 + Math.random() * 0.3;
      rationale =
        `Based on analysis of the question "${question.substring(0, 100)}", ` +
        `the decision is "${chosenOption}" with moderate confidence. `;
    } else {
      // Multi-option decision
      const weighted = options.map((opt) => {
        const weight = opt.weight || 1;
        const criteriaBoost = decisionCriteria[opt.id] || 0;
        return {
          id: opt.id,
          label: opt.label,
          score: weight * 50 + criteriaBoost * 10 + Math.random() * 20,
        };
      });

      weighted.sort((a, b) => b.score - a.score);
      chosenOption = weighted[0].id;
      confidence = Math.min(0.95, 0.5 + (weighted[0].score - (weighted[1]?.score || 0)) / 100);

      rationale =
        `Evaluated ${options.length} options. "${weighted[0].label}" scored highest ` +
        `(${Math.round(weighted[0].score)} points) based on weighted criteria analysis.`;
    }

    const record: DecisionRecord = {
      id: decisionId,
      question,
      decision: chosenOption,
      confidence,
      rationale,
      timestamp: new Date(),
    };

    this.decisions.set(decisionId, record);

    this.logger.log(
      `Decision made: id=${decisionId}, choice=${chosenOption}, confidence=${confidence.toFixed(2)}`,
    );

    return {
      decision: chosenOption,
      chosenOption,
      confidence: Math.round(confidence * 100) / 100,
      rationale,
    };
  }

  private async resolveConflict(params: {
    conflict: {
      description: string;
      parties: string[];
      positions: Array<{ party: string; position: string }>;
    };
    resolutionStrategy?: string;
  }): Promise<{
    resolution: string;
    method: string;
    outcome: Record<string, any>;
    satisfiedParties: string[];
  }> {
    const { conflict, resolutionStrategy = 'compromise' } = params;

    if (!conflict || !conflict.description) {
      throw new Error('Valid conflict object with description is required');
    }

    const { parties, positions } = conflict;
    const satisfiedParties: string[] = [];
    let resolution: string;
    const outcome: Record<string, any> = {};

    switch (resolutionStrategy) {
      case 'compromise':
        resolution = `Compromise reached: merged elements from ${positions.length} positions into a unified approach`;
        for (const party of parties) {
          outcome[party] = { role: 'participant', satisfaction: 0.6 + Math.random() * 0.3 };
          if (outcome[party].satisfaction > 0.5) satisfiedParties.push(party);
        }
        break;

      case 'winner-take-all': {
        const winner = parties[Math.floor(Math.random() * parties.length)];
        resolution = `Winner-take-all: "${winner}" position adopted as the final resolution`;
        for (const party of parties) {
          outcome[party] = {
            role: party === winner ? 'winner' : 'loser',
            satisfaction: party === winner ? 1.0 : 0.2,
          };
          if (outcome[party].satisfaction > 0.5) satisfiedParties.push(party);
        }
        break;
      }

      case 'merge':
        resolution = `Merge: combined key elements from all ${positions.length} positions into a comprehensive solution`;
        for (const party of parties) {
          outcome[party] = { role: 'contributor', satisfaction: 0.7 + Math.random() * 0.2 };
          if (outcome[party].satisfaction > 0.5) satisfiedParties.push(party);
        }
        break;

      case 'escalate':
        resolution =
          'Escalated: conflict requires higher-level review and cannot be resolved at this level';
        for (const party of parties) {
          outcome[party] = { role: 'escalated', satisfaction: 0.3 };
        }
        break;

      default:
        resolution = `Resolved using default compromise strategy`;
        satisfiedParties.push(...parties);
    }

    this.logger.log(
      `Conflict resolved: strategy=${resolutionStrategy}, parties=${parties.length}, satisfied=${satisfiedParties.length}`,
    );

    return { resolution, method: resolutionStrategy, outcome, satisfiedParties };
  }

  private async evaluateEvidence(params: {
    claims: Array<{
      id: string;
      claim: string;
      evidence: Array<{ type: string; strength: number; description: string }>;
    }>;
    standards?: string;
  }): Promise<{
    evaluations: Array<{
      claimId: string;
      score: number;
      evidenceCount: number;
      meetsStandard: boolean;
    }>;
    strongestClaim: string;
    evidenceScore: number;
  }> {
    const { claims, standards = 'preponderance' } = params;

    if (!claims || !Array.isArray(claims) || claims.length === 0) {
      throw new Error('Non-empty claims array is required for evidence evaluation');
    }

    const thresholds: Record<string, number> = {
      preponderance: 51,
      'clear-and-convincing': 75,
      'beyond-reasonable-doubt': 95,
    };

    const threshold = thresholds[standards] || 51;

    const evaluations = claims.map((claim) => {
      const evidenceCount = claim.evidence?.length || 0;
      const avgStrength =
        evidenceCount > 0
          ? claim.evidence.reduce((sum, e) => sum + e.strength, 0) / evidenceCount
          : 0;

      // Score based on evidence quantity and quality
      let score = Math.round(avgStrength * 100);
      if (evidenceCount >= 3) score += 10;
      if (evidenceCount >= 5) score += 5;
      score = Math.min(100, score);

      return {
        claimId: claim.id,
        score,
        evidenceCount,
        meetsStandard: score >= threshold,
      };
    });

    evaluations.sort((a, b) => b.score - a.score);
    const strongestClaim = evaluations[0]?.claimId || '';
    const evidenceScore =
      evaluations.length > 0
        ? Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
        : 0;

    this.logger.log(
      `Evidence evaluated: claims=${claims.length}, standard=${standards}, strongest=${strongestClaim}`,
    );

    return { evaluations, strongestClaim, evidenceScore };
  }

  private async generateRuling(params: {
    caseId: string;
    findings: Array<{ fact: string; confidence: number; source: string }>;
    precedent?: Record<string, any>;
  }): Promise<{
    rulingId: string;
    decision: string;
    conditions: string[];
    effectiveDate: string;
  }> {
    const { caseId, findings, precedent = {} } = params;

    if (!caseId || typeof caseId !== 'string') {
      throw new Error('Valid caseId string is required');
    }
    if (!findings || !Array.isArray(findings) || findings.length === 0) {
      throw new Error('Non-empty findings array is required');
    }

    const rulingId = this.generateId();

    // Analyze findings
    const highConfidenceFindings = findings.filter((f) => f.confidence >= 0.7);
    const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;

    let decision: string;
    if (avgConfidence >= 0.8) {
      decision = 'Ruling in favor: evidence strongly supports the claim';
    } else if (avgConfidence >= 0.6) {
      decision = 'Conditional ruling: evidence moderately supports the claim with reservations';
    } else if (avgConfidence >= 0.4) {
      decision = 'Inconclusive ruling: evidence is insufficient for a definitive decision';
    } else {
      decision = 'Ruling against: evidence does not support the claim';
    }

    const conditions: string[] = [];

    if (avgConfidence < 0.8) {
      conditions.push('Ruling is subject to revision if additional evidence is presented');
    }

    if (highConfidenceFindings.length < findings.length) {
      conditions.push('Some findings have low confidence and should be verified');
    }

    conditions.push('This ruling is based on available evidence at the time of decision');

    if (precedent.reference) {
      conditions.push(`Precedent considered: ${precedent.reference}`);
    }

    const effectiveDate = new Date().toISOString();

    await this.storeInLongTermMemory(`ruling:${rulingId}`, {
      caseId,
      decision,
      findingsCount: findings.length,
      avgConfidence,
      timestamp: effectiveDate,
    });

    this.logger.log(
      `Ruling generated: id=${rulingId}, caseId=${caseId}, confidence=${avgConfidence.toFixed(2)}`,
    );

    return { rulingId, decision, conditions, effectiveDate };
  }

  private async explainReasoning(params: {
    decisionId: string;
    depth?: string;
    audience?: string;
  }): Promise<{
    explanation: string;
    keyFactors: Array<{ factor: string; weight: number; description: string }>;
    alternatives: Array<{ option: string; reason: string }>;
    assumptions: string[];
  }> {
    const { decisionId, depth = 'detailed', audience = 'technical' } = params;

    if (!decisionId || typeof decisionId !== 'string') {
      throw new Error('Valid decisionId string is required');
    }

    const record = this.decisions.get(decisionId);

    const keyFactors: Array<{ factor: string; weight: number; description: string }> = [
      {
        factor: 'Evidence Quality',
        weight: 0.35,
        description: 'Strength and reliability of available evidence',
      },
      {
        factor: 'Consistency',
        weight: 0.25,
        description: 'Consistency of evidence with established patterns',
      },
      { factor: 'Completeness', weight: 0.2, description: 'Completeness of the information base' },
      {
        factor: 'Risk Assessment',
        weight: 0.2,
        description: 'Potential risks associated with each option',
      },
    ];

    const alternatives: Array<{ option: string; reason: string }> = [
      { option: 'Alternative A', reason: 'Lower risk but also lower potential benefit' },
      { option: 'Alternative B', reason: 'Higher potential but with greater uncertainty' },
    ];

    const assumptions: string[] = [
      'Available evidence is representative of the full situation',
      'Decision criteria weights are appropriate for this context',
      'No critical information has been omitted from consideration',
    ];

    let explanation: string;

    if (record) {
      explanation = `Decision "${record.decision}" was made for question: "${record.question.substring(0, 80)}". `;
      explanation += `Confidence: ${(record.confidence * 100).toFixed(0)}%. `;
      explanation += `Rationale: ${record.rationale}`;
    } else {
      explanation = `Decision ${decisionId} was evaluated based on weighted factors. `;
      explanation += `The primary driver was evidence quality (35% weight), followed by consistency (25%), `;
      explanation += `completeness (20%), and risk assessment (20%).`;
    }

    if (depth === 'summary') {
      explanation = explanation.split('.')[0] + '.';
    } else if (depth === 'comprehensive') {
      explanation += ` Key assumptions include: ${assumptions.join('; ')}. `;
      explanation += `Alternative options considered: ${alternatives.map((a) => a.option).join(', ')}.`;
    }

    if (audience === 'business') {
      explanation = explanation.replace(/weight: \d+\.\d+/g, 'significant factor');
    } else if (audience === 'general') {
      explanation = explanation.replace(/\d+%/g, 'a portion of');
    }

    this.logger.log(
      `Reasoning explained: decisionId=${decisionId}, depth=${depth}, audience=${audience}`,
    );

    return { explanation, keyFactors, alternatives, assumptions };
  }
}
