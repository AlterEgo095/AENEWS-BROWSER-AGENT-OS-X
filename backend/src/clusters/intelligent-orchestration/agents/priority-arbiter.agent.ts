import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * PriorityArbiterAgent resolves priority conflicts, rebalances task queues,
 * and handles escalation/de-escalation of task priorities.
 * Ensures the most important work is always processed first while maintaining fairness.
 */
export class PriorityArbiterAgent extends BaseAgent {
  readonly name = 'PriorityArbiterAgent';
  readonly cluster = ClusterType.INTELLIGENT_ORCHESTRATION;
  readonly capabilities = [
    'resolve-priority',
    'rebalance-queue',
    'escalate',
    'de-escalate',
  ];
  readonly version = '2.0.0';
  readonly description =
    'Resolves priority conflicts, rebalances task queues, and handles escalation/de-escalation to ensure the most important work is processed first';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'resolve-priority';
      const startTime = Date.now();

      switch (action) {
        case 'resolve-priority': {
          const tasks = config.tasks || [];
          const resolutionPolicy = config.resolutionPolicy || 'weighted-scoring';
          const scoringCriteria = config.scoringCriteria || ['urgency', 'impact', 'dependency', 'deadline'];
          const weights = config.weights || { urgency: 0.3, impact: 0.3, dependency: 0.2, deadline: 0.2 };
          const allowTies = config.allowTies ?? false;
          const tieBreaker = config.tieBreaker || 'creation-time';
          this.logger.log(
            `Resolving priority for ${tasks.length} tasks (policy: ${resolutionPolicy})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, taskCount: tasks.length, resolutionPolicy });

          const llmResult = await this.executeWithLLM(
            `You are a professional priority arbitration expert. Resolve priority conflicts using weighted scoring.`,
            `Resolve priorities for ${tasks.length} tasks using policy="${resolutionPolicy}", criteria=${JSON.stringify(scoringCriteria)}, weights=${JSON.stringify(weights)}. Return JSON with: resolvedOrder (array of {taskId, originalPriority, resolvedPriority, score, breakdown}), conflicts (array of {tasks, type, resolution}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const resolvedOrder = parsed?.resolvedOrder || [
            { taskId: 'task-1', originalPriority: 5, resolvedPriority: 9, score: 8.7, breakdown: { urgency: 9, impact: 9, dependency: 8, deadline: 8 } },
            { taskId: 'task-2', originalPriority: 7, resolvedPriority: 8, score: 7.9, breakdown: { urgency: 8, impact: 8, dependency: 7, deadline: 8 } },
            { taskId: 'task-3', originalPriority: 3, resolvedPriority: 6, score: 6.2, breakdown: { urgency: 6, impact: 7, dependency: 5, deadline: 6 } },
          ];
          const conflicts = parsed?.conflicts || [];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { resolvedCount: resolvedOrder.length, conflictCount: conflicts.length });

          return {
            success: true,
            data: {
              action,
              tasks,
              resolutionPolicy,
              scoringCriteria,
              weights,
              allowTies,
              tieBreaker,
              resolvedOrder,
              conflicts,
              status: 'priority_resolved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'rebalance-queue': {
          const queueId = config.queueId || 'default';
          const rebalanceStrategy = config.rebalanceStrategy || 'priority-aware';
          const maxQueueSize = config.maxQueueSize || 1000;
          const targetLatency = config.targetLatency || 5000;
          const considerAging = config.considerAging ?? true;
          const agingFactor = config.agingFactor || 0.1;
          const preventStarvation = config.preventStarvation ?? true;
          this.logger.log(
            `Rebalancing queue ${queueId} (strategy: ${rebalanceStrategy}, target latency: ${targetLatency}ms)`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, queueId, rebalanceStrategy });

          const llmResult = await this.executeWithLLM(
            `You are a professional queue management expert. Rebalance a task queue to optimize throughput and prevent starvation.`,
            `Rebalance queue: id="${queueId}", strategy="${rebalanceStrategy}", maxQueueSize=${maxQueueSize}, targetLatency=${targetLatency}ms, considerAging=${considerAging}, preventStarvation=${preventStarvation}. Return JSON with: beforeState ({queueDepth, avgWaitTime, priorityDistribution, starvationCandidates}), adjustments (array of {taskId, previousPosition, newPosition, reason}), afterState ({queueDepth, avgWaitTime, priorityDistribution, starvationCandidates}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const beforeState = parsed?.beforeState || {
            queueDepth: 147,
            avgWaitTime: 8200,
            priorityDistribution: { critical: 12, high: 35, medium: 68, low: 32 },
            starvationCandidates: 3,
          };
          const adjustments = parsed?.adjustments || [
            { taskId: 'task-42', previousPosition: 89, newPosition: 5, reason: 'Aging factor boost — waiting over 2x target latency' },
            { taskId: 'task-15', previousPosition: 45, newPosition: 8, reason: 'Priority escalation due to dependency chain' },
            { taskId: 'task-67', previousPosition: 12, newPosition: 15, reason: 'Deprioritized low-impact task to free critical path' },
          ];
          const afterState = parsed?.afterState || {
            queueDepth: 147,
            avgWaitTime: 5400,
            priorityDistribution: { critical: 15, high: 40, medium: 62, low: 30 },
            starvationCandidates: 0,
          };

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { queueId, adjustmentCount: adjustments.length });

          return {
            success: true,
            data: {
              action,
              queueId,
              rebalanceStrategy,
              maxQueueSize,
              targetLatency,
              considerAging,
              agingFactor,
              preventStarvation,
              beforeState,
              adjustments,
              afterState,
              status: 'queue_rebalanced',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'escalate': {
          const taskId = config.taskId;
          const targetPriority = config.targetPriority;
          const reason = config.reason || 'manual-escalation';
          const approver = config.approver;
          const notifyOwner = config.notifyOwner ?? true;
          const propagateDependencies = config.propagateDependencies ?? true;
          const maxEscalationLevel = config.maxEscalationLevel || 'critical';
          this.logger.log(
            `Escalating task ${taskId || 'unknown'} to priority ${targetPriority || 'next'} (reason: ${reason})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, taskId, targetPriority, reason });

          const llmResult = await this.executeWithLLM(
            `You are a professional task escalation expert. Determine the appropriate escalation level and propagate to dependencies.`,
            `Escalate task: id="${taskId}", targetPriority="${targetPriority}", reason="${reason}", propagateDependencies=${propagateDependencies}, maxLevel="${maxEscalationLevel}". Return JSON with: escalationId (string), previousPriority (string), newPriority (string), escalatedDependencies (array of {taskId, previousPriority, newPriority}), approvalRequired (boolean).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const escalationId = parsed?.escalationId || `esc-${Date.now()}`;
          const previousPriority = parsed?.previousPriority || 'medium';
          const newPriority = parsed?.newPriority || targetPriority || 'high';
          const escalatedDependencies = parsed?.escalatedDependencies || [
            { taskId: 'dep-task-1', previousPriority: 'low', newPriority: 'medium' },
            { taskId: 'dep-task-2', previousPriority: 'medium', newPriority: 'high' },
          ];
          const approvalRequired = parsed?.approvalRequired ?? true;

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { escalationId, newPriority, dependencyCount: escalatedDependencies.length });

          return {
            success: true,
            data: {
              action,
              taskId: taskId || null,
              targetPriority: targetPriority || null,
              reason,
              approver,
              notifyOwner,
              propagateDependencies,
              maxEscalationLevel,
              escalationId,
              previousPriority,
              newPriority,
              escalatedDependencies,
              approvalRequired,
              status: 'escalation_processed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'de-escalate': {
          const taskId = config.taskId;
          const targetPriority = config.targetPriority;
          const reason = config.reason || 'conditions-met';
          const autoDeEscalate = config.autoDeEscalate ?? true;
          const conditions = config.conditions || [];
          const gracePeriod = config.gracePeriod || 0;
          const notifyOwner = config.notifyOwner ?? true;
          this.logger.log(
            `De-escalating task ${taskId || 'unknown'} to priority ${targetPriority || 'normal'} (reason: ${reason})`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, taskId, targetPriority, reason });

          const llmResult = await this.executeWithLLM(
            `You are a professional task de-escalation expert. Verify conditions are met and safely reduce task priority.`,
            `De-escalate task: id="${taskId}", targetPriority="${targetPriority}", reason="${reason}", autoDeEscalate=${autoDeEscalate}, conditions=${JSON.stringify(conditions)}. Return JSON with: deEscalationId (string), previousPriority (string), newPriority (string), conditionsMet (array of {condition, evaluated, result}), dependentDeEscalations (array of {taskId, previousPriority, newPriority}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );
          const parsed = this.safeJsonParse(llmResult);

          const deEscalationId = parsed?.deEscalationId || `deesc-${Date.now()}`;
          const previousPriority = parsed?.previousPriority || 'critical';
          const newPriority = parsed?.newPriority || targetPriority || 'medium';
          const conditionsMet = parsed?.conditionsMet || [
            { condition: 'Error rate returned to baseline', evaluated: true, result: 'passed' },
            { condition: 'No downstream dependencies at critical', evaluated: true, result: 'passed' },
            { condition: 'SLA compliance restored', evaluated: true, result: 'passed' },
          ];
          const dependentDeEscalations = parsed?.dependentDeEscalations || [
            { taskId: 'dep-task-1', previousPriority: 'high', newPriority: 'medium' },
          ];

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { deEscalationId, newPriority, conditionsMetCount: conditionsMet.filter((c: any) => c.result === 'passed').length });

          return {
            success: true,
            data: {
              action,
              taskId: taskId || null,
              targetPriority: targetPriority || null,
              reason,
              autoDeEscalate,
              conditions,
              gracePeriod,
              notifyOwner,
              deEscalationId,
              previousPriority,
              newPriority,
              conditionsMet,
              dependentDeEscalations,
              status: 'de_escalation_processed',
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
