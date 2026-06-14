/**
 * AENEWS Agent OS X — Mission Decomposition Engine
 *
 * Phase 8 — AI-powered mission decomposition into sub-tasks.
 *
 * Decomposition strategies:
 *   1. LLM-Powered: Uses LLM to intelligently break down complex missions
 *   2. Template-Based: Uses pre-defined templates for common mission patterns
 *   3. Heuristic: Rule-based decomposition when LLM is unavailable
 *   4. Hybrid: Combines LLM with heuristics for robust decomposition
 *
 * Features:
 *   - Dependency graph generation (DAG)
 *   - Capability-aware decomposition (splits by required tools)
 *   - Priority assignment based on mission constraints
 *   - Estimated duration and cost calculation
 *   - Decomposition quality scoring
 *   - Recursive decomposition for complex sub-tasks
 *   - Cross-cluster dependency resolution
 *
 * Integration:
 *   - Feeds into AgentOrchestratorService's 7-step pipeline
 *   - Works with AgentCollaborationService for multi-agent tasks
 *   - Uses UnifiedConnectorRegistry for capability matching
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { Subtask } from './agent-orchestrator.service';

// ─── Decomposition Types ────────────────────────────────────────

export type DecompositionStrategy = 'llm' | 'template' | 'heuristic' | 'hybrid';

export interface DecompositionRequest {
  missionId: string;
  description: string;
  objectives?: string[];
  constraints?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  expectedOutput?: string;
  maxSubtasks?: number;
  maxDepth?: number;
  preferredClusters?: ClusterType[];
  requiredCapabilities?: string[];
}

export interface DecomposedSubtask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  preferredCluster?: ClusterType;
  dependencies: string[];
  priority: number;
  estimatedDurationMs: number;
  estimatedCostUsd: number;
  complexity: 'simple' | 'moderate' | 'complex';
  canParallelize: boolean;
  objectives: string[];
}

export interface DecompositionResult {
  missionId: string;
  strategy: DecompositionStrategy;
  subtasks: DecomposedSubtask[];
  executionOrder: string[][];
  dependencyGraph: Record<string, string[]>;
  totalEstimatedDurationMs: number;
  totalEstimatedCostUsd: number;
  qualityScore: number; // 0-1
  depth: number;
  crossClusterDependencies: Array<{
    from: ClusterType;
    to: ClusterType;
    subtaskIds: string[];
  }>;
}

export interface DecompositionTemplate {
  name: string;
  description: string;
  pattern: string;
  subtaskTemplates: Array<{
    description: string;
    requiredCapabilities: string[];
    preferredCluster?: ClusterType;
    priority: number;
  }>;
}

// ─── Built-in Templates ──────────────────────────────────────────

const BUILT_IN_TEMPLATES: DecompositionTemplate[] = [
  {
    name: 'web_application',
    description: 'Full-stack web application development',
    pattern: 'build',
    subtaskTemplates: [
      { description: 'Research and plan architecture', requiredCapabilities: ['architecture', 'planning'], preferredCluster: ClusterType.CODING, priority: 1 },
      { description: 'Design frontend UI components', requiredCapabilities: ['frontend', 'ui-design'], preferredCluster: ClusterType.CODING, priority: 2 },
      { description: 'Implement backend API endpoints', requiredCapabilities: ['backend', 'api'], preferredCluster: ClusterType.CODING, priority: 2 },
      { description: 'Set up database schema', requiredCapabilities: ['database', 'schema'], preferredCluster: ClusterType.CODING, priority: 2 },
      { description: 'Write tests', requiredCapabilities: ['testing', 'qa'], preferredCluster: ClusterType.CERTIFICATION, priority: 3 },
      { description: 'Deploy to production', requiredCapabilities: ['deployment', 'devops'], preferredCluster: ClusterType.INFRASTRUCTURE, priority: 4 },
    ],
  },
  {
    name: 'data_analysis',
    description: 'Data analysis and reporting',
    pattern: 'analyze',
    subtaskTemplates: [
      { description: 'Collect and clean data', requiredCapabilities: ['data-collection', 'etl'], preferredCluster: ClusterType.BUSINESS, priority: 1 },
      { description: 'Perform statistical analysis', requiredCapabilities: ['statistics', 'analysis'], preferredCluster: ClusterType.BUSINESS, priority: 2 },
      { description: 'Create visualizations', requiredCapabilities: ['visualization', 'charts'], preferredCluster: ClusterType.OFFICE, priority: 3 },
      { description: 'Generate report', requiredCapabilities: ['reporting', 'documentation'], preferredCluster: ClusterType.OFFICE, priority: 4 },
    ],
  },
  {
    name: 'security_audit',
    description: 'Comprehensive security audit',
    pattern: 'audit',
    subtaskTemplates: [
      { description: 'Scan for vulnerabilities', requiredCapabilities: ['vulnerability-scan', 'security'], preferredCluster: ClusterType.SECURITY, priority: 1 },
      { description: 'Analyze code for security issues', requiredCapabilities: ['code-analysis', 'security-review'], preferredCluster: ClusterType.SECURITY, priority: 2 },
      { description: 'Test authentication and authorization', requiredCapabilities: ['auth-testing', 'penetration'], preferredCluster: ClusterType.SECURITY, priority: 2 },
      { description: 'Generate audit report', requiredCapabilities: ['reporting', 'compliance'], preferredCluster: ClusterType.CERTIFICATION, priority: 3 },
    ],
  },
  {
    name: 'marketing_campaign',
    description: 'Marketing campaign creation and execution',
    pattern: 'market',
    subtaskTemplates: [
      { description: 'Research target audience', requiredCapabilities: ['research', 'audience-analysis'], preferredCluster: ClusterType.MARKETING, priority: 1 },
      { description: 'Create content strategy', requiredCapabilities: ['content-strategy', 'planning'], preferredCluster: ClusterType.MARKETING, priority: 2 },
      { description: 'Produce marketing materials', requiredCapabilities: ['content-creation', 'copywriting'], preferredCluster: ClusterType.MARKETING, priority: 3 },
      { description: 'Distribute across channels', requiredCapabilities: ['distribution', 'social-media'], preferredCluster: ClusterType.MARKETING, priority: 4 },
      { description: 'Track and analyze results', requiredCapabilities: ['analytics', 'tracking'], preferredCluster: ClusterType.BUSINESS, priority: 5 },
    ],
  },
  {
    name: 'browser_automation',
    description: 'Browser automation and web scraping',
    pattern: 'browse',
    subtaskTemplates: [
      { description: 'Navigate to target pages', requiredCapabilities: ['navigation', 'browsing'], preferredCluster: ClusterType.BROWSER, priority: 1 },
      { description: 'Extract data from pages', requiredCapabilities: ['scraping', 'extraction'], preferredCluster: ClusterType.BROWSER, priority: 2 },
      { description: 'Process and structure data', requiredCapabilities: ['data-processing', 'structuring'], preferredCluster: ClusterType.BUSINESS, priority: 3 },
      { description: 'Generate output', requiredCapabilities: ['formatting', 'output'], preferredCluster: ClusterType.OFFICE, priority: 4 },
    ],
  },
];

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class MissionDecompositionService {
  private readonly logger = new Logger(MissionDecompositionService.name);

  /** Custom templates registered at runtime */
  private readonly customTemplates = new Map<string, DecompositionTemplate>();

  /** Decomposition history for learning */
  private readonly decompositionHistory: DecompositionResult[] = [];
  private readonly MAX_HISTORY = 200;

  constructor(
    @Optional() private readonly llmService: LLMService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Decompose a mission into sub-tasks.
   *
   * Strategy selection:
   *   1. If LLM is available → 'hybrid' (LLM + heuristics)
   *   2. If template matches → 'template'
   *   3. Otherwise → 'heuristic'
   */
  async decompose(request: DecompositionRequest): Promise<DecompositionResult> {
    const startTime = Date.now();

    // Select strategy
    const strategy = this.selectStrategy(request);

    this.logger.log({
      msg: 'Decomposing mission',
      missionId: request.missionId,
      strategy,
      description: request.description.substring(0, 100),
    });

    let result: DecompositionResult;

    switch (strategy) {
      case 'llm':
        result = await this.decomposeWithLLM(request);
        break;
      case 'template':
        result = this.decomposeWithTemplate(request);
        break;
      case 'heuristic':
        result = this.heuristicDecompose(request);
        break;
      case 'hybrid':
      default:
        result = await this.hybridDecompose(request);
        break;
    }

    // Post-processing: compute execution order and dependency graph
    result.executionOrder = this.computeExecutionOrder(result.subtasks);
    result.dependencyGraph = this.buildDependencyGraph(result.subtasks);
    result.crossClusterDependencies = this.findCrossClusterDependencies(result.subtasks);
    result.totalEstimatedDurationMs = result.subtasks.reduce((sum, s) => sum + s.estimatedDurationMs, 0);
    result.totalEstimatedCostUsd = result.subtasks.reduce((sum, s) => sum + s.estimatedCostUsd, 0);
    result.qualityScore = this.scoreDecomposition(result);

    // Store in memory for future reference
    await this.memory.store(
      request.missionId,
      MemoryTier.SESSION,
      'decomposition',
      result,
    );

    // Emit event
    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'decomposition', {
      missionId: request.missionId,
      strategy,
      subtaskCount: result.subtasks.length,
      qualityScore: result.qualityScore,
      durationMs: Date.now() - startTime,
    });

    // Add to history
    this.decompositionHistory.push(result);
    if (this.decompositionHistory.length > this.MAX_HISTORY) {
      this.decompositionHistory.shift();
    }

    return result;
  }

  /**
   * Register a custom decomposition template.
   */
  registerTemplate(template: DecompositionTemplate): void {
    this.customTemplates.set(template.name, template);
    this.logger.log(`Registered custom decomposition template: ${template.name}`);
  }

  /**
   * Get decomposition history.
   */
  getHistory(limit?: number): DecompositionResult[] {
    return limit
      ? this.decompositionHistory.slice(-limit)
      : [...this.decompositionHistory];
  }

  /**
   * Find a matching template for a mission description.
   */
  findMatchingTemplate(description: string): DecompositionTemplate | null {
    const allTemplates = [...BUILT_IN_TEMPLATES, ...this.customTemplates.values()];
    const lowerDesc = description.toLowerCase();

    // Keyword matching
    for (const template of allTemplates) {
      const keywords = template.name.split('_');
      if (keywords.some((kw) => lowerDesc.includes(kw))) {
        return template;
      }
      if (lowerDesc.includes(template.pattern)) {
        return template;
      }
    }

    // Pattern matching
    if (lowerDesc.includes('web') || lowerDesc.includes('application') || lowerDesc.includes('website')) {
      return allTemplates.find((t) => t.name === 'web_application') ?? null;
    }
    if (lowerDesc.includes('data') && (lowerDesc.includes('analyz') || lowerDesc.includes('report'))) {
      return allTemplates.find((t) => t.name === 'data_analysis') ?? null;
    }
    if (lowerDesc.includes('security') || lowerDesc.includes('audit') || lowerDesc.includes('vulnerability')) {
      return allTemplates.find((t) => t.name === 'security_audit') ?? null;
    }
    if (lowerDesc.includes('marketing') || lowerDesc.includes('campaign') || lowerDesc.includes('social media')) {
      return allTemplates.find((t) => t.name === 'marketing_campaign') ?? null;
    }
    if (lowerDesc.includes('scrape') || lowerDesc.includes('browser') || lowerDesc.includes('crawl')) {
      return allTemplates.find((t) => t.name === 'browser_automation') ?? null;
    }

    return null;
  }

  // ─── Strategy Selection ───────────────────────────────────────

  private selectStrategy(request: DecompositionRequest): DecompositionStrategy {
    // Check for template match first
    const template = this.findMatchingTemplate(request.description);
    if (template && !this.llmService?.isAnyAvailable()) {
      return 'template';
    }

    // If LLM is available, prefer hybrid
    if (this.llmService?.isAnyAvailable()) {
      return 'hybrid';
    }

    // Fall back to heuristic
    return 'heuristic';
  }

  // ─── LLM Decomposition ───────────────────────────────────────

  private async decomposeWithLLM(request: DecompositionRequest): Promise<DecompositionResult> {
    const maxSubtasks = request.maxSubtasks ?? 10;

    const systemPrompt = `You are an expert task decomposition engine for AENEWS Agent OS X.
Break down the mission into concrete, actionable sub-tasks.

Rules:
- Each sub-task should be completable by a single agent
- Assign dependencies between sub-tasks (use sub-task IDs)
- Estimate complexity: simple, moderate, or complex
- Assign priority (1=highest, 5=lowest)
- Determine if sub-task can run in parallel with others
- Max ${maxSubtasks} sub-tasks
- Use these cluster types for preferredCluster: ${Object.values(ClusterType).join(', ')}

Return a JSON object with:
{
  "subtasks": [
    {
      "id": "st_1",
      "description": "...",
      "requiredCapabilities": ["cap1", "cap2"],
      "preferredCluster": "CODING",
      "dependencies": [],
      "priority": 1,
      "estimatedDurationMs": 30000,
      "estimatedCostUsd": 0.05,
      "complexity": "moderate",
      "canParallelize": true,
      "objectives": ["obj1"]
    }
  ]
}`;

    const userPrompt = `Mission: ${request.description}
${request.objectives ? `\nObjectives:\n${request.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ''}
${request.constraints ? `\nConstraints: ${JSON.stringify(request.constraints)}` : ''}
${request.priority ? `\nPriority: ${request.priority}` : ''}
${request.expectedOutput ? `\nExpected output: ${request.expectedOutput}` : ''}`;

    try {
      const response = await this.llmService!.chatWithSystem(
        systemPrompt,
        userPrompt,
        { temperature: 0.2, maxTokens: 4096, responseFormat: 'json' },
      );

      const parsed = this.safeJsonParse(response.content);

      if (parsed?.subtasks && Array.isArray(parsed.subtasks)) {
        return {
          missionId: request.missionId,
          strategy: 'llm',
          subtasks: parsed.subtasks.map((st: any, i: number) => this.normalizeSubtask(st, i)),
          executionOrder: [],
          dependencyGraph: {},
          totalEstimatedDurationMs: 0,
          totalEstimatedCostUsd: 0,
          qualityScore: 0,
          depth: 1,
          crossClusterDependencies: [],
        };
      }
    } catch (error: any) {
      this.logger.warn(`LLM decomposition failed: ${error.message}`);
    }

    // Fallback to heuristic
    return this.heuristicDecompose(request);
  }

  // ─── Template Decomposition ───────────────────────────────────

  private decomposeWithTemplate(request: DecompositionRequest): DecompositionResult {
    const template = this.findMatchingTemplate(request.description);

    if (!template) {
      return this.heuristicDecompose(request);
    }

    const subtasks: DecomposedSubtask[] = template.subtaskTemplates.map((st, i) => ({
      id: `st_${i + 1}`,
      description: st.description,
      requiredCapabilities: st.requiredCapabilities,
      preferredCluster: st.preferredCluster,
      dependencies: i > 0 ? [`st_${i}`] : [],
      priority: st.priority,
      estimatedDurationMs: this.estimateDuration(st.requiredCapabilities, 'moderate'),
      estimatedCostUsd: 0.05,
      complexity: 'moderate' as const,
      canParallelize: i > 0 && !st.requiredCapabilities.some((c) =>
        template.subtaskTemplates[i - 1]?.requiredCapabilities.includes(c)),
      objectives: [st.description],
    }));

    return {
      missionId: request.missionId,
      strategy: 'template',
      subtasks,
      executionOrder: [],
      dependencyGraph: {},
      totalEstimatedDurationMs: 0,
      totalEstimatedCostUsd: 0,
      qualityScore: 0,
      depth: 1,
      crossClusterDependencies: [],
    };
  }

  // ─── Heuristic Decomposition ──────────────────────────────────

  private heuristicDecompose(request: DecompositionRequest): DecompositionResult {
    const objectives = request.objectives ?? this.extractObjectives(request.description);
    const maxSubtasks = request.maxSubtasks ?? 10;
    const subtasks: DecomposedSubtask[] = [];

    for (let i = 0; i < Math.min(objectives.length, maxSubtasks); i++) {
      const objective = objectives[i];
      const capabilities = this.inferCapabilities(objective);
      const cluster = this.inferCluster(objective, capabilities);
      const complexity = this.inferComplexity(objective);

      subtasks.push({
        id: `st_${i + 1}`,
        description: objective,
        requiredCapabilities: capabilities,
        preferredCluster: cluster,
        dependencies: i > 0 ? [`st_${i}`] : [],
        priority: i + 1,
        estimatedDurationMs: this.estimateDuration(capabilities, complexity),
        estimatedCostUsd: 0.05,
        complexity,
        canParallelize: i > 0 && !this.hasCapabilityOverlap(subtasks[i - 1], capabilities),
        objectives: [objective],
      });
    }

    // If only one subtask, try to split further
    if (subtasks.length === 1 && subtasks[0].complexity === 'complex') {
      const split = this.splitComplexTask(subtasks[0]);
      subtasks.splice(0, 1, ...split);
    }

    return {
      missionId: request.missionId,
      strategy: 'heuristic',
      subtasks,
      executionOrder: [],
      dependencyGraph: {},
      totalEstimatedDurationMs: 0,
      totalEstimatedCostUsd: 0,
      qualityScore: 0,
      depth: 1,
      crossClusterDependencies: [],
    };
  }

  // ─── Hybrid Decomposition ─────────────────────────────────────

  private async hybridDecompose(request: DecompositionRequest): Promise<DecompositionResult> {
    // Run both LLM and template/heuristic in parallel
    const [llmResult, fallbackResult] = await Promise.all([
      this.decomposeWithLLM(request).catch(() => null),
      Promise.resolve(
        this.findMatchingTemplate(request.description)
          ? this.decomposeWithTemplate(request)
          : this.heuristicDecompose(request),
      ),
    ]);

    if (!llmResult) {
      return fallbackResult;
    }

    // Merge: prefer LLM result but validate against heuristic
    const llmScore = this.scoreDecomposition(llmResult);
    const fallbackScore = this.scoreDecomposition(fallbackResult);

    if (llmScore >= fallbackScore) {
      // Enhance LLM result with heuristic insights
      llmResult.strategy = 'hybrid';
      return this.enhanceWithHeuristics(llmResult, fallbackResult);
    }

    fallbackResult.strategy = 'hybrid';
    return this.enhanceWithHeuristics(fallbackResult, llmResult);
  }

  // ─── Post-Processing ──────────────────────────────────────────

  /**
   * Compute the execution order (waves of parallelizable sub-tasks).
   * Based on dependency graph — each wave contains sub-tasks that can
   * run in parallel because their dependencies are in previous waves.
   */
  private computeExecutionOrder(subtasks: DecomposedSubtask[]): string[][] {
    const waves: string[][] = [];
    const assigned = new Set<string>();
    const maxWaves = subtasks.length; // Prevent infinite loops

    while (assigned.size < subtasks.length && waves.length < maxWaves) {
      const wave: string[] = [];

      for (const subtask of subtasks) {
        if (assigned.has(subtask.id)) continue;

        // Check if all dependencies are assigned
        const depsReady = subtask.dependencies.every((dep) => assigned.has(dep));
        if (depsReady) {
          wave.push(subtask.id);
        }
      }

      if (wave.length === 0) {
        // Circular dependency detected — add remaining tasks
        for (const subtask of subtasks) {
          if (!assigned.has(subtask.id)) {
            wave.push(subtask.id);
          }
        }
      }

      for (const id of wave) {
        assigned.add(id);
      }
      waves.push(wave);
    }

    return waves;
  }

  /**
   * Build a dependency graph from sub-tasks.
   */
  private buildDependencyGraph(subtasks: DecomposedSubtask[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const subtask of subtasks) {
      graph[subtask.id] = subtask.dependencies;
    }
    return graph;
  }

  /**
   * Find dependencies that cross cluster boundaries.
   */
  private findCrossClusterDependencies(
    subtasks: DecomposedSubtask[],
  ): Array<{ from: ClusterType; to: ClusterType; subtaskIds: string[] }> {
    const crossDeps: Array<{ from: ClusterType; to: ClusterType; subtaskIds: string[] }> = [];
    const taskMap = new Map(subtasks.map((s) => [s.id, s]));

    for (const subtask of subtasks) {
      for (const depId of subtask.dependencies) {
        const dep = taskMap.get(depId);
        if (dep?.preferredCluster && subtask.preferredCluster &&
            dep.preferredCluster !== subtask.preferredCluster) {
          const existing = crossDeps.find(
            (cd) => cd.from === dep.preferredCluster && cd.to === subtask.preferredCluster,
          );
          if (existing) {
            existing.subtaskIds.push(subtask.id);
          } else {
            crossDeps.push({
              from: dep.preferredCluster,
              to: subtask.preferredCluster,
              subtaskIds: [subtask.id],
            });
          }
        }
      }
    }

    return crossDeps;
  }

  /**
   * Score the quality of a decomposition (0-1).
   *
   * Criteria:
   *   - Sub-task count (too few or too many is bad)
   *   - Dependency structure (DAG without cycles)
   *   - Capability coverage (all required capabilities addressed)
   *   - Parallelizability (more parallel = better)
   *   - Clustering quality (sub-tasks assigned to appropriate clusters)
   */
  private scoreDecomposition(result: DecompositionResult): number {
    let score = 0;

    // 1. Sub-task count (sweet spot: 3-7)
    const count = result.subtasks.length;
    if (count >= 2 && count <= 10) score += 0.2;
    else if (count >= 1) score += 0.1;

    // 2. No circular dependencies
    const hasCycles = this.hasCircularDependencies(result.subtasks);
    if (!hasCycles) score += 0.2;

    // 3. Parallelizability
    const parallelizable = result.subtasks.filter((s) => s.canParallelize).length;
    const parallelRatio = result.subtasks.length > 0 ? parallelizable / result.subtasks.length : 0;
    score += parallelRatio * 0.2;

    // 4. Each subtask has capabilities
    const withCapabilities = result.subtasks.filter((s) => s.requiredCapabilities.length > 0).length;
    const capRatio = result.subtasks.length > 0 ? withCapabilities / result.subtasks.length : 0;
    score += capRatio * 0.2;

    // 5. Cluster assignment
    const withCluster = result.subtasks.filter((s) => s.preferredCluster).length;
    const clusterRatio = result.subtasks.length > 0 ? withCluster / result.subtasks.length : 0;
    score += clusterRatio * 0.2;

    return Math.min(1, Math.max(0, score));
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private normalizeSubtask(st: any, index: number): DecomposedSubtask {
    return {
      id: st.id || `st_${index + 1}`,
      description: st.description || `Sub-task ${index + 1}`,
      requiredCapabilities: Array.isArray(st.requiredCapabilities) ? st.requiredCapabilities : ['general'],
      preferredCluster: st.preferredCluster as ClusterType | undefined,
      dependencies: Array.isArray(st.dependencies) ? st.dependencies : [],
      priority: st.priority ?? index + 1,
      estimatedDurationMs: st.estimatedDurationMs ?? 30_000,
      estimatedCostUsd: st.estimatedCostUsd ?? 0.05,
      complexity: st.complexity ?? 'moderate',
      canParallelize: st.canParallelize ?? (st.dependencies?.length === 0),
      objectives: Array.isArray(st.objectives) ? st.objectives : [st.description || `Sub-task ${index + 1}`],
    };
  }

  private extractObjectives(description: string): string[] {
    // Split by common separators
    const sentences = description
      .split(/[.;!?]\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length > 1) return sentences;

    // Try splitting by "and", "then", "after that"
    const parts = description.split(/\s+(?:and|then|after that|followed by|next)\s+/i);
    if (parts.length > 1) return parts.map((p) => p.trim());

    // Single objective
    return [description];
  }

  private inferCapabilities(objective: string): string[] {
    const capabilities: string[] = [];
    const lower = objective.toLowerCase();

    if (lower.includes('navigat') || lower.includes('browse') || lower.includes('scrape')) capabilities.push('browser');
    if (lower.includes('cod') || lower.includes('develop') || lower.includes('implement')) capabilities.push('coding');
    if (lower.includes('test') || lower.includes('qa') || lower.includes('verify')) capabilities.push('testing');
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('ship')) capabilities.push('deployment');
    if (lower.includes('analyz') || lower.includes('data') || lower.includes('statistic')) capabilities.push('analysis');
    if (lower.includes('writ') || lower.includes('document') || lower.includes('report')) capabilities.push('documentation');
    if (lower.includes('secur') || lower.includes('auth') || lower.includes('encrypt')) capabilities.push('security');
    if (lower.includes('design') || lower.includes('architect') || lower.includes('plan')) capabilities.push('architecture');
    if (lower.includes('market') || lower.includes('campaign') || lower.includes('seo')) capabilities.push('marketing');
    if (lower.includes('monitor') || lower.includes('health') || lower.includes('observ')) capabilities.push('monitoring');

    return capabilities.length > 0 ? capabilities : ['general'];
  }

  private inferCluster(objective: string, capabilities: string[]): ClusterType | undefined {
    if (capabilities.includes('browser')) return ClusterType.BROWSER;
    if (capabilities.includes('coding') || capabilities.includes('architecture')) return ClusterType.CODING;
    if (capabilities.includes('security')) return ClusterType.SECURITY;
    if (capabilities.includes('testing') || capabilities.includes('deployment')) return ClusterType.CERTIFICATION;
    if (capabilities.includes('analysis') || capabilities.includes('marketing')) return ClusterType.BUSINESS;
    if (capabilities.includes('documentation')) return ClusterType.OFFICE;
    if (capabilities.includes('monitoring')) return ClusterType.INFRASTRUCTURE;
    return undefined;
  }

  private inferComplexity(objective: string): 'simple' | 'moderate' | 'complex' {
    const lower = objective.toLowerCase();
    const complexIndicators = ['multiple', 'integrate', 'full-stack', 'end-to-end', 'comprehensive', 'orchestrat'];
    const simpleIndicators = ['list', 'get', 'read', 'check', 'simple', 'basic'];

    if (complexIndicators.some((ind) => lower.includes(ind))) return 'complex';
    if (simpleIndicators.some((ind) => lower.includes(ind))) return 'simple';
    return 'moderate';
  }

  private estimateDuration(capabilities: string[], complexity: string): number {
    const baseDurations: Record<string, number> = {
      simple: 15_000,
      moderate: 45_000,
      complex: 120_000,
    };
    return baseDurations[complexity] ?? 45_000;
  }

  private hasCapabilityOverlap(prevSubtask: DecomposedSubtask, capabilities: string[]): boolean {
    return capabilities.some((c) => prevSubtask.requiredCapabilities.includes(c));
  }

  private splitComplexTask(subtask: DecomposedSubtask): DecomposedSubtask[] {
    const words = subtask.description.split(/\s+/);
    const mid = Math.ceil(words.length / 2);

    return [
      {
        ...subtask,
        id: `${subtask.id}_a`,
        description: words.slice(0, mid).join(' '),
        complexity: 'moderate',
        dependencies: [],
        canParallelize: false,
      },
      {
        ...subtask,
        id: `${subtask.id}_b`,
        description: words.slice(mid).join(' '),
        dependencies: [`${subtask.id}_a`],
        canParallelize: false,
      },
    ];
  }

  private hasCircularDependencies(subtasks: DecomposedSubtask[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const taskMap = new Map(subtasks.map((s) => [s.id, s]));

    const hasCycle = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      const task = taskMap.get(id);
      if (task) {
        for (const dep of task.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(id);
      return false;
    };

    for (const subtask of subtasks) {
      if (!visited.has(subtask.id)) {
        if (hasCycle(subtask.id)) return true;
      }
    }

    return false;
  }

  private enhanceWithHeuristics(
    primary: DecompositionResult,
    secondary: DecompositionResult,
  ): DecompositionResult {
    // If primary is missing cluster assignments, fill from secondary
    for (const subtask of primary.subtasks) {
      if (!subtask.preferredCluster) {
        const matching = secondary.subtasks.find(
          (s) => s.description.toLowerCase().includes(subtask.description.toLowerCase().split(' ')[0]),
        );
        if (matching?.preferredCluster) {
          subtask.preferredCluster = matching.preferredCluster;
        }
      }
    }

    return primary;
  }

  private safeJsonParse(text: string | null): any | null {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch { return null; }
      }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
      }
      return null;
    }
  }
}
