"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionOrchestratorService = exports.MissionPhaseType = exports.TeamType = exports.MissionStatus = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
var MissionStatus;
(function (MissionStatus) {
    MissionStatus["RECEIVED"] = "received";
    MissionStatus["PLANNING"] = "planning";
    MissionStatus["EXECUTING"] = "executing";
    MissionStatus["CERTIFYING"] = "certifying";
    MissionStatus["DELIVERING"] = "delivering";
    MissionStatus["COMPLETED"] = "completed";
    MissionStatus["FAILED"] = "failed";
    MissionStatus["CANCELLED"] = "cancelled";
    MissionStatus["PAUSED"] = "paused";
})(MissionStatus || (exports.MissionStatus = MissionStatus = {}));
var TeamType;
(function (TeamType) {
    TeamType["BROWSER"] = "browser";
    TeamType["DEVELOPMENT"] = "development";
    TeamType["BUSINESS"] = "business";
    TeamType["MEMORY"] = "memory";
    TeamType["CERTIFICATION"] = "certification";
    TeamType["DELIVERY"] = "delivery";
})(TeamType || (exports.TeamType = TeamType = {}));
var MissionPhaseType;
(function (MissionPhaseType) {
    MissionPhaseType["PLAN"] = "plan";
    MissionPhaseType["BROWSER"] = "browser";
    MissionPhaseType["DEVELOP"] = "develop";
    MissionPhaseType["BUSINESS"] = "business";
    MissionPhaseType["CERTIFY"] = "certify";
    MissionPhaseType["DELIVER"] = "deliver";
})(MissionPhaseType || (exports.MissionPhaseType = MissionPhaseType = {}));
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
const CERTIFICATION_DOMAINS = [
    'completeness',
    'quality',
    'security',
    'performance',
    'reliability',
    'documentation',
    'test_coverage',
];
const VALID_TRANSITIONS = {
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
let MissionOrchestratorService = MissionOrchestratorService_1 = class MissionOrchestratorService {
    constructor() {
        this.logger = new common_1.Logger(MissionOrchestratorService_1.name);
        this.missions = new Map();
        this.missionEvents = new Map();
        this.cancelledMissions = new Set();
        this.pausedMissions = new Set();
        this.repairAttempts = new Map();
    }
    async submitMission(input) {
        const missionId = (0, uuid_1.v4)();
        this.logger.log(`🎯 Mission RECEIVED [${missionId}]: "${input.instruction.substring(0, 120)}..."`);
        const mission = {
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
        this.executePipeline(missionId).catch((error) => {
            this.logger.error(`Pipeline crashed for mission ${missionId}: ${error.message}`, error.stack);
        });
        return missionId;
    }
    async planMission(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        const instruction = mission.instruction.toLowerCase();
        this.logger.log(`📋 Planning mission ${missionId}...`);
        this.transitionStatus(mission, MissionStatus.PLANNING);
        this.emitEvent(missionId, 'mission.planning', { instruction: mission.instruction });
        const needsBrowser = BROWSER_KEYWORDS.some((kw) => instruction.includes(kw));
        const needsDevelopment = DEVELOPMENT_KEYWORDS.some((kw) => instruction.includes(kw));
        const needsBusiness = BUSINESS_KEYWORDS.some((kw) => instruction.includes(kw));
        const needsMemory = true;
        const needsCertification = true;
        const needsDelivery = true;
        const requiredTeams = [TeamType.MEMORY];
        if (needsBrowser)
            requiredTeams.push(TeamType.BROWSER);
        if (needsDevelopment)
            requiredTeams.push(TeamType.DEVELOPMENT);
        if (needsBusiness)
            requiredTeams.push(TeamType.BUSINESS);
        requiredTeams.push(TeamType.CERTIFICATION, TeamType.DELIVERY);
        const phases = [];
        const dependencies = [];
        const planPhaseId = `phase-${MissionPhaseType.PLAN}-${(0, uuid_1.v4)().substring(0, 8)}`;
        phases.push({
            id: planPhaseId,
            type: MissionPhaseType.PLAN,
            team: TeamType.MEMORY,
            description: `Analyze instruction and create execution plan for: "${mission.instruction.substring(0, 100)}"`,
            tasks: [
                {
                    id: `task-plan-analyze-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'analyze_instruction',
                    description: 'Analyze the natural language instruction and extract requirements',
                    input: { instruction: mission.instruction, context: mission.metadata.context },
                    dependsOn: [],
                },
                {
                    id: `task-plan-context-${(0, uuid_1.v4)().substring(0, 8)}`,
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
        if (needsBrowser) {
            const browserPhaseId = `phase-${MissionPhaseType.BROWSER}-${(0, uuid_1.v4)().substring(0, 8)}`;
            const browserTasks = [
                {
                    id: `task-browser-search-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'navigate',
                    description: 'Search the web for relevant information and resources',
                    input: { instruction: mission.instruction, action: 'search' },
                    dependsOn: [],
                },
                {
                    id: `task-browser-scrape-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'data_extraction',
                    description: 'Extract and collect relevant data from web sources',
                    input: { instruction: mission.instruction, action: 'scrape' },
                    dependsOn: [],
                },
                {
                    id: `task-browser-research-${(0, uuid_1.v4)().substring(0, 8)}`,
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
        if (needsBusiness) {
            const businessPhaseId = `phase-${MissionPhaseType.BUSINESS}-${(0, uuid_1.v4)().substring(0, 8)}`;
            const businessTasks = [
                {
                    id: `task-biz-analysis-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'analyze',
                    description: 'Perform business analysis and market research',
                    input: { instruction: mission.instruction, action: 'analyze' },
                    dependsOn: [],
                },
                {
                    id: `task-biz-strategy-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'strategy',
                    description: 'Develop business strategy and recommendations',
                    input: { instruction: mission.instruction, action: 'strategy' },
                    dependsOn: [],
                },
                {
                    id: `task-biz-report-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'report',
                    description: 'Generate business report and insights',
                    input: { instruction: mission.instruction, action: 'report' },
                    dependsOn: [],
                },
            ];
            const businessDependsOn = needsBrowser ? [lastPhaseId] : [planPhaseId];
            phases.push({
                id: businessPhaseId,
                type: MissionPhaseType.BUSINESS,
                team: TeamType.BUSINESS,
                description: 'Business analysis and strategy phase',
                tasks: businessTasks,
                dependsOn: businessDependsOn,
                parallel: !needsBrowser,
                estimatedDurationMs: 30_000,
            });
            for (const dep of businessDependsOn) {
                dependencies.push({ from: dep, to: businessPhaseId });
            }
            if (!needsDevelopment) {
                lastPhaseId = businessPhaseId;
            }
        }
        if (needsDevelopment) {
            const developPhaseId = `phase-${MissionPhaseType.DEVELOP}-${(0, uuid_1.v4)().substring(0, 8)}`;
            const developTasks = [
                {
                    id: `task-dev-architect-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'generate_code',
                    description: 'Design system architecture and generate project structure',
                    input: { instruction: mission.instruction, action: 'architect' },
                    dependsOn: [],
                },
                {
                    id: `task-dev-code-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'generate_code',
                    description: 'Generate application code based on architecture',
                    input: { instruction: mission.instruction, action: 'implement' },
                    dependsOn: [`task-dev-architect-*`],
                },
                {
                    id: `task-dev-test-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'test',
                    description: 'Generate and run tests for the application',
                    input: { instruction: mission.instruction, action: 'test' },
                    dependsOn: [],
                },
                {
                    id: `task-dev-docs-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'documentation',
                    description: 'Generate documentation for the application',
                    input: { instruction: mission.instruction, action: 'document' },
                    dependsOn: [],
                },
                {
                    id: `task-dev-deploy-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'deploy',
                    description: 'Deploy the application to target environment',
                    input: { instruction: mission.instruction, action: 'deploy' },
                    dependsOn: [],
                },
            ];
            const developDependsOn = needsBrowser ? [lastPhaseId] : [planPhaseId];
            phases.push({
                id: developPhaseId,
                type: MissionPhaseType.DEVELOP,
                team: TeamType.DEVELOPMENT,
                description: 'Software development and deployment phase',
                tasks: developTasks,
                dependsOn: developDependsOn,
                parallel: false,
                estimatedDurationMs: 120_000,
            });
            for (const dep of developDependsOn) {
                dependencies.push({ from: dep, to: developPhaseId });
            }
            lastPhaseId = developPhaseId;
        }
        const certifyPhaseId = `phase-${MissionPhaseType.CERTIFY}-${(0, uuid_1.v4)().substring(0, 8)}`;
        phases.push({
            id: certifyPhaseId,
            type: MissionPhaseType.CERTIFY,
            team: TeamType.CERTIFICATION,
            description: 'Certification and quality assurance phase',
            tasks: [
                {
                    id: `task-cert-quality-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'certify_quality',
                    description: 'Run quality certification checks on all deliverables',
                    input: { instruction: mission.instruction, action: 'certify_quality' },
                    dependsOn: [],
                },
                {
                    id: `task-cert-security-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'certify_security',
                    description: 'Run security certification checks',
                    input: { instruction: mission.instruction, action: 'certify_security' },
                    dependsOn: [],
                },
                {
                    id: `task-cert-completeness-${(0, uuid_1.v4)().substring(0, 8)}`,
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
        const deliverPhaseId = `phase-${MissionPhaseType.DELIVER}-${(0, uuid_1.v4)().substring(0, 8)}`;
        phases.push({
            id: deliverPhaseId,
            type: MissionPhaseType.DELIVER,
            team: TeamType.DELIVERY,
            description: 'Packaging and delivery of final results',
            tasks: [
                {
                    id: `task-deliver-package-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentCapability: 'package',
                    description: 'Package all artifacts and deliverables',
                    input: { instruction: mission.instruction, action: 'package' },
                    dependsOn: [],
                },
                {
                    id: `task-deliver-handoff-${(0, uuid_1.v4)().substring(0, 8)}`,
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
        const totalEstimatedDurationMs = phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);
        const costPerTeam = {
            [TeamType.BROWSER]: 0.05,
            [TeamType.DEVELOPMENT]: 0.25,
            [TeamType.BUSINESS]: 0.1,
            [TeamType.MEMORY]: 0.02,
            [TeamType.CERTIFICATION]: 0.08,
            [TeamType.DELIVERY]: 0.03,
        };
        const estimatedCost = requiredTeams.reduce((sum, team) => sum + (costPerTeam[team] ?? 0), 0);
        const plan = {
            missionId,
            phases,
            estimatedDurationMs: totalEstimatedDurationMs,
            estimatedCost,
            requiredTeams,
            dependencies,
        };
        mission.plan = plan;
        mission.phases = phases.map((pp) => ({
            type: pp.type,
            status: 'pending',
            startedAt: null,
            completedAt: null,
            tasks: pp.tasks.map((pt) => ({
                id: pt.id,
                capability: pt.agentCapability,
                status: 'pending',
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
        this.logger.log(`✅ Mission ${missionId} planned: ${phases.length} phases, ` +
            `teams: [${requiredTeams.join(', ')}], ` +
            `est. ${totalEstimatedDurationMs}ms, $${estimatedCost.toFixed(2)}`);
        return plan;
    }
    async executeMission(missionId) {
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
            if (this.cancelledMissions.has(missionId)) {
                this.transitionStatus(mission, MissionStatus.CANCELLED);
                this.emitEvent(missionId, 'mission.cancelled', {
                    reason: 'User cancelled during execution',
                });
                return;
            }
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
            this.logger.log(`⚙️  Phase [${i + 1}/${phases.length}] ${plannedPhase.type} — ${plannedPhase.description}`);
            this.emitEvent(missionId, 'mission.phase_started', {
                phase: plannedPhase.type,
                phaseIndex: i + 1,
                totalPhases: phases.length,
            });
            try {
                await this.executePhase(missionId, plannedPhase.type);
                const result = mission.results.get(plannedPhase.type);
                if (result && !result.success) {
                    this.logger.warn(`⚠️  Phase ${plannedPhase.type} failed, attempting repair...`);
                    const repaired = await this.attemptRepair(missionId, plannedPhase.type);
                    if (!repaired) {
                        this.logger.error(`❌ Phase ${plannedPhase.type} failed after repair attempt. Mission FAILED.`);
                        mission.error = `Phase ${plannedPhase.type} failed and could not be repaired`;
                        this.transitionStatus(mission, MissionStatus.FAILED);
                        this.emitEvent(missionId, 'mission.failed', {
                            phase: plannedPhase.type,
                            error: mission.error,
                        });
                        return;
                    }
                }
            }
            catch (error) {
                this.logger.error(`❌ Phase ${plannedPhase.type} threw error: ${error.message}`);
                const repaired = await this.attemptRepair(missionId, plannedPhase.type);
                if (!repaired) {
                    mission.error = `Phase ${plannedPhase.type} failed: ${error.message}`;
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
    async executePhase(missionId, phaseType) {
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
        const team = plannedPhase?.team ?? this.inferTeamForPhase(phaseType);
        this.logger.log(`🔀 Delegating phase ${phaseType} to ${team} team ` +
            `(${phaseRecord.tasks.length} tasks, parallel: ${plannedPhase?.parallel ?? false})`);
        const isParallel = plannedPhase?.parallel ?? false;
        if (isParallel) {
            const taskPromises = phaseRecord.tasks.map((task) => this.executeTask(missionId, task, team));
            await Promise.allSettled(taskPromises);
        }
        else {
            const sortedTasks = this.topologicalSortTasks(phaseRecord.tasks, plannedPhase?.tasks ?? []);
            for (const task of sortedTasks) {
                if (this.cancelledMissions.has(missionId))
                    break;
                while (this.pausedMissions.has(missionId)) {
                    await this.sleep(500);
                }
                await this.executeTask(missionId, task, team);
            }
        }
        const allCompleted = phaseRecord.tasks.every((t) => t.status === 'completed');
        const anyFailed = phaseRecord.tasks.some((t) => t.status === 'failed');
        const durationMs = Date.now() - phaseStart;
        const artifacts = phaseRecord.tasks
            .filter((t) => t.status === 'completed' && t.result)
            .map((t) => t.result?.artifact ?? t.result?.location ?? `task-${t.id}`)
            .filter(Boolean);
        const result = {
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
    async certifyMission(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        this.transitionStatus(mission, MissionStatus.CERTIFYING);
        this.emitEvent(missionId, 'mission.certifying', {});
        this.logger.log(`🔒 Certifying mission ${missionId}...`);
        const domains = [];
        const allPhasesCompleted = mission.phases.every((p) => p.status === 'completed');
        const totalTasks = mission.phases.reduce((sum, p) => sum + p.tasks.length, 0);
        const completedTasks = mission.phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === 'completed').length, 0);
        const completenessScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        domains.push({
            name: 'completeness',
            score: completenessScore,
            passed: completenessScore >= 80,
            details: `${completedTasks}/${totalTasks} tasks completed. All phases ${allPhasesCompleted ? 'completed' : 'incomplete'}.`,
        });
        const avgTaskQuality = this.computeAverageQuality(mission);
        domains.push({
            name: 'quality',
            score: avgTaskQuality,
            passed: avgTaskQuality >= 70,
            details: `Average quality score across all completed tasks: ${avgTaskQuality}/100`,
        });
        const securityScore = this.assessSecurity(mission);
        domains.push({
            name: 'security',
            score: securityScore,
            passed: securityScore >= 75,
            details: `Security assessment score: ${securityScore}/100`,
        });
        const resultEntries = [];
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
        const failedPhases = mission.phases.filter((p) => p.status === 'failed').length;
        const totalPhases = mission.phases.length;
        const reliabilityScore = totalPhases > 0 ? Math.round(((totalPhases - failedPhases) / totalPhases) * 100) : 100;
        domains.push({
            name: 'reliability',
            score: reliabilityScore,
            passed: reliabilityScore >= 80,
            details: `${failedPhases}/${totalPhases} phases failed. ${this.repairAttempts.get(missionId) ?? 0} repairs attempted.`,
        });
        const hasDocs = mission.results.has(MissionPhaseType.DEVELOP) &&
            mission.phases.some((p) => p.tasks.some((t) => t.capability === 'documentation' && t.status === 'completed'));
        const docScore = hasDocs ? 85 : 40;
        domains.push({
            name: 'documentation',
            score: docScore,
            passed: docScore >= 60,
            details: hasDocs
                ? 'Documentation task completed as part of development phase'
                : 'No documentation task found or completed',
        });
        const hasTests = mission.phases.some((p) => p.tasks.some((t) => (t.capability === 'test' || t.capability === 'certify_quality') &&
            t.status === 'completed'));
        const testScore = hasTests ? 80 : 30;
        domains.push({
            name: 'test_coverage',
            score: testScore,
            passed: testScore >= 60,
            details: hasTests
                ? 'Testing tasks were executed as part of the mission'
                : 'No testing tasks were executed',
        });
        const weights = {
            completeness: 0.2,
            quality: 0.2,
            security: 0.15,
            performance: 0.1,
            reliability: 0.15,
            documentation: 0.1,
            test_coverage: 0.1,
        };
        const overallScore = Math.round(domains.reduce((sum, d) => sum + d.score * (weights[d.name] ?? 1 / domains.length), 0));
        const allPassed = domains.every((d) => d.passed);
        const criticalPassed = domains
            .filter((d) => ['completeness', 'security', 'reliability'].includes(d.name))
            .every((d) => d.passed);
        const report = {
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
        this.logger.log(`${report.passed ? '✅' : '⚠️ '} Mission ${missionId} certified: ` +
            `score=${overallScore}, passed=${report.passed}`);
        return report;
    }
    async deliverMission(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        this.transitionStatus(mission, MissionStatus.DELIVERING);
        this.emitEvent(missionId, 'mission.delivering', {});
        this.logger.log(`📦 Delivering mission ${missionId}...`);
        const deliverables = [];
        const phaseResults = [];
        mission.results.forEach((result, phaseType) => {
            phaseResults.push([phaseType, result]);
        });
        for (const [phaseKey, result] of phaseResults) {
            const phaseType = phaseKey;
            for (const artifact of result.artifacts) {
                const deliverable = this.artifactToDeliverable(artifact, phaseType, mission);
                if (deliverable) {
                    deliverables.push(deliverable);
                }
            }
        }
        if (mission.certificationReport) {
            deliverables.push({
                type: 'report',
                name: `certification-report-${missionId.substring(0, 8)}.pdf`,
                description: `Certification report for mission ${missionId}. Overall score: ${mission.certificationReport.overallScore}/100`,
                location: `/missions/${missionId}/certification-report.pdf`,
                createdAt: new Date(),
            });
        }
        deliverables.push({
            type: 'report',
            name: `mission-summary-${missionId.substring(0, 8)}.md`,
            description: `Mission summary: "${mission.instruction.substring(0, 80)}" — ${mission.phases.length} phases, ${deliverables.length} deliverables`,
            location: `/missions/${missionId}/summary.md`,
            createdAt: new Date(),
        });
        if (mission.results.has(MissionPhaseType.DEVELOP)) {
            const devResult = mission.results.get(MissionPhaseType.DEVELOP);
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
                    location: devResult.output?.find?.((o) => o.capability === 'deploy')?.result?.url ??
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
        this.logger.log(`📬 Mission ${missionId} delivered: ${deliverables.length} deliverables ` +
            `[${deliverables.map((d) => d.type).join(', ')}]`);
        return deliverables;
    }
    getMission(missionId) {
        return this.missions.get(missionId) ?? null;
    }
    getMissionStatus(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission)
            return null;
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
    async cancelMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission)
            return false;
        const cancellableStatuses = [
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
        this.pausedMissions.delete(missionId);
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
    async pauseMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission)
            return false;
        if (mission.status !== MissionStatus.EXECUTING) {
            this.logger.warn(`Cannot pause mission ${missionId} in status ${mission.status}`);
            return false;
        }
        this.pausedMissions.add(missionId);
        const previousStatus = mission.status;
        mission.status = MissionStatus.PAUSED;
        this.emitEvent(missionId, 'mission.paused', {
            previousStatus,
            currentPhase: mission.currentPhase,
        });
        this.logger.log(`⏸️  Mission ${missionId} paused at phase ${mission.currentPhase}`);
        return true;
    }
    async resumeMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission)
            return false;
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
    getMissionHistory(userId, limit = 50) {
        let missions = Array.from(this.missions.values());
        if (userId) {
            missions = missions.filter((m) => m.metadata.userId === userId);
        }
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
    getMissionStats() {
        const missions = Array.from(this.missions.values());
        const totalMissions = missions.length;
        const byStatus = {};
        for (const status of Object.values(MissionStatus)) {
            byStatus[status] = missions.filter((m) => m.status === status).length;
        }
        const byPriority = {};
        for (const m of missions) {
            const p = m.metadata.priority ?? 'normal';
            byPriority[p] = (byPriority[p] ?? 0) + 1;
        }
        const completedMissions = missions.filter((m) => m.status === MissionStatus.COMPLETED && m.startedAt && m.completedAt);
        const averageDurationMs = completedMissions.length > 0
            ? Math.round(completedMissions.reduce((sum, m) => {
                return sum + (m.completedAt.getTime() - m.startedAt.getTime());
            }, 0) / completedMissions.length)
            : 0;
        const terminalMissions = missions.filter((m) => [MissionStatus.COMPLETED, MissionStatus.FAILED].includes(m.status));
        const successRate = terminalMissions.length > 0
            ? Math.round((terminalMissions.filter((m) => m.status === MissionStatus.COMPLETED).length /
                terminalMissions.length) *
                100) / 100
            : 0;
        const totalDeliverables = missions.reduce((sum, m) => sum + m.deliverables.length, 0);
        const certifiedMissions = missions.filter((m) => m.certificationReport !== null);
        const totalCertifications = certifiedMissions.length;
        const averageCertificationScore = certifiedMissions.length > 0
            ? Math.round(certifiedMissions.reduce((sum, m) => sum + m.certificationReport.overallScore, 0) /
                certifiedMissions.length)
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
    async executePipeline(missionId) {
        try {
            await this.planMission(missionId);
            if (this.cancelledMissions.has(missionId))
                return;
            await this.executeMission(missionId);
            if (this.cancelledMissions.has(missionId))
                return;
            const mission = this.missions.get(missionId);
            if (mission.status === MissionStatus.FAILED)
                return;
            await this.certifyMission(missionId);
            if (this.cancelledMissions.has(missionId))
                return;
            await this.deliverMission(missionId);
            const finalMission = this.missions.get(missionId);
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
                this.logger.log(`🎉 Mission ${missionId} COMPLETED in ${totalDuration}ms ` +
                    `with ${finalMission.deliverables.length} deliverables ` +
                    `(certification: ${finalMission.certificationReport?.overallScore ?? 'N/A'})`);
            }
        }
        catch (error) {
            const mission = this.missions.get(missionId);
            if (mission && mission.status !== MissionStatus.CANCELLED) {
                mission.status = MissionStatus.FAILED;
                mission.error = error.message;
                mission.completedAt = new Date();
                this.emitEvent(missionId, 'mission.failed', {
                    error: error.message,
                    stack: error.stack,
                });
                this.logger.error(`💥 Mission ${missionId} FAILED: ${error.message}`, error.stack);
            }
        }
        finally {
            this.cancelledMissions.delete(missionId);
            this.pausedMissions.delete(missionId);
        }
    }
    async executePlanPhase(mission, phaseRecord) {
        const start = Date.now();
        const artifacts = [];
        for (const task of phaseRecord.tasks) {
            task.status = 'running';
            task.startedAt = new Date();
            task.assignedAgent = `memory-agent-${(0, uuid_1.v4)().substring(0, 8)}`;
            try {
                if (task.capability === 'analyze_instruction') {
                    task.result = {
                        analyzed: true,
                        instruction: mission.instruction,
                        detectedIntents: this.detectIntents(mission.instruction),
                        complexity: this.assessComplexity(mission.instruction),
                        estimatedEffort: this.estimateEffort(mission.instruction),
                    };
                    task.status = 'completed';
                }
                else if (task.capability === 'retrieve_context') {
                    task.result = {
                        contextRetrieved: true,
                        relevantMemories: [],
                        projectContext: mission.metadata.projectId ? { id: mission.metadata.projectId } : null,
                    };
                    task.status = 'completed';
                }
                else {
                    task.result = { completed: true, capability: task.capability };
                    task.status = 'completed';
                }
                task.completedAt = new Date();
                artifacts.push(`plan-${task.capability}-${task.id}`);
            }
            catch (error) {
                task.status = 'failed';
                task.error = error.message;
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
    async executeCertifyPhase(mission, phaseRecord) {
        const start = Date.now();
        const report = await this.certifyMission(mission.id);
        for (const task of phaseRecord.tasks) {
            task.status = 'running';
            task.startedAt = new Date();
            task.assignedAgent = `cert-agent-${(0, uuid_1.v4)().substring(0, 8)}`;
            const domain = report.domains.find((d) => d.name === task.capability.replace('certify_', ''));
            if (domain) {
                task.result = {
                    domain: domain.name,
                    score: domain.score,
                    passed: domain.passed,
                    details: domain.details,
                };
                task.status = domain.passed ? 'completed' : 'failed';
            }
            else {
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
    async executeDeliverPhase(mission, phaseRecord) {
        const start = Date.now();
        const deliverables = await this.deliverMission(mission.id);
        for (const task of phaseRecord.tasks) {
            task.status = 'running';
            task.startedAt = new Date();
            task.assignedAgent = `delivery-agent-${(0, uuid_1.v4)().substring(0, 8)}`;
            if (task.capability === 'package') {
                task.result = {
                    packaged: true,
                    deliverableCount: deliverables.length,
                    types: deliverables.map((d) => d.type),
                };
                task.status = 'completed';
            }
            else if (task.capability === 'deliver') {
                task.result = {
                    delivered: true,
                    deliverables: deliverables.map((d) => ({
                        name: d.name,
                        type: d.type,
                        location: d.location,
                    })),
                };
                task.status = 'completed';
            }
            else {
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
    async executeTask(missionId, task, team) {
        task.status = 'assigned';
        task.assignedAgent = `${team}-agent-${(0, uuid_1.v4)().substring(0, 8)}`;
        task.startedAt = new Date();
        this.emitEvent(missionId, 'task.started', {
            taskId: task.id,
            capability: task.capability,
            team,
            agent: task.assignedAgent,
        });
        try {
            task.status = 'running';
            const result = await this.simulateTaskExecution(task, team);
            task.result = result;
            task.status = 'completed';
            task.completedAt = new Date();
            this.emitEvent(missionId, 'task.completed', {
                taskId: task.id,
                capability: task.capability,
                success: true,
            });
        }
        catch (error) {
            task.status = 'failed';
            task.error = error.message;
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
    async simulateTaskExecution(task, team) {
        const delays = {
            [TeamType.BROWSER]: 2000,
            [TeamType.DEVELOPMENT]: 5000,
            [TeamType.BUSINESS]: 3000,
            [TeamType.MEMORY]: 500,
            [TeamType.CERTIFICATION]: 2000,
            [TeamType.DELIVERY]: 1000,
        };
        await this.sleep(delays[team] ?? 1000);
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
    async attemptRepair(missionId, phaseType) {
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
        this.logger.log(`🔧 Attempting repair for mission ${missionId}, phase ${phaseType} (attempt ${currentAttempts + 1})`);
        try {
            const mission = this.missions.get(missionId);
            const phaseRecord = mission.phases.find((p) => p.type === phaseType);
            if (!phaseRecord)
                return false;
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
            const result = await this.executePhase(missionId, phaseType);
            return result.success;
        }
        catch (error) {
            this.logger.error(`Repair failed for mission ${missionId}: ${error.message}`);
            return false;
        }
    }
    transitionStatus(mission, newStatus) {
        const allowed = VALID_TRANSITIONS[mission.status];
        if (!allowed || !allowed.includes(newStatus)) {
            this.logger.warn(`Invalid status transition: ${mission.status} → ${newStatus} for mission ${mission.id}`);
        }
        const previousStatus = mission.status;
        mission.status = newStatus;
        this.logger.debug?.(`Mission ${mission.id}: ${previousStatus} → ${newStatus}`);
    }
    emitEvent(missionId, type, data) {
        const event = {
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
    detectIntents(instruction) {
        const lower = instruction.toLowerCase();
        const intents = [];
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
        if (intents.length === 0) {
            intents.push('general_execution');
        }
        return intents;
    }
    assessComplexity(instruction) {
        const lower = instruction.toLowerCase();
        let score = 0;
        if (instruction.includes(',') || instruction.includes(' et '))
            score += 1;
        if (lower.includes('saas') || lower.includes('platform'))
            score += 2;
        if (lower.includes('deploy') && lower.includes('test'))
            score += 2;
        if (lower.includes('fullstack') || lower.includes('full-stack'))
            score += 2;
        if (lower.includes('microservice'))
            score += 3;
        if (lower.includes('enterprise') || lower.includes('production'))
            score += 2;
        if (lower.includes('docker') || lower.includes('kubernetes'))
            score += 1;
        if (lower.includes('auth') || lower.includes('authentication'))
            score += 1;
        if (lower.includes('database') || lower.includes('base de données'))
            score += 1;
        if (score >= 8)
            return 'critical';
        if (score >= 5)
            return 'high';
        if (score >= 2)
            return 'medium';
        return 'low';
    }
    estimateEffort(instruction) {
        const complexity = this.assessComplexity(instruction);
        const multipliers = {
            low: { estimatedPhases: 3, estimatedTasks: 5, estimatedDurationMinutes: 2 },
            medium: { estimatedPhases: 4, estimatedTasks: 10, estimatedDurationMinutes: 5 },
            high: { estimatedPhases: 5, estimatedTasks: 18, estimatedDurationMinutes: 10 },
            critical: { estimatedPhases: 6, estimatedTasks: 25, estimatedDurationMinutes: 15 },
        };
        return multipliers[complexity];
    }
    computeAverageQuality(mission) {
        const completedTasks = mission.phases.flatMap((p) => p.tasks.filter((t) => t.status === 'completed'));
        if (completedTasks.length === 0)
            return 0;
        let totalScore = 0;
        for (const task of completedTasks) {
            let score = 85;
            if (task.result && typeof task.result === 'object') {
                score += 5;
            }
            score -= task.retryCount * 10;
            if (task.startedAt && task.completedAt) {
                const duration = task.completedAt.getTime() - task.startedAt.getTime();
                if (duration > 10000)
                    score -= 5;
            }
            totalScore += Math.max(0, Math.min(100, score));
        }
        return Math.round(totalScore / completedTasks.length);
    }
    assessSecurity(mission) {
        let score = 80;
        const hasDev = mission.results.has(MissionPhaseType.DEVELOP);
        if (hasDev) {
            const devResult = mission.results.get(MissionPhaseType.DEVELOP);
            const hasDeploy = mission.phases.some((p) => p.tasks.some((t) => t.capability === 'deploy' && t.status === 'completed'));
            if (hasDeploy) {
                score -= 5;
            }
            const lower = mission.instruction.toLowerCase();
            if (lower.includes('auth') || lower.includes('security')) {
                score += 10;
            }
        }
        const errorCount = mission.phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === 'failed').length, 0);
        score -= errorCount * 5;
        return Math.max(0, Math.min(100, score));
    }
    getMissionOrThrow(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission) {
            throw new Error(`Mission ${missionId} not found`);
        }
        return mission;
    }
    inferTeamForPhase(phaseType) {
        const mapping = {
            [MissionPhaseType.PLAN]: TeamType.MEMORY,
            [MissionPhaseType.BROWSER]: TeamType.BROWSER,
            [MissionPhaseType.DEVELOP]: TeamType.DEVELOPMENT,
            [MissionPhaseType.BUSINESS]: TeamType.BUSINESS,
            [MissionPhaseType.CERTIFY]: TeamType.CERTIFICATION,
            [MissionPhaseType.DELIVER]: TeamType.DELIVERY,
        };
        return mapping[phaseType] ?? TeamType.MEMORY;
    }
    topologicalSortTasks(phaseTasks, plannedTasks) {
        if (plannedTasks.length === 0)
            return phaseTasks;
        const taskDeps = new Map();
        for (const pt of plannedTasks) {
            taskDeps.set(pt.id, pt.dependsOn);
        }
        const sorted = [];
        const visited = new Set();
        const taskMap = new Map();
        for (const t of phaseTasks) {
            taskMap.set(t.id, t);
        }
        const visit = (taskId) => {
            if (visited.has(taskId))
                return;
            visited.add(taskId);
            const deps = taskDeps.get(taskId) ?? [];
            for (const dep of deps) {
                if (dep.endsWith('*')) {
                    const prefix = dep.slice(0, -1);
                    taskMap.forEach((_task, id) => {
                        if (id.startsWith(prefix))
                            visit(id);
                    });
                }
                else {
                    visit(dep);
                }
            }
            const task = taskMap.get(taskId);
            if (task)
                sorted.push(task);
        };
        for (const task of phaseTasks) {
            visit(task.id);
        }
        for (const task of phaseTasks) {
            if (!sorted.includes(task)) {
                sorted.push(task);
            }
        }
        return sorted;
    }
    artifactToDeliverable(artifact, phaseType, mission) {
        const typeMap = {
            '.pdf': 'pdf',
            '.zip': 'zip',
            '.json': 'data',
            '.md': 'report',
            '.ts': 'code',
            '.js': 'code',
        };
        let deliverableType = 'data';
        for (const [ext, type] of Object.entries(typeMap)) {
            if (artifact.endsWith(ext)) {
                deliverableType = type;
                break;
            }
        }
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.MissionOrchestratorService = MissionOrchestratorService;
exports.MissionOrchestratorService = MissionOrchestratorService = MissionOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionOrchestratorService);
//# sourceMappingURL=mission-orchestrator.service.js.map