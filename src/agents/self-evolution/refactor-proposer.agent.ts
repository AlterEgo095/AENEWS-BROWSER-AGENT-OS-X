/**
 * AENEWS Agent OS X - Refactor Proposer Agent
 * Self-Evolution Cluster — Agent 3 of 5
 *
 * Proposes refactoring strategies to address detected weaknesses.
 * Generates refactoring proposals with impact analysis and execution plans,
 * bridging the gap between weakness detection and patch generation.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const SELF_EVOLUTION_REFACTOR_PROPOSER_CONFIG: AgentConfig = {
  id: 'self-evolution-refactor-proposer',
  name: 'RefactorProposer',
  cluster: 'self_evolution' as any,
  version: '1.0.0',
  description:
    'Proposes refactoring strategies to address detected weaknesses with impact analysis and execution plans for the self-evolution loop.',
  capabilities: [
    {
      name: 'propose-refactor',
      description: 'Generate refactoring proposals to address detected system weaknesses',
      inputSchema: {
        type: 'object',
        properties: {
          weaknesses: { type: 'array', items: { type: 'object' } },
          priority: { type: 'string' },
          constraints: { type: 'array', items: { type: 'string' } },
        },
        required: ['weaknesses'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          proposalId: { type: 'string' },
          refactors: { type: 'array', items: { type: 'object' } },
          estimatedImprovement: { type: 'number' },
          riskLevel: { type: 'string' },
        },
      },
    },
    {
      name: 'analyze-impact',
      description: 'Analyze the potential impact of a proposed refactoring on the system',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: { type: 'string' },
          targetComponents: { type: 'array', items: { type: 'string' } },
          simulationDepth: { type: 'string' },
        },
        required: ['proposalId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          impactScore: { type: 'number' },
          affectedComponents: { type: 'array', items: { type: 'object' } },
          riskAssessment: { type: 'object' },
          predictedEQIDelta: { type: 'number' },
        },
      },
    },
    {
      name: 'generate-plan',
      description: 'Generate an execution plan for a refactoring proposal with steps and milestones',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: { type: 'string' },
          includeRollbackPlan: { type: 'boolean' },
          maxParallelSteps: { type: 'number' },
        },
        required: ['proposalId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          phases: { type: 'array', items: { type: 'object' } },
          totalSteps: { type: 'number' },
          estimatedDuration: { type: 'number' },
          rollbackStrategy: { type: 'object' },
        },
      },
    },
  ],
  permissions: [
    'self-evolution:execute',
    'self-evolution:propose-refactor',
    'self-evolution:analyze-impact',
    'self-evolution:generate-plan',
    'read:weaknesses',
    'read:certification',
    'write:proposals',
  ],
  maxConcurrentTasks: 3,
  timeout: 120000,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface RefactorProposal {
  id: string;
  targetWeaknesses: string[];
  refactors: RefactorAction[];
  estimatedImprovement: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  status: 'draft' | 'approved' | 'rejected' | 'in-progress';
}

interface RefactorAction {
  id: string;
  type: 'optimization' | 'restructuring' | 'replacement' | 'addition' | 'removal';
  component: string;
  description: string;
  rationale: string;
  estimatedEffort: number;
  expectedGain: number;
  dependencies: string[];
}

interface ImpactAnalysis {
  proposalId: string;
  impactScore: number;
  affectedComponents: Array<{
    component: string;
    changeType: 'modified' | 'replaced' | 'removed' | 'added';
    severity: 'minor' | 'moderate' | 'major';
    description: string;
    riskOfRegression: number;
  }>;
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    regressionProbability: number;
    blastRadius: string[];
    mitigations: string[];
  };
  predictedEQIDelta: number;
}

interface ExecutionPlan {
  id: string;
  proposalId: string;
  phases: Array<{
    name: string;
    steps: Array<{
      id: string;
      description: string;
      component: string;
      action: string;
      estimatedDurationMs: number;
      dependencies: string[];
      canRollback: boolean;
    }>;
    parallelizable: boolean;
  }>;
  totalSteps: number;
  estimatedDurationMs: number;
  rollbackStrategy: {
    strategy: string;
    steps: string[];
    triggerConditions: string[];
  };
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class RefactorProposerAgent extends BaseAgentService {
  private proposals: Map<string, RefactorProposal> = new Map();
  private impactAnalyses: Map<string, ImpactAnalysis> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();

  protected defineConfig(): AgentConfig {
    return SELF_EVOLUTION_REFACTOR_PROPOSER_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'propose-refactor',
      description: 'Generate refactoring proposals to address detected system weaknesses',
      execute: async (params: {
        weaknesses: Array<{ area: string; component: string; severity: string; description?: string }>;
        priority?: string;
        constraints?: string[];
      }) => this.proposeRefactor(params),
    });

    this.registerTool({
      name: 'analyze-impact',
      description: 'Analyze the potential impact of a proposed refactoring on the system',
      execute: async (params: {
        proposalId: string;
        targetComponents?: string[];
        simulationDepth?: string;
      }) => this.analyzeImpact(params),
    });

    this.registerTool({
      name: 'generate-plan',
      description: 'Generate an execution plan for a refactoring proposal with steps and milestones',
      execute: async (params: {
        proposalId: string;
        includeRollbackPlan?: boolean;
        maxParallelSteps?: number;
      }) => this.generatePlan(params),
    });

    await this.storeInWorkingMemory(
      'refactor-proposer:initializedAt',
      new Date().toISOString(),
      600000,
    );
    this.logger.log('RefactorProposer agent initialized with 3 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const action = input.payload?.action || 'execute';
    const startTime = Date.now();

    try {
      let result: any;
      switch (action) {
        case 'propose':
          result = await this.proposeRefactor(input.payload);
          break;
        case 'impact-analysis':
          result = await this.analyzeImpact(input.payload);
          break;
        case 'plan-generation':
          result = await this.generatePlan(input.payload);
          break;
        default:
          result = { action, status: 'unknown_action' };
      }

      await this.storeInWorkingMemory(
        `refactor-proposer:last:${action}`,
        { payload: input.payload, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`RefactorProposer execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.proposals.clear();
    this.impactAnalyses.clear();
    this.executionPlans.clear();
    this.logger.log('RefactorProposer agent destroyed, state cleared');
  }

  // ─── Private Implementation Methods ──────────────────────────────

  private async proposeRefactor(params: {
    weaknesses: Array<{ area: string; component: string; severity: string; description?: string }>;
    priority?: string;
    constraints?: string[];
  }): Promise<{
    proposalId: string;
    refactors: RefactorAction[];
    estimatedImprovement: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const { weaknesses, priority = 'auto', constraints = [] } = params;

    if (!weaknesses || !Array.isArray(weaknesses) || weaknesses.length === 0) {
      throw new Error('Non-empty weaknesses array is required');
    }

    const proposalId = this.generateId();
    const refactors: RefactorAction[] = [];

    for (const weakness of weaknesses) {
      const refactorActions = this.generateRefactorActions(weakness, constraints);
      refactors.push(...refactorActions);
    }

    // Sort by expected gain / effort ratio
    refactors.sort((a, b) => (b.expectedGain / b.estimatedEffort) - (a.expectedGain / a.estimatedEffort));

    const totalExpectedGain = refactors.reduce((sum, r) => sum + r.expectedGain, 0);
    const maxPossibleGain = weaknesses.length * 30;
    const estimatedImprovement = Math.min(100, Math.round((totalExpectedGain / maxPossibleGain) * 100));

    const riskLevel: 'low' | 'medium' | 'high' =
      weaknesses.some((w) => w.severity === 'critical') || refactors.some((r) => r.estimatedEffort > 8)
        ? 'high'
        : weaknesses.some((w) => w.severity === 'high') || refactors.some((r) => r.estimatedEffort > 5)
          ? 'medium'
          : 'low';

    const proposal: RefactorProposal = {
      id: proposalId,
      targetWeaknesses: weaknesses.map((w) => `${w.area}:${w.component}`),
      refactors,
      estimatedImprovement,
      riskLevel,
      createdAt: new Date().toISOString(),
      status: 'draft',
    };

    this.proposals.set(proposalId, proposal);

    this.logger.log(
      `Refactor proposal generated: proposalId=${proposalId}, refactors=${refactors.length}, improvement=${estimatedImprovement}%, risk=${riskLevel}`,
    );

    return { proposalId, refactors, estimatedImprovement, riskLevel };
  }

  private generateRefactorActions(
    weakness: { area: string; component: string; severity: string; description?: string },
    constraints: string[],
  ): RefactorAction[] {
    const refactorTemplates: Record<string, RefactorAction[]> = {
      performance: [
        {
          id: this.generateId(),
          type: 'optimization',
          component: weakness.component,
          description: `Optimize ${weakness.component} execution path for reduced latency`,
          rationale: `Address performance degradation: ${weakness.description || weakness.area}`,
          estimatedEffort: 4,
          expectedGain: 15,
          dependencies: [],
        },
        {
          id: this.generateId(),
          type: 'restructuring',
          component: weakness.component,
          description: `Implement caching layer for ${weakness.component} hot paths`,
          rationale: 'Reduce redundant computation and I/O operations',
          estimatedEffort: 6,
          expectedGain: 20,
          dependencies: [],
        },
      ],
      reliability: [
        {
          id: this.generateId(),
          type: 'addition',
          component: weakness.component,
          description: `Add circuit breaker and retry logic to ${weakness.component}`,
          rationale: `Improve reliability: ${weakness.description || weakness.area}`,
          estimatedEffort: 3,
          expectedGain: 18,
          dependencies: [],
        },
        {
          id: this.generateId(),
          type: 'replacement',
          component: weakness.component,
          description: `Replace ${weakness.component} data store with ACID-compliant alternative`,
          rationale: 'Eliminate data loss under concurrent access patterns',
          estimatedEffort: 8,
          expectedGain: 25,
          dependencies: [],
        },
      ],
      quality: [
        {
          id: this.generateId(),
          type: 'optimization',
          component: weakness.component,
          description: `Implement deterministic scoring algorithm for ${weakness.component}`,
          rationale: `Reduce score variance: ${weakness.description || weakness.area}`,
          estimatedEffort: 5,
          expectedGain: 12,
          dependencies: [],
        },
      ],
      communication: [
        {
          id: this.generateId(),
          type: 'restructuring',
          component: weakness.component,
          description: `Refactor ${weakness.component} to use guaranteed-delivery messaging pattern`,
          rationale: `Ensure message delivery: ${weakness.description || weakness.area}`,
          estimatedEffort: 7,
          expectedGain: 22,
          dependencies: [],
        },
      ],
      scalability: [
        {
          id: this.generateId(),
          type: 'restructuring',
          component: weakness.component,
          description: `Implement O(1) lookup for ${weakness.component} using hash-indexed registry`,
          rationale: `Address scalability: ${weakness.description || weakness.area}`,
          estimatedEffort: 4,
          expectedGain: 10,
          dependencies: [],
        },
      ],
    };

    const actions = refactorTemplates[weakness.area] || [
      {
        id: this.generateId(),
        type: 'optimization' as const,
        component: weakness.component,
        description: `General optimization for ${weakness.component} in ${weakness.area} area`,
        rationale: weakness.description || `Improve ${weakness.area} metrics`,
        estimatedEffort: 3,
        expectedGain: 10,
        dependencies: [],
      },
    ];

    // Apply constraints
    if (constraints.includes('no-replacement')) {
      return actions.filter((a) => a.type !== 'replacement');
    }
    if (constraints.includes('low-effort-only')) {
      return actions.filter((a) => a.estimatedEffort <= 5);
    }

    return actions;
  }

  private async analyzeImpact(params: {
    proposalId: string;
    targetComponents?: string[];
    simulationDepth?: string;
  }): Promise<ImpactAnalysis> {
    const { proposalId, targetComponents = [], simulationDepth = 'standard' } = params;

    if (!proposalId || typeof proposalId !== 'string') {
      throw new Error('Valid proposalId string is required');
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Refactor proposal not found: ${proposalId}`);
    }

    const componentsToAnalyze = targetComponents.length > 0
      ? targetComponents
      : [...new Set(proposal.refactors.map((r) => r.component))];

    const affectedComponents = componentsToAnalyze.map((component) => {
      const relatedRefactors = proposal.refactors.filter((r) => r.component === component);
      const maxEffort = Math.max(...relatedRefactors.map((r) => r.estimatedEffort));

      return {
        component,
        changeType: relatedRefactors.some((r) => r.type === 'replacement')
          ? 'replaced' as const
          : relatedRefactors.some((r) => r.type === 'addition')
            ? 'added' as const
            : relatedRefactors.some((r) => r.type === 'removal')
              ? 'removed' as const
              : 'modified' as const,
        severity: maxEffort > 6 ? 'major' as const : maxEffort > 3 ? 'moderate' as const : 'minor' as const,
        description: `${relatedRefactors.length} refactoring action(s) targeting ${component}`,
        riskOfRegression: Math.round((0.1 + (maxEffort / 10) * 0.5) * 100) / 100,
      };
    });

    const overallRisk: 'low' | 'medium' | 'high' =
      proposal.riskLevel === 'high'
        ? 'high'
        : affectedComponents.some((c) => c.severity === 'major')
          ? 'high'
          : affectedComponents.some((c) => c.severity === 'moderate')
            ? 'medium'
            : 'low';

    const regressionProbability = Math.round(
      affectedComponents.reduce((sum, c) => sum + c.riskOfRegression, 0) / affectedComponents.length * 100,
    ) / 100;

    const blastRadius = [...new Set([
      ...componentsToAnalyze,
      ...proposal.refactors.flatMap((r) => r.dependencies),
    ])];

    const mitigations = [
      'Run full certification suite before and after each refactoring phase',
      'Deploy changes behind feature flags for gradual rollout',
      'Maintain rollback capability for each step in the execution plan',
      'Monitor EQI in real-time during refactoring execution',
    ];

    const impactScore = Math.round(
      (proposal.estimatedImprovement * (1 - regressionProbability)) * 100,
    ) / 100;

    const predictedEQIDelta = Math.round(
      (proposal.estimatedImprovement * 0.3 - regressionProbability * 5) * 100,
    ) / 100;

    const analysis: ImpactAnalysis = {
      proposalId,
      impactScore,
      affectedComponents,
      riskAssessment: {
        overallRisk,
        regressionProbability,
        blastRadius,
        mitigations,
      },
      predictedEQIDelta,
    };

    this.impactAnalyses.set(proposalId, analysis);

    this.logger.log(
      `Impact analyzed: proposalId=${proposalId}, impactScore=${impactScore}, risk=${overallRisk}, eqiDelta=${predictedEQIDelta}`,
    );

    return analysis;
  }

  private async generatePlan(params: {
    proposalId: string;
    includeRollbackPlan?: boolean;
    maxParallelSteps?: number;
  }): Promise<{
    planId: string;
    phases: ExecutionPlan['phases'];
    totalSteps: number;
    estimatedDurationMs: number;
    rollbackStrategy: ExecutionPlan['rollbackStrategy'];
  }> {
    const { proposalId, includeRollbackPlan = true, maxParallelSteps = 3 } = params;

    if (!proposalId || typeof proposalId !== 'string') {
      throw new Error('Valid proposalId string is required');
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Refactor proposal not found: ${proposalId}`);
    }

    const planId = this.generateId();

    // Phase 1: Preparation
    const preparationSteps = proposal.refactors
      .filter((r) => r.dependencies.length > 0)
      .flatMap((r) =>
        r.dependencies.map((dep, i) => ({
          id: `${planId}-prep-${i}`,
          description: `Prepare dependency: ${dep} for ${r.component}`,
          component: dep,
          action: 'prepare',
          estimatedDurationMs: 3000 + Math.random() * 5000,
          dependencies: [],
          canRollback: true,
        })),
      );

    // Phase 2: Core refactoring
    const coreSteps = proposal.refactors.map((r, i) => ({
      id: `${planId}-core-${i}`,
      description: r.description,
      component: r.component,
      action: r.type,
      estimatedDurationMs: r.estimatedEffort * 3000,
      dependencies: r.dependencies,
      canRollback: r.type !== 'removal',
    }));

    // Phase 3: Validation
    const validationSteps = [...new Set(proposal.refactors.map((r) => r.component))].map(
      (component, i) => ({
        id: `${planId}-val-${i}`,
        description: `Validate refactored ${component} with certification tests`,
        component,
        action: 'validate',
        estimatedDurationMs: 5000 + Math.random() * 10000,
        dependencies: coreSteps.filter((s) => s.component === component).map((s) => s.id),
        canRollback: false,
      }),
    );

    const phases: ExecutionPlan['phases'] = [
      {
        name: 'Preparation',
        steps: preparationSteps.length > 0 ? preparationSteps : [{
          id: `${planId}-prep-0`,
          description: 'No dependency preparation required',
          component: 'system',
          action: 'noop',
          estimatedDurationMs: 0,
          dependencies: [],
          canRollback: true,
        }],
        parallelizable: true,
      },
      {
        name: 'Core Refactoring',
        steps: coreSteps,
        parallelizable: coreSteps.length <= maxParallelSteps,
      },
      {
        name: 'Validation & Certification',
        steps: validationSteps,
        parallelizable: true,
      },
    ];

    const totalSteps = phases.reduce((sum, p) => sum + p.steps.length, 0);
    const estimatedDurationMs = phases.reduce(
      (sum, p) =>
        sum +
        (p.parallelizable
          ? Math.max(...p.steps.map((s) => s.estimatedDurationMs))
          : p.steps.reduce((s, step) => s + step.estimatedDurationMs, 0)),
      0,
    );

    const rollbackStrategy = includeRollbackPlan
      ? {
          strategy: 'incremental-rollback',
          steps: [
            'Halt all in-progress refactoring steps',
            'Revert patched branches to pre-refactor state',
            'Run baseline certification to confirm system integrity',
            'Restore previous agent configurations from backup',
            'Resume normal operations with pre-refactor codebase',
          ],
          triggerConditions: [
            'EQI decreases below pre-refactor baseline',
            'Certification failure rate exceeds 5%',
            'Critical regression detected in core agent capabilities',
            'System health check fails for more than 2 consecutive cycles',
          ],
        }
      : {
          strategy: 'none',
          steps: [],
          triggerConditions: [],
        };

    const plan: ExecutionPlan = {
      id: planId,
      proposalId,
      phases,
      totalSteps,
      estimatedDurationMs,
      rollbackStrategy,
    };

    this.executionPlans.set(planId, plan);

    this.logger.log(
      `Execution plan generated: planId=${planId}, phases=${phases.length}, steps=${totalSteps}, duration=${estimatedDurationMs}ms`,
    );

    return {
      planId,
      phases,
      totalSteps,
      estimatedDurationMs,
      rollbackStrategy,
    };
  }
}
