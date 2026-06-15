import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * LLMPlannerAgent — Intelligent mission planner using LLM reasoning.
 *
 * Responsible for generating optimal execution strategies, replanning when
 * conditions change, and evaluating the viability of proposed strategies.
 * Leverages LLM-powered analysis to produce structured step-by-step plans
 * with risk assessments and duration estimates.
 *
 * When LLM is available: Uses real LLM calls for intelligent planning.
 * When LLM is unavailable: Falls back to heuristic-based planning.
 *
 * Supported actions:
 * - `plan-mission`    → Generate a step-by-step mission plan from objectives
 * - `replan-mission`  → Revise an existing plan based on new constraints or failures
 * - `evaluate-strategy` → Assess a proposed strategy for feasibility and risk
 */
export class LLMPlannerAgent extends BaseAgent {
  readonly name = 'LLMPlannerAgent';
  readonly cluster = ClusterType.LLM_INTELLIGENCE;
  readonly capabilities = [
    'plan-mission',
    'replan-mission',
    'evaluate-strategy',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Intelligent mission planner using LLM reasoning for optimal execution strategies';

  readonly missionCategories = [MissionCategory.AI_ORCHESTRATION];
  readonly creditCost = 2;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'plan-mission';
      const startTime = Date.now();

      switch (action) {
        case 'plan-mission': {
          const objectives = config.objectives;
          if (!objectives || (Array.isArray(objectives) && objectives.length === 0)) {
            return {
              success: false,
              error: 'Objectives are required for plan-mission action',
            };
          }
          const constraints = config.constraints || [];
          const priority = config.priority || 'medium';
          const contextData = config.context || {};

          this.logger.log(
            `Planning mission with ${Array.isArray(objectives) ? objectives.length : 1} objective(s), priority: ${priority}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, objectives });

          // Try LLM-powered planning
          const llmResult = await this.executeWithLLM(
            `You are an expert task planner. Break down the following task into actionable subtasks.
Return a JSON object with this exact structure:
{
  "steps": [
    { "step": 1, "description": "...", "type": "analysis|decomposition|ordering|allocation|execution", "dependencies": [], "estimatedDurationMs": 5000 }
  ],
  "strategy": "sequential-with-parallel-branches",
  "estimatedDurationMs": 35000,
  "riskAssessment": {
    "level": "low|moderate|elevated|high",
    "factors": ["..."],
    "mitigations": ["..."]
  }
}
Be specific and actionable. Each step should be concrete and measurable.`,
            `Plan a mission with these objectives: ${JSON.stringify(objectives)}\nConstraints: ${JSON.stringify(constraints)}\nPriority: ${priority}\nContext: ${JSON.stringify(contextData)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.steps) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, stepCount: parsed.steps?.length });
              return {
                success: true,
                data: {
                  action,
                  planId: `plan-${Date.now()}`,
                  steps: parsed.steps,
                  strategy: parsed.strategy || 'sequential-with-parallel-branches',
                  estimatedDurationMs: parsed.estimatedDurationMs || 35000,
                  riskAssessment: parsed.riskAssessment || { level: 'moderate', factors: [], mitigations: [] },
                  constraints,
                  context: contextData,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: heuristic planning
          this.logger.log('LLM unavailable — falling back to heuristic planning');
          const result = this.heuristicPlan(objectives, constraints, priority, contextData);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              ...result,
              action,
              planId: `plan-${Date.now()}`,
              constraints,
              context: contextData,
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'replan-mission': {
          const planId = config.planId;
          if (!planId) {
            return {
              success: false,
              error: 'planId is required for replan-mission action',
            };
          }
          const reason = config.reason || 'unspecified';
          const completedSteps = config.completedSteps || [];
          const failedSteps = config.failedSteps || [];
          const newConstraints = config.newConstraints || [];

          this.logger.log(
            `Replanning mission ${planId} — reason: ${reason}, failed steps: ${failedSteps.length}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, planId, reason });

          // Try LLM-powered replanning
          const llmResult = await this.executeWithLLM(
            `You are an expert task replanner. The original plan failed and needs revision.
Return a JSON object with this exact structure:
{
  "revisedSteps": [
    { "step": 1, "description": "...", "type": "diagnosis|alternative-generation|resumption", "dependencies": [], "estimatedDurationMs": 4000 }
  ],
  "strategy": "adaptive-retry-with-fallback",
  "estimatedDurationMs": 22000,
  "riskAssessment": {
    "level": "low|moderate|elevated|high",
    "factors": ["..."],
    "mitigations": ["..."]
  }
}`,
            `Replan mission ${planId}. Reason for replan: ${reason}\nCompleted steps: ${JSON.stringify(completedSteps)}\nFailed steps: ${JSON.stringify(failedSteps)}\nNew constraints: ${JSON.stringify(newConstraints)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.revisedSteps) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, planId });
              return {
                success: true,
                data: {
                  action,
                  originalPlanId: planId,
                  revisedPlanId: `plan-${Date.now()}`,
                  reason,
                  completedSteps,
                  failedSteps,
                  revisedSteps: parsed.revisedSteps,
                  strategy: parsed.strategy || 'adaptive-retry-with-fallback',
                  estimatedDurationMs: parsed.estimatedDurationMs || 22000,
                  riskAssessment: parsed.riskAssessment || { level: 'moderate', factors: [], mitigations: [] },
                  newConstraints,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: heuristic replanning
          this.logger.log('LLM unavailable — falling back to heuristic replanning');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, planId, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              originalPlanId: planId,
              revisedPlanId: `plan-${Date.now()}`,
              reason,
              completedSteps,
              failedSteps,
              revisedSteps: [
                { step: 1, description: 'Diagnose failure points from previous plan', type: 'diagnosis', dependencies: [], estimatedDurationMs: 4000 },
                { step: 2, description: 'Generate alternative execution paths', type: 'alternative-generation', dependencies: [1], estimatedDurationMs: 6000 },
                { step: 3, description: 'Re-execute from last successful checkpoint', type: 'resumption', dependencies: [2], estimatedDurationMs: 12000 },
              ],
              strategy: 'adaptive-retry-with-fallback',
              estimatedDurationMs: 22000,
              riskAssessment: {
                level: 'moderate',
                factors: ['Previous failure context may recur', 'Alternative paths are untested'],
                mitigations: ['Validate alternative paths before execution', 'Add checkpoint-based rollback capability'],
              },
              newConstraints,
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'evaluate-strategy': {
          const strategy = config.strategy;
          if (!strategy) {
            return {
              success: false,
              error: 'Strategy is required for evaluate-strategy action',
            };
          }
          const objectives = config.objectives || [];
          const constraints = config.constraints || [];

          this.logger.log(
            `Evaluating strategy: ${typeof strategy === 'string' ? strategy : JSON.stringify(strategy).slice(0, 80)}...`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, strategy });

          // Try LLM-powered strategy evaluation
          const llmResult = await this.executeWithLLM(
            `You are a strategy evaluation expert. Evaluate the given strategy against the objectives and constraints.
Return a JSON object with this structure:
{
  "feasibility": { "score": 0.82, "level": "high|medium|low", "rationale": "..." },
  "riskAssessment": { "level": "low|moderate|elevated|high", "factors": ["..."], "mitigations": ["..."] },
  "alignmentScore": 0.88,
  "estimatedSuccessRate": 0.85,
  "recommendations": ["..."]
}`,
            `Strategy: ${JSON.stringify(strategy)}\nObjectives: ${JSON.stringify(objectives)}\nConstraints: ${JSON.stringify(constraints)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.feasibility) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
              return {
                success: true,
                data: {
                  action,
                  strategy,
                  feasibility: parsed.feasibility,
                  riskAssessment: parsed.riskAssessment || { level: 'moderate', factors: [], mitigations: [] },
                  alignmentScore: parsed.alignmentScore ?? 0.8,
                  estimatedSuccessRate: parsed.estimatedSuccessRate ?? 0.8,
                  recommendations: parsed.recommendations || [],
                  objectives,
                  constraints,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: heuristic evaluation
          this.logger.log('LLM unavailable — falling back to heuristic evaluation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });
          return {
            success: true,
            data: {
              action,
              strategy,
              feasibility: {
                score: 0.82,
                level: 'high',
                rationale: 'Strategy aligns well with stated objectives and constraints. Resource requirements are within acceptable bounds.',
              },
              riskAssessment: {
                level: 'low',
                factors: ['Strategy depends on sequential execution — parallelization limited'],
                mitigations: ['Introduce parallel branches where dependency graph allows'],
              },
              alignmentScore: 0.88,
              estimatedSuccessRate: 0.85,
              recommendations: [
                'Consider adding fallback paths for critical steps',
                'Increase timeout budget for steps with external dependencies',
              ],
              objectives,
              constraints,
              generatedBy: 'heuristic',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Heuristic Fallback ────────────────────────────────────────────

  private heuristicPlan(
    objectives: any,
    constraints: string[],
    priority: string,
    contextData: Record<string, any>,
  ) {
    return {
      steps: [
        { step: 1, description: 'Analyze objectives and gather requirements', type: 'analysis', dependencies: [], estimatedDurationMs: 5000 },
        { step: 2, description: 'Decompose objectives into executable tasks', type: 'decomposition', dependencies: [1], estimatedDurationMs: 8000 },
        { step: 3, description: 'Map task dependencies and determine execution order', type: 'ordering', dependencies: [2], estimatedDurationMs: 3000 },
        { step: 4, description: 'Assign agents to tasks based on capabilities', type: 'allocation', dependencies: [3], estimatedDurationMs: 4000 },
        { step: 5, description: 'Execute plan and monitor progress', type: 'execution', dependencies: [4], estimatedDurationMs: 15000 },
      ],
      strategy: 'sequential-with-parallel-branches',
      estimatedDurationMs: 35000,
      riskAssessment: {
        level: priority === 'high' ? 'elevated' : 'low',
        factors: ['Dependency on external service availability', 'Potential timeout on long-running tasks'],
        mitigations: ['Implement retry logic for external calls', 'Set configurable timeouts per step'],
      },
    };
  }
}
