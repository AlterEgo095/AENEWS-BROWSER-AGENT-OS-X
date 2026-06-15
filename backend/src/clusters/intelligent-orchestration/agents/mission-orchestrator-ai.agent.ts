import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * MissionOrchestratorAIAgent orchestrates complex missions by creating execution
 * pipelines, handling failures gracefully, and adapting workflows dynamically.
 * Uses AI-driven decision making to optimize mission outcomes.
 */
export class MissionOrchestratorAIAgent extends BaseAgent {
  readonly name = 'MissionOrchestratorAIAgent';
  readonly cluster = ClusterType.INTELLIGENT_ORCHESTRATION;
  readonly capabilities = [
    'orchestrate-mission',
    'create-pipeline',
    'handle-failure',
    'adapt-flow',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Orchestrates complex missions by creating execution pipelines, handling failures, and adapting workflows dynamically using AI-driven decision making';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'orchestrate-mission';
      const startTime = Date.now();

      switch (action) {
        case 'orchestrate-mission': {
          const missionId = config.missionId;
          const missionType = config.missionType || 'standard';
          const objective = config.objective;
          const constraints = config.constraints || [];
          const priority = config.priority || 'medium';
          const maxDuration = config.maxDuration || 3600000;
          const retryStrategy = config.retryStrategy || 'exponential';
          const maxRetries = config.maxRetries || 3;
          const parallelism = config.parallelism || 'auto';
          this.logger.log(
            `Orchestrating mission ${missionId || 'new'} (type: ${missionType}, priority: ${priority})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, missionId, missionType });

          const llmResult = await this.executeWithLLM(
            `You are a professional mission orchestration expert. Design an optimal execution pipeline for the given mission.`,
            `Design a mission pipeline for: objective="${objective}", type="${missionType}", priority="${priority}", constraints=${JSON.stringify(constraints)}, parallelism="${parallelism}". Return JSON with: pipelineId (string), stages (array of {id, name, status, dependencies, estimatedDuration}), estimatedCompletion (ISO string).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const pipelineId = parsed?.pipelineId || `pipe-${Date.now()}`;
          const stages = parsed?.stages || [
            { id: 'stage-1', name: 'Requirements Analysis', status: 'pending', dependencies: [], estimatedDuration: 120000 },
            { id: 'stage-2', name: 'Resource Allocation', status: 'pending', dependencies: ['stage-1'], estimatedDuration: 60000 },
            { id: 'stage-3', name: 'Core Execution', status: 'pending', dependencies: ['stage-2'], estimatedDuration: 300000 },
            { id: 'stage-4', name: 'Validation & QA', status: 'pending', dependencies: ['stage-3'], estimatedDuration: 180000 },
            { id: 'stage-5', name: 'Delivery & Report', status: 'pending', dependencies: ['stage-4'], estimatedDuration: 60000 },
          ];
          const estimatedCompletion = parsed?.estimatedCompletion || new Date(Date.now() + maxDuration).toISOString();

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { pipelineId, stageCount: stages.length });

          return {
            success: true,
            data: {
              action,
              missionId: missionId || null,
              missionType,
              objective,
              constraints,
              priority,
              maxDuration,
              retryStrategy,
              maxRetries,
              parallelism,
              pipelineId,
              stages,
              estimatedCompletion,
              status: 'mission_orchestration_initiated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'create-pipeline': {
          const pipelineName = config.pipelineName;
          const steps = config.steps || [];
          const executionMode = config.executionMode || 'sequential';
          const failurePolicy = config.failurePolicy || 'halt';
          const checkpointInterval = config.checkpointInterval || 60;
          const enableRollback = config.enableRollback ?? true;
          const timeout = config.timeout || 7200000;
          this.logger.log(
            `Creating pipeline "${pipelineName || 'unnamed'}" with ${steps.length} steps (mode: ${executionMode})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, pipelineName, stepCount: steps.length });

          const llmResult = await this.executeWithLLM(
            `You are a professional pipeline architect. Design a DAG-based execution pipeline.`,
            `Create a pipeline: name="${pipelineName}", steps=${JSON.stringify(steps)}, mode="${executionMode}", failurePolicy="${failurePolicy}". Return JSON with: pipelineId (string), dag ({nodes: string[], edges: [{from, to}], hasCycles: boolean}), checkpoints (array of {stepId, afterExecution, dataSnapshot}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const pipelineId = parsed?.pipelineId || `pipeline-${Date.now()}`;
          const dag = parsed?.dag || {
            nodes: steps.length > 0 ? steps.map((s: any, i: number) => `step-${i + 1}`) : ['step-1', 'step-2', 'step-3'],
            edges: steps.length > 1
              ? steps.slice(1).map((_: any, i: number) => ({ from: `step-${i + 1}`, to: `step-${i + 2}` }))
              : [{ from: 'step-1', to: 'step-2' }, { from: 'step-2', to: 'step-3' }],
            hasCycles: false,
          };
          const checkpoints = parsed?.checkpoints || dag.nodes.slice(0, -1).map((node: string) => ({
            stepId: node,
            afterExecution: true,
            dataSnapshot: true,
          }));

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { pipelineId, nodeCount: dag.nodes.length });

          return {
            success: true,
            data: {
              action,
              pipelineName,
              steps,
              executionMode,
              failurePolicy,
              checkpointInterval,
              enableRollback,
              timeout,
              pipelineId,
              dag,
              checkpoints,
              status: 'pipeline_created',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'handle-failure': {
          const failureId = config.failureId;
          const failureType = config.failureType || 'unknown';
          const failedStep = config.failedStep;
          const errorDetails = config.errorDetails || {};
          const recoveryStrategy = config.recoveryStrategy || 'auto';
          const maxRecoveryAttempts = config.maxRecoveryAttempts || 3;
          const escalateAfter = config.escalateAfter || 3;
          const notifyStakeholders = config.notifyStakeholders ?? true;
          this.logger.log(
            `Handling failure ${failureId || 'unknown'} at step ${failedStep || 'unknown'} (type: ${failureType})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, failureId, failureType, failedStep });

          const llmResult = await this.executeWithLLM(
            `You are a professional failure recovery expert. Analyze the failure and design a recovery plan.`,
            `Analyze failure: type="${failureType}", failedStep="${failedStep}", errorDetails=${JSON.stringify(errorDetails)}, recoveryStrategy="${recoveryStrategy}". Return JSON with: recoveryPlan ({strategy, actions: [{type, description, estimatedTime}], estimatedRecoveryTime}), affectedSteps (string[]), rollbackAvailable (boolean).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const recoveryPlan = parsed?.recoveryPlan || {
            strategy: recoveryStrategy,
            actions: [
              { type: 'diagnose', description: `Diagnose root cause of ${failureType} failure at ${failedStep || 'unknown step'}`, estimatedTime: 15000 },
              { type: 'retry', description: 'Retry failed operation with exponential backoff', estimatedTime: 30000 },
              { type: 'compensate', description: 'Execute compensating action to restore consistency', estimatedTime: 20000 },
            ],
            estimatedRecoveryTime: 65000,
          };
          const affectedSteps = parsed?.affectedSteps || (failedStep ? [failedStep] : []);
          const rollbackAvailable = parsed?.rollbackAvailable ?? true;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { recoveryStrategy: recoveryPlan.strategy, actionCount: recoveryPlan.actions.length });

          return {
            success: true,
            data: {
              action,
              failureId: failureId || null,
              failureType,
              failedStep,
              errorDetails,
              recoveryStrategy,
              maxRecoveryAttempts,
              escalateAfter,
              notifyStakeholders,
              recoveryPlan,
              affectedSteps,
              rollbackAvailable,
              status: 'failure_handling_initiated',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'adapt-flow': {
          const missionId = config.missionId;
          const adaptationReason = config.adaptationReason || 'optimization';
          const newConstraints = config.newConstraints || [];
          const preserveProgress = config.preserveProgress ?? true;
          const reoptimizationDepth = config.reoptimizationDepth || 'shallow';
          const allowStepReordering = config.allowStepReordering ?? true;
          const allowStepSkipping = config.allowStepSkipping ?? false;
          this.logger.log(
            `Adapting flow for mission ${missionId || 'unknown'} (reason: ${adaptationReason})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, missionId, adaptationReason });

          const llmResult = await this.executeWithLLM(
            `You are a professional workflow adaptation specialist. Analyze the need for flow changes and propose adaptations.`,
            `Adapt flow for mission: id="${missionId}", reason="${adaptationReason}", newConstraints=${JSON.stringify(newConstraints)}, preserveProgress=${preserveProgress}. Return JSON with: adaptationId (string), changes (array of {type, description, affectedSteps, impact}), progressSnapshot ({completedSteps, currentStep, progressPercent}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const adaptationId = parsed?.adaptationId || `adapt-${Date.now()}`;
          const changes = parsed?.changes || [
            { type: 'reorder', description: `Reorder steps to prioritize critical path due to ${adaptationReason}`, affectedSteps: ['stage-3', 'stage-4'], impact: 'medium' },
            { type: 'parallelize', description: 'Enable parallel execution of independent validation tasks', affectedSteps: ['stage-4'], impact: 'high' },
          ];
          const progressSnapshot = parsed?.progressSnapshot || {
            completedSteps: ['stage-1', 'stage-2'],
            currentStep: 'stage-3',
            progressPercent: 45,
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { adaptationId, changeCount: changes.length });

          return {
            success: true,
            data: {
              action,
              missionId: missionId || null,
              adaptationReason,
              newConstraints,
              preserveProgress,
              reoptimizationDepth,
              allowStepReordering,
              allowStepSkipping,
              adaptationId,
              changes,
              progressSnapshot,
              status: 'flow_adaptation_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
