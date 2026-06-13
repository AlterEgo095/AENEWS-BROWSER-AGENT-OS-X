/**
 * AENEWS Agent OS X - Mission Planner Service
 *
 * Decomposes natural language instructions into executable mission plans
 * with phases, tasks, dependency graphs, and duration estimates.
 *
 * Heuristic mapping:
 *   - "crée/build/développe/construis" → Development phase
 *   - "analyse/audit/scrape/recherche/search" → Browser phase
 *   - "marketing/SEO/rapport/strategy" → Business phase
 *   - Always insert Certification phase before Delivery
 *   - Always append Delivery phase at the end
 *   - If research keywords precede dev keywords → Browser before Development
 *   - Complexity scored on keyword density, multi-domain spans, and nesting cues
 */

import { Injectable, Logger } from '@nestjs/common';
import { TeamType } from './mission-orchestrator.service';

// ─── Local Types ─────────────────────────────────────────────────────────

export enum PhaseType {
  PLANNING = 'PLANNING',
  BROWSER = 'BROWSER',
  DEVELOPMENT = 'DEVELOPMENT',
  BUSINESS = 'BUSINESS',
  CERTIFICATION = 'CERTIFICATION',
  DELIVERY = 'DELIVERY',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  phase: PhaseType;
  team: TeamType;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  estimatedDurationMs: number;
  metadata: Record<string, unknown>;
}

export interface PlannedPhase {
  type: PhaseType;
  team: TeamType;
  tasks: PlannedTask[];
  status: TaskStatus;
  estimatedDurationMs: number;
  dependsOn: PhaseType[];
}

export interface MissionPlan {
  id: string;
  instruction: string;
  phases: PlannedPhase[];
  tasks: PlannedTask[];
  dependencies: Record<string, string[]>;
  totalEstimatedDurationMs: number;
  complexity: ComplexityAssessment;
  requiredTeams: TeamType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplexityAssessment {
  score: number; // 0–100
  level: 'TRIVIAL' | 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EPIC';
  reasoning: string;
}

// ─── Keyword Sets ────────────────────────────────────────────────────────

const BROWSER_KEYWORDS = [
  'analyse',
  'audit',
  'scrape',
  'recherche',
  'search',
  'browse',
  'navigate',
  'extract',
  'crawl',
  'visit',
  'fetch',
  'monitor',
  'surveiller',
  'inspecter',
  'parcourir',
  'extraire',
  'lire',
  'read',
  'check',
  'verify',
  'vérifier',
  'comparer',
  'compare',
  'tester site',
  'test website',
  'review',
  'évaluer',
];

const DEVELOPMENT_KEYWORDS = [
  'crée',
  'créer',
  'build',
  'développe',
  'développer',
  'construis',
  'construire',
  'implement',
  'code',
  'program',
  'develop',
  'write',
  'écrire',
  'installer',
  'install',
  'deploy',
  'déployer',
  'setup',
  'configure',
  'configurer',
  'refactor',
  'fix',
  'corriger',
  'patch',
  'api',
  'backend',
  'frontend',
  'database',
  'base de données',
  'application',
  'app',
  'service',
  'module',
  'component',
  'feature',
  'fonctionnalité',
  'integration',
  'intégration',
  'test',
  'tester',
];

const BUSINESS_KEYWORDS = [
  'marketing',
  'seo',
  'rapport',
  'report',
  'strategy',
  'stratégie',
  'business',
  'roi',
  'kpi',
  'analytics',
  'campagne',
  'campaign',
  'brand',
  'marque',
  'social media',
  'email',
  'content',
  'contenu',
  'conversion',
  'landing page',
  'funnel',
  'growth',
  'croissance',
  'revenue',
  'pricing',
  'competitive',
  'concurrence',
  'market',
  'marché',
  'customer',
  'client',
  'user research',
  'étude',
];

const RESEARCH_BEFORE_DEV_KEYWORDS = [
  'best practice',
  'meilleure pratique',
  'trend',
  'tendance',
  'benchmark',
  'compare',
  'comparer',
  'before building',
  'avant de construire',
  'look at',
  'regarder',
  'study',
  'étudier',
  'research first',
  "recherche d'abord",
];

const COMPLEXITY_MULTIPLIERS = [
  'microservices',
  'distributed',
  'distributed',
  'real-time',
  'temps réel',
  'scale',
  'scalabilité',
  'multi-tenant',
  'sécurité',
  'security',
  'compliance',
  'conformité',
  'migration',
  'integration multiple',
  'ai',
  'ml',
  'machine learning',
  'deep learning',
  'nlp',
  'infrastructure',
  'devops',
  'ci/cd',
  'pipeline',
];

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class MissionPlannerService {
  private readonly logger = new Logger(MissionPlannerService.name);
  private readonly plans: Map<string, MissionPlan> = new Map();
  private idCounter = 0;

  // ─── 1. createPlan ─────────────────────────────────────────────────

  /**
   * Analyze a natural language instruction and produce a full mission plan
   * with phases, tasks, dependencies, and duration estimates.
   */
  createPlan(instruction: string, context?: Record<string, unknown>): MissionPlan {
    const id = this.generateId('plan');
    const instructionLower = instruction.toLowerCase();

    // Step 1: Identify required phases based on keywords
    const needsBrowser = this.containsKeywords(instructionLower, BROWSER_KEYWORDS);
    const needsDevelopment = this.containsKeywords(instructionLower, DEVELOPMENT_KEYWORDS);
    const needsBusiness = this.containsKeywords(instructionLower, BUSINESS_KEYWORDS);
    const needsResearchBeforeDev = this.containsKeywords(
      instructionLower,
      RESEARCH_BEFORE_DEV_KEYWORDS,
    );

    // Step 2: Assess complexity
    const complexity = this.estimateComplexity(instruction);

    // Step 3: Identify required teams
    const requiredTeams = this.identifyRequiredTeams(instruction);

    // Step 4: Build phases
    const phases: PlannedPhase[] = [];

    // PLANNING phase (always first)
    phases.push({
      type: PhaseType.PLANNING,
      team: TeamType.MEMORY,
      tasks: [],
      status: TaskStatus.PENDING,
      estimatedDurationMs: 5_000,
      dependsOn: [],
    });

    // BROWSER phase — if research keywords detected OR research-before-dev cues
    if (needsBrowser || (needsResearchBeforeDev && needsDevelopment)) {
      phases.push({
        type: PhaseType.BROWSER,
        team: TeamType.BROWSER,
        tasks: [],
        status: TaskStatus.PENDING,
        estimatedDurationMs: 30_000,
        dependsOn: [PhaseType.PLANNING],
      });
    }

    // DEVELOPMENT phase — if build/dev keywords detected
    if (needsDevelopment) {
      const devDepends: PhaseType[] = [PhaseType.PLANNING];
      if (phases.some((p) => p.type === PhaseType.BROWSER)) {
        devDepends.push(PhaseType.BROWSER);
      }
      phases.push({
        type: PhaseType.DEVELOPMENT,
        team: TeamType.DEVELOPMENT,
        tasks: [],
        status: TaskStatus.PENDING,
        estimatedDurationMs: 120_000 * (complexity.score / 30 + 0.5),
        dependsOn: devDepends,
      });
    }

    // BUSINESS phase — if marketing/business keywords detected
    if (needsBusiness) {
      phases.push({
        type: PhaseType.BUSINESS,
        team: TeamType.BUSINESS,
        tasks: [],
        status: TaskStatus.PENDING,
        estimatedDurationMs: 60_000,
        dependsOn: [PhaseType.PLANNING],
      });
    }

    // CERTIFICATION phase (always before delivery)
    phases.push({
      type: PhaseType.CERTIFICATION,
      team: TeamType.CERTIFICATION,
      tasks: [],
      status: TaskStatus.PENDING,
      estimatedDurationMs: 20_000,
      dependsOn: phases.filter((p) => p.type !== PhaseType.PLANNING).map((p) => p.type),
    });

    // DELIVERY phase (always last)
    phases.push({
      type: PhaseType.DELIVERY,
      team: TeamType.DELIVERY,
      tasks: [],
      status: TaskStatus.PENDING,
      estimatedDurationMs: 10_000,
      dependsOn: [PhaseType.CERTIFICATION],
    });

    // Step 5: Decompose into tasks per phase
    const allTasks: PlannedTask[] = [];
    for (const phase of phases) {
      const tasks = this.decomposeIntoTasks(instruction, phase.team);
      phase.tasks = tasks;
      allTasks.push(...tasks);
    }

    // Step 6: Build dependency graph
    const dependencies = this.buildDependencyGraph(phases, allTasks);

    // Step 7: Compute total estimated duration
    const totalEstimatedDurationMs = phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);

    const plan: MissionPlan = {
      id,
      instruction,
      phases,
      tasks: allTasks,
      dependencies,
      totalEstimatedDurationMs,
      complexity,
      requiredTeams,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.plans.set(id, plan);
    this.logger.log(
      `Created plan "${id}": ${phases.length} phases, ${allTasks.length} tasks, ` +
        `complexity=${complexity.level}(${complexity.score}), duration≈${totalEstimatedDurationMs}ms`,
    );

    return plan;
  }

  // ─── 2. estimateComplexity ─────────────────────────────────────────

  /**
   * Score the instruction complexity from 0–100 and classify it.
   *
   * Factors:
   *   - Number of distinct domain keywords hit
   *   - Presence of complexity multiplier terms
   *   - Instruction length (longer = more complex)
   *   - Multi-domain span (hitting 3 keyword sets = harder than 1)
   */
  estimateComplexity(instruction: string): ComplexityAssessment {
    const lower = instruction.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // Domain span — how many keyword domains are hit
    const domainHits = [
      this.containsKeywords(lower, BROWSER_KEYWORDS),
      this.containsKeywords(lower, DEVELOPMENT_KEYWORDS),
      this.containsKeywords(lower, BUSINESS_KEYWORDS),
    ].filter(Boolean).length;

    if (domainHits >= 3) {
      score += 30;
      reasons.push('multi-domain instruction (browser+dev+business)');
    } else if (domainHits === 2) {
      score += 15;
      reasons.push('cross-domain instruction');
    } else if (domainHits === 1) {
      score += 5;
      reasons.push('single-domain instruction');
    }

    // Complexity multiplier keywords
    let multiplierHits = 0;
    for (const kw of COMPLEXITY_MULTIPLIERS) {
      if (lower.includes(kw.toLowerCase())) {
        multiplierHits++;
      }
    }
    score += multiplierHits * 10;
    if (multiplierHits > 0) {
      reasons.push(`${multiplierHits} complexity multiplier(s) detected`);
    }

    // Length heuristic: longer instructions tend to be more complex
    const wordCount = instruction.split(/\s+/).length;
    if (wordCount > 50) {
      score += 15;
      reasons.push('long instruction (50+ words)');
    } else if (wordCount > 25) {
      score += 8;
      reasons.push('medium-length instruction');
    }

    // Multi-step cues
    const stepCues = [
      ' puis ',
      ' then ',
      ' ensuite ',
      ' after ',
      ' après ',
      ' and ',
      ' et ',
      ';',
      ',',
    ];
    const stepCount = stepCues.filter((c) => lower.includes(c)).length;
    score += Math.min(stepCount * 3, 15);
    if (stepCount > 0) {
      reasons.push(`${stepCount} step-separator(s) found`);
    }

    // Clamp 0–100
    score = Math.max(0, Math.min(100, score));

    let level: ComplexityAssessment['level'];
    if (score <= 10) level = 'TRIVIAL';
    else if (score <= 25) level = 'SIMPLE';
    else if (score <= 50) level = 'MODERATE';
    else if (score <= 75) level = 'COMPLEX';
    else level = 'EPIC';

    return {
      score,
      level,
      reasoning: reasons.join('; '),
    };
  }

  // ─── 3. identifyRequiredTeams ──────────────────────────────────────

  /**
   * Determine which teams are needed based on keyword analysis.
   * Always includes CERTIFICATION and DELIVERY.
   */
  identifyRequiredTeams(instruction: string): TeamType[] {
    const lower = instruction.toLowerCase();
    const teams: Set<TeamType> = new Set();

    // Memory team always needed for context management
    teams.add(TeamType.MEMORY);

    if (this.containsKeywords(lower, BROWSER_KEYWORDS)) {
      teams.add(TeamType.BROWSER);
    }

    if (this.containsKeywords(lower, DEVELOPMENT_KEYWORDS)) {
      teams.add(TeamType.DEVELOPMENT);
    }

    if (this.containsKeywords(lower, BUSINESS_KEYWORDS)) {
      teams.add(TeamType.BUSINESS);
    }

    // Certification and Delivery are always required
    teams.add(TeamType.CERTIFICATION);
    teams.add(TeamType.DELIVERY);

    // If no specific team matched, add browser as default research team
    if (teams.size <= 3) {
      teams.add(TeamType.BROWSER);
    }

    return [...teams];
  }

  // ─── 4. decomposeIntoTasks ─────────────────────────────────────────

  /**
   * Break down the instruction into concrete tasks for a specific team.
   * Uses keyword matching and heuristics to generate actionable tasks.
   */
  decomposeIntoTasks(instruction: string, team: TeamType): PlannedTask[] {
    const lower = instruction.toLowerCase();
    const tasks: PlannedTask[] = [];

    switch (team) {
      case TeamType.BROWSER:
        tasks.push(
          this.createTask(
            'research',
            "Recherche et collecte d'informations",
            PhaseType.BROWSER,
            team,
            TaskPriority.HIGH,
          ),
        );
        if (lower.includes('scrape') || lower.includes('extract') || lower.includes('extraire')) {
          tasks.push(
            this.createTask(
              'scrape',
              'Extraction de données web',
              PhaseType.BROWSER,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (lower.includes('monitor') || lower.includes('surveiller')) {
          tasks.push(
            this.createTask(
              'monitor',
              'Mise en place du monitoring',
              PhaseType.BROWSER,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        if (lower.includes('compare') || lower.includes('comparer')) {
          tasks.push(
            this.createTask(
              'compare',
              'Analyse comparative',
              PhaseType.BROWSER,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        break;

      case TeamType.DEVELOPMENT:
        tasks.push(
          this.createTask(
            'setup',
            "Configuration de l'environnement",
            PhaseType.DEVELOPMENT,
            team,
            TaskPriority.HIGH,
          ),
        );
        if (lower.includes('api') || lower.includes('backend')) {
          tasks.push(
            this.createTask(
              'api',
              'Développement API / Backend',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (lower.includes('frontend') || lower.includes('ui') || lower.includes('interface')) {
          tasks.push(
            this.createTask(
              'frontend',
              'Développement Frontend / UI',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (lower.includes('database') || lower.includes('base de données')) {
          tasks.push(
            this.createTask(
              'database',
              'Conception et mise en place base de données',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (lower.includes('test') || lower.includes('tester')) {
          tasks.push(
            this.createTask(
              'testing',
              'Écriture et exécution des tests',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        if (lower.includes('deploy') || lower.includes('déployer')) {
          tasks.push(
            this.createTask(
              'deploy',
              'Déploiement et configuration CI/CD',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        // Default: at least one implementation task
        if (tasks.length === 1) {
          tasks.push(
            this.createTask(
              'implement',
              'Implémentation de la solution',
              PhaseType.DEVELOPMENT,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        break;

      case TeamType.BUSINESS:
        if (lower.includes('seo') || lower.includes('référencement')) {
          tasks.push(
            this.createTask(
              'seo',
              'Audit et optimisation SEO',
              PhaseType.BUSINESS,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (
          lower.includes('marketing') ||
          lower.includes('campagne') ||
          lower.includes('campaign')
        ) {
          tasks.push(
            this.createTask(
              'marketing',
              'Élaboration de la stratégie marketing',
              PhaseType.BUSINESS,
              team,
              TaskPriority.HIGH,
            ),
          );
        }
        if (lower.includes('rapport') || lower.includes('report')) {
          tasks.push(
            this.createTask(
              'report',
              'Rédaction du rapport / livrable',
              PhaseType.BUSINESS,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        if (lower.includes('analytics') || lower.includes('analytics')) {
          tasks.push(
            this.createTask(
              'analytics',
              'Configuration et analyse des métriques',
              PhaseType.BUSINESS,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        if (tasks.length === 0) {
          tasks.push(
            this.createTask(
              'strategy',
              'Analyse stratégique et recommandations',
              PhaseType.BUSINESS,
              team,
              TaskPriority.MEDIUM,
            ),
          );
        }
        break;

      case TeamType.MEMORY:
        tasks.push(
          this.createTask(
            'context',
            'Chargement du contexte et historique',
            PhaseType.PLANNING,
            team,
            TaskPriority.HIGH,
          ),
        );
        tasks.push(
          this.createTask(
            'store',
            'Stockage des résultats intermédiaires',
            PhaseType.PLANNING,
            team,
            TaskPriority.MEDIUM,
          ),
        );
        break;

      case TeamType.CERTIFICATION:
        tasks.push(
          this.createTask(
            'validate',
            'Validation et tests de conformité',
            PhaseType.CERTIFICATION,
            team,
            TaskPriority.HIGH,
          ),
        );
        tasks.push(
          this.createTask(
            'quality',
            'Contrôle qualité et revue finale',
            PhaseType.CERTIFICATION,
            team,
            TaskPriority.HIGH,
          ),
        );
        break;

      case TeamType.DELIVERY:
        tasks.push(
          this.createTask(
            'package',
            'Packaging et préparation de la livraison',
            PhaseType.DELIVERY,
            team,
            TaskPriority.HIGH,
          ),
        );
        tasks.push(
          this.createTask(
            'deliver',
            'Livraison finale et documentation',
            PhaseType.DELIVERY,
            team,
            TaskPriority.HIGH,
          ),
        );
        break;
    }

    // Wire up intra-phase dependencies (sequential within a phase)
    for (let i = 1; i < tasks.length; i++) {
      tasks[i].dependencies.push(tasks[i - 1].id);
    }

    return tasks;
  }

  // ─── 5. buildDependencyGraph ───────────────────────────────────────

  /**
   * Build a dependency map: taskId → array of task IDs it depends on.
   * Incorporates both intra-phase (sequential) and inter-phase dependencies.
   */
  buildDependencyGraph(phases: PlannedPhase[], tasks: PlannedTask[]): Record<string, string[]> {
    const deps: Record<string, string[]> = {};

    // Start with intra-phase dependencies already set on tasks
    for (const task of tasks) {
      deps[task.id] = [...task.dependencies];
    }

    // Add inter-phase dependencies
    const phaseTaskMap = new Map<PhaseType, PlannedTask[]>();
    for (const task of tasks) {
      if (!phaseTaskMap.has(task.phase)) {
        phaseTaskMap.set(task.phase, []);
      }
      phaseTaskMap.get(task.phase)!.push(task);
    }

    for (const phase of phases) {
      const phaseTasks = phaseTaskMap.get(phase.type) ?? [];
      if (phaseTasks.length === 0) continue;

      const firstTask = phaseTasks[0];

      for (const depPhase of phase.dependsOn) {
        const depPhaseTasks = phaseTaskMap.get(depPhase) ?? [];
        if (depPhaseTasks.length === 0) continue;

        // First task of this phase depends on last task of prerequisite phase
        const lastDepTask = depPhaseTasks[depPhaseTasks.length - 1];
        if (!firstTask.dependencies.includes(lastDepTask.id)) {
          firstTask.dependencies.push(lastDepTask.id);
          deps[firstTask.id].push(lastDepTask.id);
        }
      }
    }

    return deps;
  }

  // ─── 6. getPlan ────────────────────────────────────────────────────

  /**
   * Retrieve a previously created plan by its ID.
   */
  getPlan(missionId: string): MissionPlan | null {
    return this.plans.get(missionId) ?? null;
  }

  // ─── 7. getAllPlans ────────────────────────────────────────────────

  getAllPlans(): MissionPlan[] {
    return [...this.plans.values()];
  }

  // ─── 8. updatePlan ─────────────────────────────────────────────────

  updatePlan(planId: string, updates: Partial<MissionPlan>): MissionPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    Object.assign(plan, updates, { updatedAt: new Date() });
    this.logger.log(`Updated plan "${planId}"`);
    return plan;
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw.toLowerCase()));
  }

  private createTask(
    slug: string,
    description: string,
    phase: PhaseType,
    team: TeamType,
    priority: TaskPriority,
  ): PlannedTask {
    const id = this.generateId(`task_${slug}`);
    const durationBase: Record<string, number> = {
      research: 15_000,
      scrape: 20_000,
      monitor: 10_000,
      compare: 15_000,
      setup: 10_000,
      api: 40_000,
      frontend: 30_000,
      database: 20_000,
      testing: 25_000,
      deploy: 15_000,
      implement: 30_000,
      seo: 20_000,
      marketing: 25_000,
      report: 15_000,
      analytics: 15_000,
      strategy: 20_000,
      context: 5_000,
      store: 5_000,
      validate: 10_000,
      quality: 10_000,
      package: 5_000,
      deliver: 5_000,
    };

    return {
      id,
      title: description,
      description,
      phase,
      team,
      priority,
      status: TaskStatus.PENDING,
      dependencies: [],
      estimatedDurationMs: durationBase[slug] ?? 15_000,
      metadata: {},
    };
  }

  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }
}
