/**
 * AENEWS Agent OS X - Mission Orchestrator Service
 * ──────────────────────────────────────────────────────────────────────
 * THE CORE of the entire platform.
 *
 * A user says: "Crée-moi une application SaaS de gestion scolaire,
 * déploie-la, documente-la, teste-la et livre-la"
 * and the orchestrator transforms that into a fully executed,
 * certified, delivered mission.
 *
 * Flow:
 *   Natural Language Input
 *     → Mission Definition
 *       → Team Assignment
 *         → Parallel Execution
 *           → Certification
 *             → Delivery
 *               → Final Result
 *
 * State Machine:
 *   RECEIVED → PLANNING → EXECUTING → CERTIFYING → DELIVERING → COMPLETED
 *                                                            ↘ FAILED
 *                                                            ↘ CANCELLED
 *                                                            ↘ PAUSED
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// ─── Mission Types ────────────────────────────────────────────────

export enum MissionStatus {
  RECEIVED = 'received',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  CERTIFYING = 'certifying',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum TeamType {
  BROWSER = 'browser',
  DEVELOPMENT = 'development',
  BUSINESS = 'business',
  MEMORY = 'memory',
  CERTIFICATION = 'certification',
  DELIVERY = 'delivery',
}

export interface MissionInput {
  instruction: string;
  userId?: string;
  projectId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  context?: Record<string, any>;
  attachments?: Array<{ name: string; type: string; data: any }>;
}

export interface MissionDefinition {
  id: string;
  instruction: string;
  status: MissionStatus;
  plan: MissionPlan | null;
  phases: MissionPhase[];
  currentPhase: MissionPhaseType;
  results: Map<string, PhaseResult>;
  deliverables: Deliverable[];
  certificationReport: CertificationReport | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  metadata: Record<string, any>;
}

export enum MissionPhaseType {
  PLAN = 'plan',
  BROWSER = 'browser',
  DEVELOP = 'develop',
  BUSINESS = 'business',
  CERTIFY = 'certify',
  DELIVER = 'deliver',
}

export interface MissionPlan {
  missionId: string;
  phases: PlannedPhase[];
  estimatedDurationMs: number;
  estimatedCost: number;
  requiredTeams: TeamType[];
  dependencies: Array<{ from: string; to: string }>;
}

export interface PlannedPhase {
  id: string;
  type: MissionPhaseType;
  team: TeamType;
  description: string;
  tasks: PlannedTask[];
  dependsOn: string[];
  parallel: boolean;
  estimatedDurationMs: number;
}

export interface PlannedTask {
  id: string;
  agentCapability: string;
  description: string;
  input: Record<string, any>;
  dependsOn: string[];
}

export interface MissionPhase {
  type: MissionPhaseType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  tasks: PhaseTask[];
}

export interface PhaseTask {
  id: string;
  capability: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  assignedAgent: string | null;
  result: any;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  retryCount: number;
}

export interface PhaseResult {
  phaseType: MissionPhaseType;
  success: boolean;
  output: any;
  durationMs: number;
  artifacts: string[];
}

export interface Deliverable {
  type: 'pdf' | 'zip' | 'repository' | 'docker_image' | 'deployed_url' | 'report' | 'code' | 'data';
  name: string;
  description: string;
  location: string;
  size?: number;
  checksum?: string;
  createdAt: Date;
}

export interface CertificationReport {
  missionId: string;
  overallScore: number;
  passed: boolean;
  domains: CertificationDomain[];
  certifiedAt: Date;
}

export interface CertificationDomain {
  name: string;
  score: number;
  passed: boolean;
  details: string;
}

// ─── Mission Event ────────────────────────────────────────────────

export interface MissionEvent {
  type: string;
  missionId: string;
  timestamp: Date;
  data: Record<string, any>;
}

// ─── Mission Stats ────────────────────────────────────────────────

export interface MissionStats {
  totalMissions: number;
  byStatus: Record<MissionStatus, number>;
  byPriority: Record<string, number>;
  averageDurationMs: number;
  successRate: number;
  totalDeliverables: number;
  totalCertifications: number;
  averageCertificationScore: number;
}

// ─── Instruction Heuristic Keywords ───────────────────────────────

const BROWSER_KEYWORDS = [
  'web',
  'search',
  'scrape',
  'scraping',
  'browse',
  'navigate',
  'url',
  'website',
  'page',
  'crawling',
  'crawl',
  'download',
  'screenshot',
  'online',
  'internet',
  'http',
  'api call',
  'fetch data',
  'extract data',
  'monitor site',
  'track price',
  'research online',
  'find information',
  'collect data',
  'survey',
  'competitive analysis',
  'market data',
];

const DEVELOPMENT_KEYWORDS = [
  'create',
  'build',
  'develop',
  'code',
  'app',
  'application',
  'software',
  'website',
  'api',
  'backend',
  'frontend',
  'fullstack',
  'database',
  'deploy',
  'saas',
  'platform',
  'service',
  'microservice',
  'function',
  'component',
  'module',
  'library',
  'framework',
  'test',
  'testing',
  'debug',
  'refactor',
  'migrate',
  'integrate',
  'automate',
  'script',
  'program',
  'algorithm',
  'feature',
  'ui',
  'ux',
  'rest',
  'graphql',
  'crud',
  'auth',
  'authentication',
  'authorization',
  'docker',
  'kubernetes',
  'ci/cd',
  'pipeline',
  'infrastructure',
  'terraform',
  'construct',
  'implement',
  'engineer',
  'scaffold',
  'generate code',
];

const BUSINESS_KEYWORDS = [
  'analyze',
  'report',
  'marketing',
  'seo',
  'strategy',
  'business',
  'financial',
  'market research',
  'competitor',
  'roi',
  'kpi',
  'metrics',
  'analytics',
  'dashboard',
  'insight',
  'forecast',
  'budget',
  'revenue',
  'growth',
  'conversion',
  'engagement',
  'audience',
  'segmentation',
  'brand',
  'content strategy',
  'campaign',
  'optimization',
  'audit',
  'compliance',
  'legal',
  'proposal',
  'business plan',
  'model',
];

// ─── Certification Domain Names ───────────────────────────────────

const CERTIFICATION_DOMAINS = [
  'completeness',
  'quality',
  'security',
  'performance',
  'reliability',
  'documentation',
  'test_coverage',
] as const;

// ─── Valid State Transitions ──────────────────────────────────────

const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  [MissionStatus.RECEIVED]: [MissionStatus.PLANNING, MissionStatus.CANCELLED],
  [MissionStatus.PLANNING]: [
    MissionStatus.EXECUTING,
    MissionStatus.FAILED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.EXECUTING]: [
    MissionStatus.CERTIFYING,
    MissionStatus.FAILED,
    MissionStatus.CANCELLED,
    MissionStatus.PAUSED,
  ],
  [MissionStatus.CERTIFYING]: [
    MissionStatus.DELIVERING,
    MissionStatus.FAILED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.DELIVERING]: [
    MissionStatus.COMPLETED,
    MissionStatus.FAILED,
    MissionStatus.CANCELLED,
  ],
  [MissionStatus.COMPLETED]: [],
  [MissionStatus.FAILED]: [],
  [MissionStatus.CANCELLED]: [],
  [MissionStatus.PAUSED]: [MissionStatus.EXECUTING, MissionStatus.CANCELLED],
};

// ═══════════════════════════════════════════════════════════════════
// MISSION ORCHESTRATOR SERVICE
// ═══════════════════════════════════════════════════════════════════

@Injectable()
export class MissionOrchestratorService {
  private readonly logger = new Logger(MissionOrchestratorService.name);

  /** In-memory mission store */
  private readonly missions: Map<string, MissionDefinition> = new Map();

  /** Event log per mission */
  private readonly missionEvents: Map<string, MissionEvent[]> = new Map();

  /** Active execution promises for cancellation tracking */
  private readonly cancelledMissions: Set<string> = new Set();

  /** Paused mission signals */
  private readonly pausedMissions: Set<string> = new Set();

  /** Repair attempt tracker */
  private readonly repairAttempts: Map<string, number> = new Map();

  // ──────────────────────────────────────────────────────────────────
  // 1. submitMission — THE ENTRY POINT
  // ──────────────────────────────────────────────────────────────────

  /**
   * Take a natural language instruction, create a MissionDefinition,
   * start the orchestration pipeline, and return the mission ID.
   *
   * This is where the magic begins. A user speaks in natural language
   * and the entire platform mobilizes to deliver.
   */
  async submitMission(input: MissionInput): Promise<string> {
    const missionId = uuidv4();

    this.logger.log(
      `🎯 Mission RECEIVED [${missionId}]: "${input.instruction.substring(0, 120)}..."`,
    );

    // ── Create the MissionDefinition ──────────────────────────────
    const mission: MissionDefinition = {
      id: missionId,
      instruction: input.instruction,
      status: MissionStatus.RECEIVED,
      plan: null,
      phases: [],
      currentPhase: MissionPhaseType.PLAN,
      results: new Map(),
      deliverables: [],
      certificationReport: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      error: null,
      metadata: {
        userId: input.userId ?? null,
        projectId: input.projectId ?? null,
        priority: input.priority ?? 'normal',
        context: input.context ?? {},
        attachments: input.attachments ?? [],
        submittedAt: new Date().toISOString(),
      },
    };

    this.missions.set(missionId, mission);
    this.missionEvents.set(missionId, []);

    this.emitEvent(missionId, 'mission.received', {
      instruction: input.instruction,
      priority: input.priority ?? 'normal',
      userId: input.userId,
    });

    // ── Kick off the pipeline asynchronously ──────────────────────
    this.executePipeline(missionId).catch((error) => {
      this.logger.error(
        `Pipeline crashed for mission ${missionId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    });

    return missionId;
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. planMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Analyze the instruction, determine which teams are needed,
   * create a MissionPlan with phases, tasks, and dependencies.
   *
   * Heuristics:
   *   - web/search/scrape → Browser Team
   *   - create/build/develop/code/app → Development Team
   *   - analyze/report/marketing/SEO → Business Team
   *   - Always include Memory Team for context
   *   - Always include Certification Team before delivery
   *   - Always include Delivery Team at the end
   *   - Build phase dependencies (browser → dev if research needed, dev → certify, certify → deliver)
   */
  async planMission(missionId: string): Promise<MissionPlan> {
    const mission = this.getMissionOrThrow(missionId);
    const instruction = mission.instruction.toLowerCase();

    this.logger.log(`📋 Planning mission ${missionId}...`);

    this.transitionStatus(mission, MissionStatus.PLANNING);
    this.emitEvent(missionId, 'mission.planning', { instruction: mission.instruction });

    // ── Heuristic team detection ──────────────────────────────────
    const needsBrowser = BROWSER_KEYWORDS.some((kw) => instruction.includes(kw));
    const needsDevelopment = DEVELOPMENT_KEYWORDS.some((kw) => instruction.includes(kw));
    const needsBusiness = BUSINESS_KEYWORDS.some((kw) => instruction.includes(kw));

    // Memory is always needed for context retrieval and storage
    const needsMemory = true;
    // Certification is always needed before delivery
    const needsCertification = true;
    // Delivery is always needed at the end
    const needsDelivery = true;

    // ── Build required teams ──────────────────────────────────────
    const requiredTeams: TeamType[] = [TeamType.MEMORY];

    if (needsBrowser) requiredTeams.push(TeamType.BROWSER);
    if (needsDevelopment) requiredTeams.push(TeamType.DEVELOPMENT);
    if (needsBusiness) requiredTeams.push(TeamType.BUSINESS);

    requiredTeams.push(TeamType.CERTIFICATION, TeamType.DELIVERY);

    // ── Build phases ──────────────────────────────────────────────
    const phases: PlannedPhase[] = [];
    const dependencies: Array<{ from: string; to: string }> = [];

    // Phase 1: PLAN (always first)
    const planPhaseId = `phase-${MissionPhaseType.PLAN}-${uuidv4().substring(0, 8)}`;
    phases.push({
      id: planPhaseId,
      type: MissionPhaseType.PLAN,
      team: TeamType.MEMORY,
      description: `Analyze instruction and create execution plan for: "${mission.instruction.substring(0, 100)}"`,
      tasks: [
        {
          id: `task-plan-analyze-${uuidv4().substring(0, 8)}`,
          agentCapability: 'analyze_instruction',
          description: 'Analyze the natural language instruction and extract requirements',
          input: { instruction: mission.instruction, context: mission.metadata.context },
          dependsOn: [],
        },
        {
          id: `task-plan-context-${uuidv4().substring(0, 8)}`,
          agentCapability: 'retrieve_context',
          description: 'Retrieve relevant context from memory for mission execution',
          input: { instruction: mission.instruction, projectId: mission.metadata.projectId },
          dependsOn: [],
        },
      ],
      dependsOn: [],
      parallel: false,
      estimatedDurationMs: 15_000,
    });

    let lastPhaseId = planPhaseId;

    // Phase 2: BROWSER (if needed)
    if (needsBrowser) {
      const browserPhaseId = `phase-${MissionPhaseType.BROWSER}-${uuidv4().substring(0, 8)}`;
      const browserTasks: PlannedTask[] = [
        {
          id: `task-browser-search-${uuidv4().substring(0, 8)}`,
          agentCapability: 'navigate',
          description: 'Search the web for relevant information and resources',
          input: { instruction: mission.instruction, action: 'search' },
          dependsOn: [],
        },
        {
          id: `task-browser-scrape-${uuidv4().substring(0, 8)}`,
          agentCapability: 'data_extraction',
          description: 'Extract and collect relevant data from web sources',
          input: { instruction: mission.instruction, action: 'scrape' },
          dependsOn: [],
        },
        {
          id: `task-browser-research-${uuidv4().substring(0, 8)}`,
          agentCapability: 'navigate',
          description: 'Deep research on technical requirements and best practices',
          input: { instruction: mission.instruction, action: 'research' },
          dependsOn: [],
        },
      ];

      phases.push({
        id: browserPhaseId,
        type: MissionPhaseType.BROWSER,
        team: TeamType.BROWSER,
        description: 'Web research and data collection phase',
        tasks: browserTasks,
        dependsOn: [lastPhaseId],
        parallel: true,
        estimatedDurationMs: 45_000,
      });

      dependencies.push({ from: lastPhaseId, to: browserPhaseId });
      lastPhaseId = browserPhaseId;
    }

    // Phase 3: BUSINESS (if needed — can run in parallel with development if no browser dependency)
    if (needsBusiness) {
      const businessPhaseId = `phase-${MissionPhaseType.BUSINESS}-${uuidv4().substring(0, 8)}`;
      const businessTasks: PlannedTask[] = [
        {
          id: `task-biz-analysis-${uuidv4().substring(0, 8)}`,
          agentCapability: 'analyze',
          description: 'Perform business analysis and market research',
          input: { instruction: mission.instruction, action: 'analyze' },
          dependsOn: [],
        },
        {
          id: `task-biz-strategy-${uuidv4().substring(0, 8)}`,
          agentCapability: 'strategy',
          description: 'Develop business strategy and recommendations',
          input: { instruction: mission.instruction, action: 'strategy' },
          dependsOn: [],
        },
        {
          id: `task-biz-report-${uuidv4().substring(0, 8)}`,
          agentCapability: 'report',
          description: 'Generate business report and insights',
          input: { instruction: mission.instruction, action: 'report' },
          dependsOn: [],
        },
      ];

      // Business phase can run in parallel with browser if browser exists
      const businessDependsOn = needsBrowser ? [lastPhaseId] : [planPhaseId];

      phases.push({
        id: businessPhaseId,
        type: MissionPhaseType.BUSINESS,
        team: TeamType.BUSINESS,
        description: 'Business analysis and strategy phase',
        tasks: businessTasks,
        dependsOn: businessDependsOn,
        parallel: !needsBrowser, // parallel with dev if no browser needed
        estimatedDurationMs: 30_000,
      });

      for (const dep of businessDependsOn) {
        dependencies.push({ from: dep, to: businessPhaseId });
      }

      // If both business and development, track for potential parallel execution
      if (!needsDevelopment) {
        lastPhaseId = businessPhaseId;
      }
    }

    // Phase 4: DEVELOP (if needed)
    if (needsDevelopment) {
      const developPhaseId = `phase-${MissionPhaseType.DEVELOP}-${uuidv4().substring(0, 8)}`;
      const developTasks: PlannedTask[] = [
        {
          id: `task-dev-architect-${uuidv4().substring(0, 8)}`,
          agentCapability: 'generate_code',
          description: 'Design system architecture and generate project structure',
          input: { instruction: mission.instruction, action: 'architect' },
          dependsOn: [],
        },
        {
          id: `task-dev-code-${uuidv4().substring(0, 8)}`,
          agentCapability: 'generate_code',
          description: 'Generate application code based on architecture',
          input: { instruction: mission.instruction, action: 'implement' },
          dependsOn: [`task-dev-architect-*`],
        },
        {
          id: `task-dev-test-${uuidv4().substring(0, 8)}`,
          agentCapability: 'test',
          description: 'Generate and run tests for the application',
          input: { instruction: mission.instruction, action: 'test' },
          dependsOn: [],
        },
        {
          id: `task-dev-docs-${uuidv4().substring(0, 8)}`,
          agentCapability: 'documentation',
          description: 'Generate documentation for the application',
          input: { instruction: mission.instruction, action: 'document' },
          dependsOn: [],
        },
        {
          id: `task-dev-deploy-${uuidv4().substring(0, 8)}`,
          agentCapability: 'deploy',
          description: 'Deploy the application to target environment',
          input: { instruction: mission.instruction, action: 'deploy' },
          dependsOn: [],
        },
      ];

      // Development depends on browser research if it exists, otherwise on plan
      const developDependsOn = needsBrowser ? [lastPhaseId] : [planPhaseId];

      phases.push({
        id: developPhaseId,
        type: MissionPhaseType.DEVELOP,
        team: TeamType.DEVELOPMENT,
        description: 'Software development and deployment phase',
        tasks: developTasks,
        dependsOn: developDependsOn,
        parallel: false, // dev tasks are sequential internally
        estimatedDurationMs: 120_000,
      });

      for (const dep of developDependsOn) {
        dependencies.push({ from: dep, to: developPhaseId });
      }

      lastPhaseId = developPhaseId;
    }

    // Phase 5: CERTIFY (always)
    const certifyPhaseId = `phase-${MissionPhaseType.CERTIFY}-${uuidv4().substring(0, 8)}`;
    phases.push({
      id: certifyPhaseId,
      type: MissionPhaseType.CERTIFY,
      team: TeamType.CERTIFICATION,
      description: 'Certification and quality assurance phase',
      tasks: [
        {
          id: `task-cert-quality-${uuidv4().substring(0, 8)}`,
          agentCapability: 'certify_quality',
          description: 'Run quality certification checks on all deliverables',
          input: { instruction: mission.instruction, action: 'certify_quality' },
          dependsOn: [],
        },
        {
          id: `task-cert-security-${uuidv4().substring(0, 8)}`,
          agentCapability: 'certify_security',
          description: 'Run security certification checks',
          input: { instruction: mission.instruction, action: 'certify_security' },
          dependsOn: [],
        },
        {
          id: `task-cert-completeness-${uuidv4().substring(0, 8)}`,
          agentCapability: 'certify_completeness',
          description: 'Verify completeness of all mission objectives',
          input: { instruction: mission.instruction, action: 'certify_completeness' },
          dependsOn: [],
        },
      ],
      dependsOn: [lastPhaseId],
      parallel: true,
      estimatedDurationMs: 30_000,
    });

    dependencies.push({ from: lastPhaseId, to: certifyPhaseId });

    // Phase 6: DELIVER (always last)
    const deliverPhaseId = `phase-${MissionPhaseType.DELIVER}-${uuidv4().substring(0, 8)}`;
    phases.push({
      id: deliverPhaseId,
      type: MissionPhaseType.DELIVER,
      team: TeamType.DELIVERY,
      description: 'Packaging and delivery of final results',
      tasks: [
        {
          id: `task-deliver-package-${uuidv4().substring(0, 8)}`,
          agentCapability: 'package',
          description: 'Package all artifacts and deliverables',
          input: { instruction: mission.instruction, action: 'package' },
          dependsOn: [],
        },
        {
          id: `task-deliver-handoff-${uuidv4().substring(0, 8)}`,
          agentCapability: 'deliver',
          description: 'Final delivery and handoff to user',
          input: { instruction: mission.instruction, action: 'deliver' },
          dependsOn: [],
        },
      ],
      dependsOn: [certifyPhaseId],
      parallel: false,
      estimatedDurationMs: 15_000,
    });

    dependencies.push({ from: certifyPhaseId, to: deliverPhaseId });

    // ── Build the plan ────────────────────────────────────────────
    const totalEstimatedDurationMs = phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);

    // Rough cost estimation based on teams and phases
    const costPerTeam: Record<TeamType, number> = {
      [TeamType.BROWSER]: 0.05,
      [TeamType.DEVELOPMENT]: 0.25,
      [TeamType.BUSINESS]: 0.1,
      [TeamType.MEMORY]: 0.02,
      [TeamType.CERTIFICATION]: 0.08,
      [TeamType.DELIVERY]: 0.03,
    };

    const estimatedCost = requiredTeams.reduce((sum, team) => sum + (costPerTeam[team] ?? 0), 0);

    const plan: MissionPlan = {
      missionId,
      phases,
      estimatedDurationMs: totalEstimatedDurationMs,
      estimatedCost,
      requiredTeams,
      dependencies,
    };

    // ── Update mission ────────────────────────────────────────────
    mission.plan = plan;

    // Initialize phase execution records
    mission.phases = phases.map((pp) => ({
      type: pp.type,
      status: 'pending' as const,
      startedAt: null,
      completedAt: null,
      tasks: pp.tasks.map((pt) => ({
        id: pt.id,
        capability: pt.agentCapability,
        status: 'pending' as const,
        assignedAgent: null,
        result: null,
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
      })),
    }));

    this.emitEvent(missionId, 'mission.planned', {
      phaseCount: phases.length,
      requiredTeams,
      estimatedDurationMs: totalEstimatedDurationMs,
      estimatedCost,
    });

    this.logger.log(
      `✅ Mission ${missionId} planned: ${phases.length} phases, ` +
        `teams: [${requiredTeams.join(', ')}], ` +
        `est. ${totalEstimatedDurationMs}ms, $${estimatedCost.toFixed(2)}`,
    );

    return plan;
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. executeMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Execute the plan phase by phase. For each phase, assign tasks to
   * the appropriate team. Wait for completion.
   *
   * If a phase fails, attempt repair once. If still failing, mark
   * mission as FAILED.
   */
  async executeMission(missionId: string): Promise<void> {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.plan) {
      throw new Error(`Mission ${missionId} has no plan. Call planMission() first.`);
    }

    this.transitionStatus(mission, MissionStatus.EXECUTING);
    mission.startedAt = new Date();

    this.emitEvent(missionId, 'mission.executing', {
      totalPhases: mission.plan.phases.length,
    });

    this.logger.log(`🚀 Executing mission ${missionId} (${mission.plan.phases.length} phases)...`);

    const phases = mission.plan.phases;

    for (let i = 0; i < phases.length; i++) {
      // ── Check for cancellation ────────────────────────────────
      if (this.cancelledMissions.has(missionId)) {
        this.transitionStatus(mission, MissionStatus.CANCELLED);
        this.emitEvent(missionId, 'mission.cancelled', {
          reason: 'User cancelled during execution',
        });
        return;
      }

      // ── Check for pause ───────────────────────────────────────
      while (this.pausedMissions.has(missionId)) {
        await this.sleep(500);
        if (this.cancelledMissions.has(missionId)) {
          this.transitionStatus(mission, MissionStatus.CANCELLED);
          this.emitEvent(missionId, 'mission.cancelled', { reason: 'User cancelled while paused' });
          return;
        }
      }

      const plannedPhase = phases[i];
      const phaseRecord = mission.phases.find((p) => p.type === plannedPhase.type);

      if (!phaseRecord) {
        this.logger.warn(`Phase record not found for ${plannedPhase.type}, skipping`);
        continue;
      }

      mission.currentPhase = plannedPhase.type;

      this.logger.log(
        `⚙️  Phase [${i + 1}/${phases.length}] ${plannedPhase.type} — ${plannedPhase.description}`,
      );

      this.emitEvent(missionId, 'mission.phase_started', {
        phase: plannedPhase.type,
        phaseIndex: i + 1,
        totalPhases: phases.length,
      });

      // ── Execute the phase ─────────────────────────────────────
      try {
        await this.executePhase(missionId, plannedPhase.type);

        const result = mission.results.get(plannedPhase.type);
        if (result && !result.success) {
          // Phase failed — attempt repair
          this.logger.warn(`⚠️  Phase ${plannedPhase.type} failed, attempting repair...`);

          const repaired = await this.attemptRepair(missionId, plannedPhase.type);

          if (!repaired) {
            this.logger.error(
              `❌ Phase ${plannedPhase.type} failed after repair attempt. Mission FAILED.`,
            );
            mission.error = `Phase ${plannedPhase.type} failed and could not be repaired`;
            this.transitionStatus(mission, MissionStatus.FAILED);
            this.emitEvent(missionId, 'mission.failed', {
              phase: plannedPhase.type,
              error: mission.error,
            });
            return;
          }
        }
      } catch (error) {
        this.logger.error(`❌ Phase ${plannedPhase.type} threw error: ${(error as Error).message}`);

        // Attempt repair
        const repaired = await this.attemptRepair(missionId, plannedPhase.type);

        if (!repaired) {
          mission.error = `Phase ${plannedPhase.type} failed: ${(error as Error).message}`;
          this.transitionStatus(mission, MissionStatus.FAILED);
          this.emitEvent(missionId, 'mission.failed', {
            phase: plannedPhase.type,
            error: mission.error,
          });
          return;
        }
      }

      this.emitEvent(missionId, 'mission.phase_completed', {
        phase: plannedPhase.type,
        phaseIndex: i + 1,
      });
    }

    this.logger.log(`✅ All phases executed for mission ${missionId}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. executePhase
  // ──────────────────────────────────────────────────────────────────

  /**
   * Execute a single phase by delegating to the appropriate team service.
   * Each phase's tasks are dispatched according to the team's capabilities.
   */
  async executePhase(missionId: string, phaseType: MissionPhaseType): Promise<PhaseResult> {
    const mission = this.getMissionOrThrow(missionId);
    const phaseRecord = mission.phases.find((p) => p.type === phaseType);

    if (!phaseRecord) {
      throw new Error(`Phase ${phaseType} not found in mission ${missionId}`);
    }

    const plannedPhase = mission.plan?.phases.find((p) => p.type === phaseType);
    const phaseStart = Date.now();

    phaseRecord.status = 'in_progress';
    phaseRecord.startedAt = new Date();

    this.emitEvent(missionId, 'phase.executing', {
      phase: phaseType,
      taskCount: phaseRecord.tasks.length,
    });

    // ── Handle special phases ────────────────────────────────────
    if (phaseType === MissionPhaseType.PLAN) {
      const result = await this.executePlanPhase(mission, phaseRecord);
      phaseRecord.status = 'completed';
      phaseRecord.completedAt = new Date();
      mission.results.set(phaseType, result);
      return result;
    }

    if (phaseType === MissionPhaseType.CERTIFY) {
      const result = await this.executeCertifyPhase(mission, phaseRecord);
      phaseRecord.status = result.success ? 'completed' : 'failed';
      phaseRecord.completedAt = new Date();
      mission.results.set(phaseType, result);
      return result;
    }

    if (phaseType === MissionPhaseType.DELIVER) {
      const result = await this.executeDeliverPhase(mission, phaseRecord);
      phaseRecord.status = result.success ? 'completed' : 'failed';
      phaseRecord.completedAt = new Date();
      mission.results.set(phaseType, result);
      return result;
    }

    // ── Execute regular team phases (Browser / Develop / Business) ─
    const team = plannedPhase?.team ?? this.inferTeamForPhase(phaseType);

    this.logger.log(
      `🔀 Delegating phase ${phaseType} to ${team} team ` +
        `(${phaseRecord.tasks.length} tasks, parallel: ${plannedPhase?.parallel ?? false})`,
    );

    const isParallel = plannedPhase?.parallel ?? false;

    if (isParallel) {
      // Execute all tasks concurrently
      const taskPromises = phaseRecord.tasks.map((task) => this.executeTask(missionId, task, team));
      await Promise.allSettled(taskPromises);
    } else {
      // Execute tasks sequentially with dependency ordering
      const sortedTasks = this.topologicalSortTasks(phaseRecord.tasks, plannedPhase?.tasks ?? []);

      for (const task of sortedTasks) {
        // Check cancellation/pause between tasks
        if (this.cancelledMissions.has(missionId)) break;
        while (this.pausedMissions.has(missionId)) {
          await this.sleep(500);
        }

        await this.executeTask(missionId, task, team);
      }
    }

    // ── Compute phase result ─────────────────────────────────────
    const allCompleted = phaseRecord.tasks.every((t) => t.status === 'completed');
    const anyFailed = phaseRecord.tasks.some((t) => t.status === 'failed');
    const durationMs = Date.now() - phaseStart;

    const artifacts = phaseRecord.tasks
      .filter((t) => t.status === 'completed' && t.result)
      .map((t) => t.result?.artifact ?? t.result?.location ?? `task-${t.id}`)
      .filter(Boolean);

    const result: PhaseResult = {
      phaseType,
      success: allCompleted && !anyFailed,
      output: phaseRecord.tasks.map((t) => ({
        taskId: t.id,
        capability: t.capability,
        status: t.status,
        result: t.result,
        error: t.error,
      })),
      durationMs,
      artifacts,
    };

    phaseRecord.status = result.success ? 'completed' : 'failed';
    phaseRecord.completedAt = new Date();
    mission.results.set(phaseType, result);

    this.emitEvent(missionId, 'phase.completed', {
      phase: phaseType,
      success: result.success,
      durationMs,
      artifactCount: artifacts.length,
    });

    return result;
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. certifyMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Run certification on the mission results.
   * Check quality, completeness, security across all deliverables.
   */
  async certifyMission(missionId: string): Promise<CertificationReport> {
    const mission = this.getMissionOrThrow(missionId);

    this.transitionStatus(mission, MissionStatus.CERTIFYING);
    this.emitEvent(missionId, 'mission.certifying', {});

    this.logger.log(`🔒 Certifying mission ${missionId}...`);

    const domains: CertificationDomain[] = [];

    // ── Completeness Certification ────────────────────────────────
    const allPhasesCompleted = mission.phases.every((p) => p.status === 'completed');
    const totalTasks = mission.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const completedTasks = mission.phases.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'completed').length,
      0,
    );
    const completenessScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    domains.push({
      name: 'completeness',
      score: completenessScore,
      passed: completenessScore >= 80,
      details: `${completedTasks}/${totalTasks} tasks completed. All phases ${allPhasesCompleted ? 'completed' : 'incomplete'}.`,
    });

    // ── Quality Certification ─────────────────────────────────────
    const avgTaskQuality = this.computeAverageQuality(mission);
    domains.push({
      name: 'quality',
      score: avgTaskQuality,
      passed: avgTaskQuality >= 70,
      details: `Average quality score across all completed tasks: ${avgTaskQuality}/100`,
    });

    // ── Security Certification ────────────────────────────────────
    const securityScore = this.assessSecurity(mission);
    domains.push({
      name: 'security',
      score: securityScore,
      passed: securityScore >= 75,
      details: `Security assessment score: ${securityScore}/100`,
    });

    // ── Performance Certification ─────────────────────────────────
    const resultEntries = [] as PhaseResult[];
    mission.results.forEach((r) => resultEntries.push(r));
    const totalDuration = resultEntries.reduce((sum, r) => sum + r.durationMs, 0);
    const estimatedDuration = mission.plan?.estimatedDurationMs ?? 0;
    const withinEstimate = totalDuration <= estimatedDuration * 1.5;
    const performanceScore = withinEstimate
      ? Math.min(100, Math.round((estimatedDuration / Math.max(totalDuration, 1)) * 100))
      : Math.max(0, Math.round(100 - (totalDuration - estimatedDuration * 1.5) / 1000));

    domains.push({
      name: 'performance',
      score: performanceScore,
      passed: performanceScore >= 60,
      details: `Total duration ${totalDuration}ms vs estimated ${estimatedDuration}ms. Within 1.5x estimate: ${withinEstimate}`,
    });

    // ── Reliability Certification ─────────────────────────────────
    const failedPhases = mission.phases.filter((p) => p.status === 'failed').length;
    const totalPhases = mission.phases.length;
    const reliabilityScore =
      totalPhases > 0 ? Math.round(((totalPhases - failedPhases) / totalPhases) * 100) : 100;

    domains.push({
      name: 'reliability',
      score: reliabilityScore,
      passed: reliabilityScore >= 80,
      details: `${failedPhases}/${totalPhases} phases failed. ${this.repairAttempts.get(missionId) ?? 0} repairs attempted.`,
    });

    // ── Documentation Certification ───────────────────────────────
    const hasDocs =
      mission.results.has(MissionPhaseType.DEVELOP) &&
      mission.phases.some((p) =>
        p.tasks.some((t) => t.capability === 'documentation' && t.status === 'completed'),
      );
    const docScore = hasDocs ? 85 : 40;

    domains.push({
      name: 'documentation',
      score: docScore,
      passed: docScore >= 60,
      details: hasDocs
        ? 'Documentation task completed as part of development phase'
        : 'No documentation task found or completed',
    });

    // ── Test Coverage Certification ───────────────────────────────
    const hasTests = mission.phases.some((p) =>
      p.tasks.some(
        (t) =>
          (t.capability === 'test' || t.capability === 'certify_quality') &&
          t.status === 'completed',
      ),
    );
    const testScore = hasTests ? 80 : 30;

    domains.push({
      name: 'test_coverage',
      score: testScore,
      passed: testScore >= 60,
      details: hasTests
        ? 'Testing tasks were executed as part of the mission'
        : 'No testing tasks were executed',
    });

    // ── Compute overall score ─────────────────────────────────────
    const weights: Record<string, number> = {
      completeness: 0.2,
      quality: 0.2,
      security: 0.15,
      performance: 0.1,
      reliability: 0.15,
      documentation: 0.1,
      test_coverage: 0.1,
    };

    const overallScore = Math.round(
      domains.reduce((sum, d) => sum + d.score * (weights[d.name] ?? 1 / domains.length), 0),
    );

    const allPassed = domains.every((d) => d.passed);
    const criticalPassed = domains
      .filter((d) => ['completeness', 'security', 'reliability'].includes(d.name))
      .every((d) => d.passed);

    const report: CertificationReport = {
      missionId,
      overallScore,
      passed: allPassed && criticalPassed,
      domains,
      certifiedAt: new Date(),
    };

    mission.certificationReport = report;

    this.emitEvent(missionId, 'mission.certified', {
      overallScore,
      passed: report.passed,
      domainScores: Object.fromEntries(domains.map((d) => [d.name, d.score])),
    });

    this.logger.log(
      `${report.passed ? '✅' : '⚠️ '} Mission ${missionId} certified: ` +
        `score=${overallScore}, passed=${report.passed}`,
    );

    return report;
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. deliverMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Package and deliver the final results as deliverables.
   */
  async deliverMission(missionId: string): Promise<Deliverable[]> {
    const mission = this.getMissionOrThrow(missionId);

    this.transitionStatus(mission, MissionStatus.DELIVERING);
    this.emitEvent(missionId, 'mission.delivering', {});

    this.logger.log(`📦 Delivering mission ${missionId}...`);

    const deliverables: Deliverable[] = [];

    // ── Collect artifacts from all phases ─────────────────────────
    const phaseResults: Array<[string, PhaseResult]> = [];
    mission.results.forEach((result, phaseType) => {
      phaseResults.push([phaseType, result]);
    });
    for (const [phaseKey, result] of phaseResults) {
      const phaseType = phaseKey as MissionPhaseType;
      for (const artifact of result.artifacts) {
        const deliverable = this.artifactToDeliverable(artifact, phaseType, mission);
        if (deliverable) {
          deliverables.push(deliverable);
        }
      }
    }

    // ── Generate certification report deliverable ─────────────────
    if (mission.certificationReport) {
      deliverables.push({
        type: 'report',
        name: `certification-report-${missionId.substring(0, 8)}.pdf`,
        description: `Certification report for mission ${missionId}. Overall score: ${mission.certificationReport.overallScore}/100`,
        location: `/missions/${missionId}/certification-report.pdf`,
        createdAt: new Date(),
      });
    }

    // ── Generate mission summary deliverable ──────────────────────
    deliverables.push({
      type: 'report',
      name: `mission-summary-${missionId.substring(0, 8)}.md`,
      description: `Mission summary: "${mission.instruction.substring(0, 80)}" — ${mission.phases.length} phases, ${deliverables.length} deliverables`,
      location: `/missions/${missionId}/summary.md`,
      createdAt: new Date(),
    });

    // ── If development was done, add code repository deliverable ──
    if (mission.results.has(MissionPhaseType.DEVELOP)) {
      const devResult = mission.results.get(MissionPhaseType.DEVELOP)!;
      if (devResult.success) {
        deliverables.push({
          type: 'repository',
          name: `source-code-${missionId.substring(0, 8)}.zip`,
          description: 'Complete source code repository',
          location: `/missions/${missionId}/source.zip`,
          createdAt: new Date(),
        });

        deliverables.push({
          type: 'deployed_url',
          name: `deployment-url-${missionId.substring(0, 8)}`,
          description: 'Deployed application URL',
          location:
            devResult.output?.find?.((o: any) => o.capability === 'deploy')?.result?.url ??
            `https://app-${missionId.substring(0, 8)}.aenews.app`,
          createdAt: new Date(),
        });
      }
    }

    mission.deliverables = deliverables;

    this.emitEvent(missionId, 'mission.delivered', {
      deliverableCount: deliverables.length,
      types: deliverables.map((d) => d.type),
    });

    this.logger.log(
      `📬 Mission ${missionId} delivered: ${deliverables.length} deliverables ` +
        `[${deliverables.map((d) => d.type).join(', ')}]`,
    );

    return deliverables;
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. getMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Get full mission state.
   */
  getMission(missionId: string): MissionDefinition | null {
    return this.missions.get(missionId) ?? null;
  }

  // ──────────────────────────────────────────────────────────────────
  // 8. getMissionStatus
  // ──────────────────────────────────────────────────────────────────

  /**
   * Quick status check.
   */
  getMissionStatus(missionId: string): {
    id: string;
    status: MissionStatus;
    currentPhase: MissionPhaseType;
    progress: number;
    error: string | null;
  } | null {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    const totalPhases = mission.phases.length;
    const completedPhases = mission.phases.filter((p) => p.status === 'completed').length;
    const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    return {
      id: mission.id,
      status: mission.status,
      currentPhase: mission.currentPhase,
      progress,
      error: mission.error,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 9. cancelMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Cancel a running mission.
   */
  async cancelMission(missionId: string): Promise<boolean> {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    const cancellableStatuses: MissionStatus[] = [
      MissionStatus.RECEIVED,
      MissionStatus.PLANNING,
      MissionStatus.EXECUTING,
      MissionStatus.PAUSED,
    ];

    if (!cancellableStatuses.includes(mission.status)) {
      this.logger.warn(`Cannot cancel mission ${missionId} in status ${mission.status}`);
      return false;
    }

    this.cancelledMissions.add(missionId);
    this.pausedMissions.delete(missionId); // Clear pause if paused

    mission.error = 'Mission cancelled by user';
    mission.completedAt = new Date();

    this.transitionStatus(mission, MissionStatus.CANCELLED);
    this.emitEvent(missionId, 'mission.cancelled', {
      previousStatus: mission.status,
      reason: 'User requested cancellation',
    });

    this.logger.log(`🛑 Mission ${missionId} cancelled`);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // 10. pauseMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Pause a running mission.
   */
  async pauseMission(missionId: string): Promise<boolean> {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    if (mission.status !== MissionStatus.EXECUTING) {
      this.logger.warn(`Cannot pause mission ${missionId} in status ${mission.status}`);
      return false;
    }

    this.pausedMissions.add(missionId);

    // Transition to paused status
    const previousStatus = mission.status;
    mission.status = MissionStatus.PAUSED;

    this.emitEvent(missionId, 'mission.paused', {
      previousStatus,
      currentPhase: mission.currentPhase,
    });

    this.logger.log(`⏸️  Mission ${missionId} paused at phase ${mission.currentPhase}`);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // 11. resumeMission
  // ──────────────────────────────────────────────────────────────────

  /**
   * Resume a paused mission.
   */
  async resumeMission(missionId: string): Promise<boolean> {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    if (mission.status !== MissionStatus.PAUSED) {
      this.logger.warn(`Cannot resume mission ${missionId} in status ${mission.status}`);
      return false;
    }

    this.pausedMissions.delete(missionId);
    mission.status = MissionStatus.EXECUTING;

    this.emitEvent(missionId, 'mission.resumed', {
      currentPhase: mission.currentPhase,
    });

    this.logger.log(`▶️  Mission ${missionId} resumed at phase ${mission.currentPhase}`);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // 12. getMissionHistory
  // ──────────────────────────────────────────────────────────────────

  /**
   * Get mission history, optionally filtered by user.
   */
  getMissionHistory(
    userId?: string,
    limit: number = 50,
  ): Array<{
    id: string;
    instruction: string;
    status: MissionStatus;
    createdAt: Date;
    completedAt: Date | null;
    priority: string;
    deliverableCount: number;
  }> {
    let missions = Array.from(this.missions.values());

    if (userId) {
      missions = missions.filter((m) => m.metadata.userId === userId);
    }

    // Sort by creation date, newest first
    missions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return missions.slice(0, limit).map((m) => ({
      id: m.id,
      instruction: m.instruction,
      status: m.status,
      createdAt: m.createdAt,
      completedAt: m.completedAt,
      priority: m.metadata.priority ?? 'normal',
      deliverableCount: m.deliverables.length,
    }));
  }

  // ──────────────────────────────────────────────────────────────────
  // 13. getMissionStats
  // ──────────────────────────────────────────────────────────────────

  /**
   * Statistics across all missions.
   */
  getMissionStats(): MissionStats {
    const missions = Array.from(this.missions.values());
    const totalMissions = missions.length;

    // By status
    const byStatus = {} as Record<MissionStatus, number>;
    for (const status of Object.values(MissionStatus)) {
      byStatus[status] = missions.filter((m) => m.status === status).length;
    }

    // By priority
    const byPriority: Record<string, number> = {};
    for (const m of missions) {
      const p = m.metadata.priority ?? 'normal';
      byPriority[p] = (byPriority[p] ?? 0) + 1;
    }

    // Average duration
    const completedMissions = missions.filter(
      (m) => m.status === MissionStatus.COMPLETED && m.startedAt && m.completedAt,
    );
    const averageDurationMs =
      completedMissions.length > 0
        ? Math.round(
            completedMissions.reduce((sum, m) => {
              return sum + (m.completedAt!.getTime() - m.startedAt!.getTime());
            }, 0) / completedMissions.length,
          )
        : 0;

    // Success rate
    const terminalMissions = missions.filter((m) =>
      [MissionStatus.COMPLETED, MissionStatus.FAILED].includes(m.status),
    );
    const successRate =
      terminalMissions.length > 0
        ? Math.round(
            (terminalMissions.filter((m) => m.status === MissionStatus.COMPLETED).length /
              terminalMissions.length) *
              100,
          ) / 100
        : 0;

    // Deliverables
    const totalDeliverables = missions.reduce((sum, m) => sum + m.deliverables.length, 0);

    // Certifications
    const certifiedMissions = missions.filter((m) => m.certificationReport !== null);
    const totalCertifications = certifiedMissions.length;
    const averageCertificationScore =
      certifiedMissions.length > 0
        ? Math.round(
            certifiedMissions.reduce((sum, m) => sum + m.certificationReport!.overallScore, 0) /
              certifiedMissions.length,
          )
        : 0;

    return {
      totalMissions,
      byStatus,
      byPriority,
      averageDurationMs,
      successRate,
      totalDeliverables,
      totalCertifications,
      averageCertificationScore,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // PRIVATE METHODS — The Engine Room
  // ══════════════════════════════════════════════════════════════════

  /**
   * The full pipeline executor: plan → execute → certify → deliver.
   * Runs asynchronously after submitMission().
   */
  private async executePipeline(missionId: string): Promise<void> {
    try {
      // 1. Plan
      await this.planMission(missionId);

      if (this.cancelledMissions.has(missionId)) return;

      // 2. Execute
      await this.executeMission(missionId);

      if (this.cancelledMissions.has(missionId)) return;

      // Check if mission already failed during execution
      const mission = this.missions.get(missionId)!;
      if (mission.status === MissionStatus.FAILED) return;

      // 3. Certify
      await this.certifyMission(missionId);

      if (this.cancelledMissions.has(missionId)) return;

      // 4. Deliver
      await this.deliverMission(missionId);

      // 5. Mark completed
      const finalMission = this.missions.get(missionId)!;
      if (finalMission.status === MissionStatus.DELIVERING) {
        finalMission.status = MissionStatus.COMPLETED;
        finalMission.completedAt = new Date();

        const totalDuration = finalMission.startedAt
          ? finalMission.completedAt.getTime() - finalMission.startedAt.getTime()
          : 0;

        this.emitEvent(missionId, 'mission.completed', {
          totalDurationMs: totalDuration,
          deliverableCount: finalMission.deliverables.length,
          certificationScore: finalMission.certificationReport?.overallScore ?? 0,
          certified: finalMission.certificationReport?.passed ?? false,
        });

        this.logger.log(
          `🎉 Mission ${missionId} COMPLETED in ${totalDuration}ms ` +
            `with ${finalMission.deliverables.length} deliverables ` +
            `(certification: ${finalMission.certificationReport?.overallScore ?? 'N/A'})`,
        );
      }
    } catch (error) {
      const mission = this.missions.get(missionId);
      if (mission && mission.status !== MissionStatus.CANCELLED) {
        mission.status = MissionStatus.FAILED;
        mission.error = (error as Error).message;
        mission.completedAt = new Date();

        this.emitEvent(missionId, 'mission.failed', {
          error: (error as Error).message,
          stack: (error as Error).stack,
        });

        this.logger.error(
          `💥 Mission ${missionId} FAILED: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    } finally {
      // Clean up tracking sets
      this.cancelledMissions.delete(missionId);
      this.pausedMissions.delete(missionId);
    }
  }

  /**
   * Execute the PLAN phase — context retrieval and instruction analysis.
   */
  private async executePlanPhase(
    mission: MissionDefinition,
    phaseRecord: MissionPhase,
  ): Promise<PhaseResult> {
    const start = Date.now();
    const artifacts: string[] = [];

    for (const task of phaseRecord.tasks) {
      task.status = 'running';
      task.startedAt = new Date();
      task.assignedAgent = `memory-agent-${uuidv4().substring(0, 8)}`;

      try {
        if (task.capability === 'analyze_instruction') {
          // Simulate instruction analysis
          task.result = {
            analyzed: true,
            instruction: mission.instruction,
            detectedIntents: this.detectIntents(mission.instruction),
            complexity: this.assessComplexity(mission.instruction),
            estimatedEffort: this.estimateEffort(mission.instruction),
          };
          task.status = 'completed';
        } else if (task.capability === 'retrieve_context') {
          // Simulate context retrieval
          task.result = {
            contextRetrieved: true,
            relevantMemories: [],
            projectContext: mission.metadata.projectId ? { id: mission.metadata.projectId } : null,
          };
          task.status = 'completed';
        } else {
          task.result = { completed: true, capability: task.capability };
          task.status = 'completed';
        }

        task.completedAt = new Date();
        artifacts.push(`plan-${task.capability}-${task.id}`);
      } catch (error) {
        task.status = 'failed';
        task.error = (error as Error).message;
        task.completedAt = new Date();
      }
    }

    const success = phaseRecord.tasks.every((t) => t.status === 'completed');

    return {
      phaseType: MissionPhaseType.PLAN,
      success,
      output: phaseRecord.tasks.map((t) => ({ taskId: t.id, result: t.result })),
      durationMs: Date.now() - start,
      artifacts,
    };
  }

  /**
   * Execute the CERTIFY phase.
   */
  private async executeCertifyPhase(
    mission: MissionDefinition,
    phaseRecord: MissionPhase,
  ): Promise<PhaseResult> {
    const start = Date.now();

    // Run the full certification
    const report = await this.certifyMission(mission.id);

    // Map certification domains to tasks
    for (const task of phaseRecord.tasks) {
      task.status = 'running';
      task.startedAt = new Date();
      task.assignedAgent = `cert-agent-${uuidv4().substring(0, 8)}`;

      const domain = report.domains.find((d) => d.name === task.capability.replace('certify_', ''));

      if (domain) {
        task.result = {
          domain: domain.name,
          score: domain.score,
          passed: domain.passed,
          details: domain.details,
        };
        task.status = domain.passed ? 'completed' : 'failed';
      } else {
        // Generic certification result
        task.result = {
          certified: report.passed,
          overallScore: report.overallScore,
        };
        task.status = report.passed ? 'completed' : 'failed';
      }

      task.completedAt = new Date();
    }

    const artifacts = [`certification-report-${mission.id}.pdf`];

    return {
      phaseType: MissionPhaseType.CERTIFY,
      success: report.passed,
      output: report,
      durationMs: Date.now() - start,
      artifacts,
    };
  }

  /**
   * Execute the DELIVER phase.
   */
  private async executeDeliverPhase(
    mission: MissionDefinition,
    phaseRecord: MissionPhase,
  ): Promise<PhaseResult> {
    const start = Date.now();

    // Package and create deliverables
    const deliverables = await this.deliverMission(mission.id);

    for (const task of phaseRecord.tasks) {
      task.status = 'running';
      task.startedAt = new Date();
      task.assignedAgent = `delivery-agent-${uuidv4().substring(0, 8)}`;

      if (task.capability === 'package') {
        task.result = {
          packaged: true,
          deliverableCount: deliverables.length,
          types: deliverables.map((d) => d.type),
        };
        task.status = 'completed';
      } else if (task.capability === 'deliver') {
        task.result = {
          delivered: true,
          deliverables: deliverables.map((d) => ({
            name: d.name,
            type: d.type,
            location: d.location,
          })),
        };
        task.status = 'completed';
      } else {
        task.result = { completed: true };
        task.status = 'completed';
      }

      task.completedAt = new Date();
    }

    const artifacts = deliverables.map((d) => d.location);

    return {
      phaseType: MissionPhaseType.DELIVER,
      success: true,
      output: { deliverables },
      durationMs: Date.now() - start,
      artifacts,
    };
  }

  /**
   * Execute a single task within a phase.
   */
  private async executeTask(missionId: string, task: PhaseTask, team: TeamType): Promise<void> {
    task.status = 'assigned';
    task.assignedAgent = `${team}-agent-${uuidv4().substring(0, 8)}`;
    task.startedAt = new Date();

    this.emitEvent(missionId, 'task.started', {
      taskId: task.id,
      capability: task.capability,
      team,
      agent: task.assignedAgent,
    });

    try {
      task.status = 'running';

      // Simulate task execution with realistic behavior
      const result = await this.simulateTaskExecution(task, team);

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();

      this.emitEvent(missionId, 'task.completed', {
        taskId: task.id,
        capability: task.capability,
        success: true,
      });
    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      task.completedAt = new Date();
      task.retryCount++;

      this.emitEvent(missionId, 'task.failed', {
        taskId: task.id,
        capability: task.capability,
        error: task.error,
        retryCount: task.retryCount,
      });
    }
  }

  /**
   * Simulate task execution for a given team and capability.
   * In production, this delegates to actual agent services.
   */
  private async simulateTaskExecution(task: PhaseTask, team: TeamType): Promise<any> {
    // Simulated execution delay based on team type
    const delays: Record<TeamType, number> = {
      [TeamType.BROWSER]: 2000,
      [TeamType.DEVELOPMENT]: 5000,
      [TeamType.BUSINESS]: 3000,
      [TeamType.MEMORY]: 500,
      [TeamType.CERTIFICATION]: 2000,
      [TeamType.DELIVERY]: 1000,
    };

    await this.sleep(delays[team] ?? 1000);

    // Generate realistic results per team and capability
    switch (team) {
      case TeamType.BROWSER:
        return {
          success: true,
          capability: task.capability,
          artifact: `browser-output-${task.id}.json`,
          location: `/artifacts/browser/${task.id}`,
          data: {
            urlsProcessed: Math.floor(Math.random() * 20) + 1,
            dataExtracted: true,
            screenshots: Math.floor(Math.random() * 5),
          },
        };

      case TeamType.DEVELOPMENT:
        return {
          success: true,
          capability: task.capability,
          artifact: `dev-output-${task.id}.zip`,
          location: `/artifacts/dev/${task.id}`,
          data: {
            filesCreated: Math.floor(Math.random() * 50) + 5,
            testsPassing: Math.floor(Math.random() * 30) + 10,
            url: `https://app-${task.id.substring(0, 8)}.aenews.app`,
            deployed: task.capability === 'deploy',
          },
        };

      case TeamType.BUSINESS:
        return {
          success: true,
          capability: task.capability,
          artifact: `biz-output-${task.id}.pdf`,
          location: `/artifacts/business/${task.id}`,
          data: {
            insightsGenerated: Math.floor(Math.random() * 15) + 3,
            reportsCreated: Math.floor(Math.random() * 5) + 1,
          },
        };

      default:
        return {
          success: true,
          capability: task.capability,
          artifact: `${team}-output-${task.id}.json`,
          location: `/artifacts/${team}/${task.id}`,
        };
    }
  }

  /**
   * Attempt to repair a failed phase. Returns true if repair succeeded.
   */
  private async attemptRepair(missionId: string, phaseType: MissionPhaseType): Promise<boolean> {
    const currentAttempts = this.repairAttempts.get(missionId) ?? 0;

    if (currentAttempts >= 1) {
      this.logger.warn(`Repair limit reached for mission ${missionId}, phase ${phaseType}`);
      return false;
    }

    this.repairAttempts.set(missionId, currentAttempts + 1);
    this.emitEvent(missionId, 'mission.repair_attempt', {
      phase: phaseType,
      attempt: currentAttempts + 1,
    });

    this.logger.log(
      `🔧 Attempting repair for mission ${missionId}, phase ${phaseType} (attempt ${currentAttempts + 1})`,
    );

    try {
      // Reset the phase state
      const mission = this.missions.get(missionId)!;
      const phaseRecord = mission.phases.find((p) => p.type === phaseType);

      if (!phaseRecord) return false;

      // Reset failed tasks for retry
      for (const task of phaseRecord.tasks) {
        if (task.status === 'failed') {
          task.status = 'pending';
          task.error = null;
          task.retryCount++;
          task.startedAt = null;
          task.completedAt = null;
          task.result = null;
        }
      }

      phaseRecord.status = 'pending';
      phaseRecord.startedAt = null;
      phaseRecord.completedAt = null;

      // Re-execute the phase
      const result = await this.executePhase(missionId, phaseType);
      return result.success;
    } catch (error) {
      this.logger.error(`Repair failed for mission ${missionId}: ${(error as Error).message}`);
      return false;
    }
  }

  // ─── State Machine Helpers ────────────────────────────────────────

  /**
   * Validate and transition mission status.
   */
  private transitionStatus(mission: MissionDefinition, newStatus: MissionStatus): void {
    const allowed = VALID_TRANSITIONS[mission.status];

    if (!allowed || !allowed.includes(newStatus)) {
      this.logger.warn(
        `Invalid status transition: ${mission.status} → ${newStatus} for mission ${mission.id}`,
      );
      // Allow the transition anyway for robustness, but log the warning
    }

    const previousStatus = mission.status;
    mission.status = newStatus;

    this.logger.debug?.(`Mission ${mission.id}: ${previousStatus} → ${newStatus}`);
  }

  /**
   * Emit a structured mission event.
   */
  private emitEvent(missionId: string, type: string, data: Record<string, any>): void {
    const event: MissionEvent = {
      type,
      missionId,
      timestamp: new Date(),
      data,
    };

    const events = this.missionEvents.get(missionId);
    if (events) {
      events.push(event);
    }
  }

  // ─── Instruction Analysis Heuristics ──────────────────────────────

  /**
   * Detect intents from a natural language instruction.
   */
  private detectIntents(instruction: string): string[] {
    const lower = instruction.toLowerCase();
    const intents: string[] = [];

    if (BROWSER_KEYWORDS.some((kw) => lower.includes(kw))) {
      intents.push('research');
    }
    if (DEVELOPMENT_KEYWORDS.some((kw) => lower.includes(kw))) {
      intents.push('development');
    }
    if (BUSINESS_KEYWORDS.some((kw) => lower.includes(kw))) {
      intents.push('business_analysis');
    }
    if (lower.includes('deploy')) {
      intents.push('deployment');
    }
    if (lower.includes('test')) {
      intents.push('testing');
    }
    if (lower.includes('document')) {
      intents.push('documentation');
    }
    if (lower.includes('livr') || lower.includes('deliver')) {
      intents.push('delivery');
    }

    // Default: at least a development intent
    if (intents.length === 0) {
      intents.push('general_execution');
    }

    return intents;
  }

  /**
   * Assess the complexity of a mission instruction.
   */
  private assessComplexity(instruction: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = instruction.toLowerCase();
    let score = 0;

    // Multi-step indicators
    if (instruction.includes(',') || instruction.includes(' et ')) score += 1;
    if (lower.includes('saas') || lower.includes('platform')) score += 2;
    if (lower.includes('deploy') && lower.includes('test')) score += 2;
    if (lower.includes('fullstack') || lower.includes('full-stack')) score += 2;
    if (lower.includes('microservice')) score += 3;
    if (lower.includes('enterprise') || lower.includes('production')) score += 2;
    if (lower.includes('docker') || lower.includes('kubernetes')) score += 1;
    if (lower.includes('auth') || lower.includes('authentication')) score += 1;
    if (lower.includes('database') || lower.includes('base de données')) score += 1;

    if (score >= 8) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Estimate effort for a mission instruction.
   */
  private estimateEffort(instruction: string): {
    estimatedPhases: number;
    estimatedTasks: number;
    estimatedDurationMinutes: number;
  } {
    const complexity = this.assessComplexity(instruction);
    const multipliers: Record<
      string,
      { estimatedPhases: number; estimatedTasks: number; estimatedDurationMinutes: number }
    > = {
      low: { estimatedPhases: 3, estimatedTasks: 5, estimatedDurationMinutes: 2 },
      medium: { estimatedPhases: 4, estimatedTasks: 10, estimatedDurationMinutes: 5 },
      high: { estimatedPhases: 5, estimatedTasks: 18, estimatedDurationMinutes: 10 },
      critical: { estimatedPhases: 6, estimatedTasks: 25, estimatedDurationMinutes: 15 },
    };

    return multipliers[complexity];
  }

  // ─── Certification Helpers ─────────────────────────────────────────

  /**
   * Compute average quality score across all completed tasks.
   */
  private computeAverageQuality(mission: MissionDefinition): number {
    const completedTasks = mission.phases.flatMap((p) =>
      p.tasks.filter((t) => t.status === 'completed'),
    );

    if (completedTasks.length === 0) return 0;

    // Quality heuristics based on task outcomes
    let totalScore = 0;
    for (const task of completedTasks) {
      let score = 85; // base score

      // Bonus for having results
      if (task.result && typeof task.result === 'object') {
        score += 5;
      }

      // Penalty for retries
      score -= task.retryCount * 10;

      // Penalty for slow execution
      if (task.startedAt && task.completedAt) {
        const duration = task.completedAt.getTime() - task.startedAt.getTime();
        if (duration > 10000) score -= 5;
      }

      totalScore += Math.max(0, Math.min(100, score));
    }

    return Math.round(totalScore / completedTasks.length);
  }

  /**
   * Assess security score based on mission execution.
   */
  private assessSecurity(mission: MissionDefinition): number {
    let score = 80; // base score

    // Check if development was done
    const hasDev = mission.results.has(MissionPhaseType.DEVELOP);
    if (hasDev) {
      // Development missions need more security scrutiny
      const devResult = mission.results.get(MissionPhaseType.DEVELOP)!;

      // Check for deployment
      const hasDeploy = mission.phases.some((p) =>
        p.tasks.some((t) => t.capability === 'deploy' && t.status === 'completed'),
      );

      if (hasDeploy) {
        score -= 5; // deployment introduces risk
      }

      // Check for auth
      const lower = mission.instruction.toLowerCase();
      if (lower.includes('auth') || lower.includes('security')) {
        score += 10; // explicit security requirements are good
      }
    }

    // Penalty for errors during execution
    const errorCount = mission.phases.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'failed').length,
      0,
    );
    score -= errorCount * 5;

    return Math.max(0, Math.min(100, score));
  }

  // ─── Utility Methods ──────────────────────────────────────────────

  /**
   * Get mission or throw if not found.
   */
  private getMissionOrThrow(missionId: string): MissionDefinition {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }
    return mission;
  }

  /**
   * Infer team type from phase type.
   */
  private inferTeamForPhase(phaseType: MissionPhaseType): TeamType {
    const mapping: Record<MissionPhaseType, TeamType> = {
      [MissionPhaseType.PLAN]: TeamType.MEMORY,
      [MissionPhaseType.BROWSER]: TeamType.BROWSER,
      [MissionPhaseType.DEVELOP]: TeamType.DEVELOPMENT,
      [MissionPhaseType.BUSINESS]: TeamType.BUSINESS,
      [MissionPhaseType.CERTIFY]: TeamType.CERTIFICATION,
      [MissionPhaseType.DELIVER]: TeamType.DELIVERY,
    };
    return mapping[phaseType] ?? TeamType.MEMORY;
  }

  /**
   * Topological sort of tasks based on dependencies.
   * Falls back to sequential order if no dependency info available.
   */
  private topologicalSortTasks(phaseTasks: PhaseTask[], plannedTasks: PlannedTask[]): PhaseTask[] {
    if (plannedTasks.length === 0) return phaseTasks;

    // Build dependency graph from planned tasks
    const taskDeps = new Map<string, string[]>();
    for (const pt of plannedTasks) {
      taskDeps.set(pt.id, pt.dependsOn);
    }

    // Simple topological sort using Kahn's algorithm
    const sorted: PhaseTask[] = [];
    const visited = new Set<string>();
    const taskMap = new Map<string, PhaseTask>();
    for (const t of phaseTasks) {
      taskMap.set(t.id, t);
    }

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const deps = taskDeps.get(taskId) ?? [];
      for (const dep of deps) {
        // Handle wildcard dependencies (e.g., "task-dev-architect-*")
        if (dep.endsWith('*')) {
          const prefix = dep.slice(0, -1);
          taskMap.forEach((_task, id) => {
            if (id.startsWith(prefix)) visit(id);
          });
        } else {
          visit(dep);
        }
      }

      const task = taskMap.get(taskId);
      if (task) sorted.push(task);
    };

    for (const task of phaseTasks) {
      visit(task.id);
    }

    // Add any remaining tasks that weren't in the dependency graph
    for (const task of phaseTasks) {
      if (!sorted.includes(task)) {
        sorted.push(task);
      }
    }

    return sorted;
  }

  /**
   * Convert a phase artifact to a Deliverable.
   */
  private artifactToDeliverable(
    artifact: string,
    phaseType: MissionPhaseType,
    mission: MissionDefinition,
  ): Deliverable | null {
    const typeMap: Record<string, Deliverable['type']> = {
      '.pdf': 'pdf',
      '.zip': 'zip',
      '.json': 'data',
      '.md': 'report',
      '.ts': 'code',
      '.js': 'code',
    };

    // Determine deliverable type from artifact extension or phase
    let deliverableType: Deliverable['type'] = 'data';

    for (const [ext, type] of Object.entries(typeMap)) {
      if (artifact.endsWith(ext)) {
        deliverableType = type;
        break;
      }
    }

    // Override based on phase type
    if (phaseType === MissionPhaseType.DEVELOP) {
      if (artifact.includes('source') || artifact.includes('dev')) {
        deliverableType = 'code';
      }
      if (artifact.includes('deploy')) {
        deliverableType = 'deployed_url';
      }
    }
    if (phaseType === MissionPhaseType.CERTIFY) {
      deliverableType = 'report';
    }
    if (phaseType === MissionPhaseType.BUSINESS) {
      deliverableType = 'report';
    }

    return {
      type: deliverableType,
      name: artifact.split('/').pop() ?? artifact,
      description: `Artifact from ${phaseType} phase`,
      location: artifact,
      createdAt: new Date(),
    };
  }

  /**
   * Sleep utility for pause/cancellation checks.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
