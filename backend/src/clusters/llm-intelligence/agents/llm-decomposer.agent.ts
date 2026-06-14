import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * LLMDecomposerAgent — Intelligent task decomposition with dependency ordering.
 *
 * Breaks down complex tasks into manageable sub-tasks, identifies inter-task
 * dependencies, and estimates the complexity of each decomposed unit.
 *
 * When LLM is available: Uses real LLM calls for intelligent decomposition.
 * When LLM is unavailable: Falls back to structural heuristic decomposition.
 *
 * Supported actions:
 * - `decompose-task`          → Break a complex task into ordered sub-tasks
 * - `identify-dependencies`   → Map dependencies between tasks or sub-tasks
 * - `estimate-complexity`     → Assess complexity of a task or set of sub-tasks
 */
export class LLMDecomposerAgent extends BaseAgent {
  readonly name = 'LLMDecomposerAgent';
  readonly cluster = ClusterType.LLM_INTELLIGENCE;
  readonly capabilities = [
    'decompose-task',
    'identify-dependencies',
    'estimate-complexity',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Intelligent task decomposition with dependency ordering using LLM reasoning';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'decompose-task';
      const startTime = Date.now();

      switch (action) {
        case 'decompose-task': {
          const task = config.task;
          if (!task) {
            return { success: false, error: 'Task is required for decompose-task action' };
          }
          const granularity = config.granularity || 'medium';
          const constraints = config.constraints || [];
          const maxSubTasks = config.maxSubTasks || 10;

          this.logger.log(
            `Decomposing task with granularity: ${granularity}, maxSubTasks: ${maxSubTasks}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, granularity });

          const llmResult = await this.executeWithLLM(
            `You are a task decomposition expert. Break the following complex task into well-ordered sub-tasks.
Return a JSON object with this exact structure:
{
  "subTasks": [
    { "id": "sub-1", "title": "...", "order": 1, "estimatedDurationMs": 5000 }
  ],
  "parallelizableGroups": [
    { "groupId": "g1", "subTaskIds": ["sub-2", "sub-3"], "canRunParallel": true }
  ]
}
Granularity level: ${granularity} (${granularity === 'fine' ? '8+ sub-tasks' : granularity === 'coarse' ? '2-3 sub-tasks' : '4-6 sub-tasks'}).
Maximum sub-tasks: ${maxSubTasks}.
Be specific: each sub-task title should be a concrete, actionable step.`,
            `Decompose this task: ${JSON.stringify(task)}\nConstraints: ${JSON.stringify(constraints)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.subTasks) {
              const subTasks = parsed.subTasks.slice(0, maxSubTasks);
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, subTaskCount: subTasks.length });
              return {
                success: true,
                data: {
                  action,
                  decompositionId: `decomp-${Date.now()}`,
                  originalTask: task,
                  granularity,
                  subTasks,
                  totalSubTasks: subTasks.length,
                  estimatedTotalDurationMs: subTasks.reduce((sum: number, st: any) => sum + (st.estimatedDurationMs || 5000), 0),
                  parallelizableGroups: parsed.parallelizableGroups || [],
                  constraints,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: structural decomposition
          this.logger.log('LLM unavailable — falling back to structural decomposition');
          const subTasks = this.heuristicDecompose(task, granularity, maxSubTasks);
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              decompositionId: `decomp-${Date.now()}`,
              originalTask: task,
              granularity,
              subTasks,
              totalSubTasks: subTasks.length,
              estimatedTotalDurationMs: subTasks.reduce((sum, st) => sum + st.estimatedDurationMs, 0),
              parallelizableGroups: granularity !== 'coarse'
                ? [{ groupId: 'g1', subTaskIds: ['sub-1'], canRunParallel: false }, { groupId: 'g2', subTaskIds: ['sub-2', 'sub-3'], canRunParallel: true }]
                : [],
              constraints,
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'identify-dependencies': {
          const tasks = config.tasks;
          if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return { success: false, error: 'Tasks array is required for identify-dependencies action' };
          }
          const dependencyDepth = config.dependencyDepth || 'direct';

          this.logger.log(
            `Identifying ${dependencyDepth} dependencies across ${tasks.length} task(s)`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, taskCount: tasks.length });

          const llmResult = await this.executeWithLLM(
            `You are a dependency analysis expert. Identify dependencies between the given tasks.
Return a JSON object with this structure:
{
  "dependencies": [
    { "taskId": "task-1", "dependsOn": [], "dependents": ["task-2"], "type": "sequential|parallel|conditional" }
  ],
  "criticalPath": ["task-1", "task-2"],
  "parallelizationOpportunities": [
    { "group": ["task-2", "task-3"], "reason": "...", "estimatedSpeedup": 0.35 }
  ]
}`,
            `Tasks: ${JSON.stringify(tasks)}\nDependency depth: ${dependencyDepth}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.dependencies) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
              return {
                success: true,
                data: {
                  action,
                  dependencyMapId: `depmap-${Date.now()}`,
                  dependencies: parsed.dependencies,
                  criticalPath: parsed.criticalPath || tasks.map((t: any, i: number) => t.id || `task-${i + 1}`),
                  criticalPathLength: (parsed.criticalPath || tasks).length,
                  cycles: null,
                  dependencyDepth,
                  parallelizationOpportunities: parsed.parallelizationOpportunities || [],
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback: sequential dependency mapping
          this.logger.log('LLM unavailable — falling back to sequential dependency mapping');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              dependencyMapId: `depmap-${Date.now()}`,
              dependencies: tasks.map((task: any, index: number) => ({
                taskId: task.id || `task-${index + 1}`,
                dependsOn: index > 0 ? [tasks[index - 1]?.id || `task-${index}`] : [],
                dependents: index < tasks.length - 1 ? [tasks[index + 1]?.id || `task-${index + 2}`] : [],
                type: 'sequential',
              })),
              criticalPath: tasks.map((t: any, i: number) => t.id || `task-${i + 1}`),
              criticalPathLength: tasks.length,
              cycles: null,
              dependencyDepth,
              parallelizationOpportunities: [],
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'estimate-complexity': {
          const task = config.task;
          if (!task) {
            return { success: false, error: 'Task is required for estimate-complexity action' };
          }
          const metrics = config.metrics || ['time', 'effort', 'risk'];

          this.logger.log(
            `Estimating complexity for task using metrics: ${metrics.join(', ')}`,
          );

          this.emitEvent(AgentEventType.AGENT_STARTED, { action, metrics });

          const llmResult = await this.executeWithLLM(
            `You are a complexity estimation expert. Assess the complexity of the given task.
Return a JSON object with this structure:
{
  "complexityScore": 0.65,
  "complexityLevel": "low|moderate|high|very-high",
  "metrics": {
    "time": { "estimate": "2-4 hours", "confidence": 0.78 },
    "effort": { "estimate": "medium", "confidence": 0.82 },
    "risk": { "estimate": "low-to-moderate", "confidence": 0.71 }
  },
  "drivers": [
    { "factor": "...", "impact": "high|medium|low", "description": "..." }
  ]
}`,
            `Task: ${JSON.stringify(task)}\nMetrics to evaluate: ${JSON.stringify(metrics)}`,
            { responseFormat: 'json' },
          );

          if (llmResult) {
            const parsed = this.safeJsonParse(llmResult);
            if (parsed && parsed.complexityScore !== undefined) {
              this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, complexityScore: parsed.complexityScore });
              return {
                success: true,
                data: {
                  action,
                  estimationId: `est-${Date.now()}`,
                  task,
                  complexityScore: parsed.complexityScore,
                  complexityLevel: parsed.complexityLevel || 'moderate',
                  metrics: parsed.metrics || {},
                  evaluatedMetrics: metrics,
                  drivers: parsed.drivers || [],
                  baseline: config.baseline ? { reference: config.baseline, delta: 'See LLM analysis' } : null,
                  generatedBy: 'llm',
                  timestamp: new Date().toISOString(),
                },
                metadata: { duration: Date.now() - startTime, source: 'llm' },
              };
            }
          }

          // Fallback
          this.logger.log('LLM unavailable — falling back to heuristic complexity estimation');
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action,
              estimationId: `est-${Date.now()}`,
              task,
              complexityScore: 0.65,
              complexityLevel: 'moderate',
              metrics: {
                time: { estimate: '2-4 hours', confidence: 0.78 },
                effort: { estimate: 'medium', confidence: 0.82 },
                risk: { estimate: 'low-to-moderate', confidence: 0.71 },
              },
              evaluatedMetrics: metrics,
              drivers: [
                { factor: 'Task scope', impact: 'medium', description: 'Requires structured decomposition (LLM unavailable for detailed analysis)' },
              ],
              baseline: config.baseline ? { reference: config.baseline, delta: '+15% complexity vs baseline (estimate)' } : null,
              generatedBy: 'fallback',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
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

  private heuristicDecompose(task: any, granularity: string, maxSubTasks: number) {
    const templates: Record<string, Array<{ id: string; title: string; order: number; estimatedDurationMs: number }>> = {
      fine: [
        { id: 'sub-1', title: 'Gather input data and validate schema', order: 1, estimatedDurationMs: 3000 },
        { id: 'sub-2', title: 'Pre-process and normalize inputs', order: 2, estimatedDurationMs: 4000 },
        { id: 'sub-3', title: 'Execute primary transformation', order: 3, estimatedDurationMs: 6000 },
        { id: 'sub-4', title: 'Apply validation rules to output', order: 4, estimatedDurationMs: 2000 },
        { id: 'sub-5', title: 'Generate intermediate artifacts', order: 5, estimatedDurationMs: 3000 },
        { id: 'sub-6', title: 'Run consistency checks', order: 6, estimatedDurationMs: 2000 },
        { id: 'sub-7', title: 'Aggregate results', order: 7, estimatedDurationMs: 2000 },
        { id: 'sub-8', title: 'Format final output', order: 8, estimatedDurationMs: 1500 },
      ],
      coarse: [
        { id: 'sub-1', title: 'Prepare and validate inputs', order: 1, estimatedDurationMs: 7000 },
        { id: 'sub-2', title: 'Execute core processing', order: 2, estimatedDurationMs: 12000 },
        { id: 'sub-3', title: 'Validate and deliver output', order: 3, estimatedDurationMs: 5000 },
      ],
    };
    const defaultTemplate = [
      { id: 'sub-1', title: 'Input validation and preparation', order: 1, estimatedDurationMs: 5000 },
      { id: 'sub-2', title: 'Core transformation and processing', order: 2, estimatedDurationMs: 8000 },
      { id: 'sub-3', title: 'Intermediate validation checkpoint', order: 3, estimatedDurationMs: 3000 },
      { id: 'sub-4', title: 'Output generation and finalization', order: 4, estimatedDurationMs: 4000 },
    ];
    const result = templates[granularity] || defaultTemplate;
    return result.slice(0, maxSubTasks);
  }
}
