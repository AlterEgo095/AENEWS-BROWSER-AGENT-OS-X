"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionPlannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionPlannerService = exports.TaskStatus = exports.TaskPriority = exports.PhaseType = void 0;
const common_1 = require("@nestjs/common");
const mission_orchestrator_service_1 = require("./mission-orchestrator.service");
var PhaseType;
(function (PhaseType) {
    PhaseType["PLANNING"] = "PLANNING";
    PhaseType["BROWSER"] = "BROWSER";
    PhaseType["DEVELOPMENT"] = "DEVELOPMENT";
    PhaseType["BUSINESS"] = "BUSINESS";
    PhaseType["CERTIFICATION"] = "CERTIFICATION";
    PhaseType["DELIVERY"] = "DELIVERY";
})(PhaseType || (exports.PhaseType = PhaseType = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "LOW";
    TaskPriority["MEDIUM"] = "MEDIUM";
    TaskPriority["HIGH"] = "HIGH";
    TaskPriority["CRITICAL"] = "CRITICAL";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["READY"] = "READY";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["FAILED"] = "FAILED";
    TaskStatus["SKIPPED"] = "SKIPPED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
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
let MissionPlannerService = MissionPlannerService_1 = class MissionPlannerService {
    constructor() {
        this.logger = new common_1.Logger(MissionPlannerService_1.name);
        this.plans = new Map();
        this.idCounter = 0;
    }
    createPlan(instruction, context) {
        const id = this.generateId('plan');
        const instructionLower = instruction.toLowerCase();
        const needsBrowser = this.containsKeywords(instructionLower, BROWSER_KEYWORDS);
        const needsDevelopment = this.containsKeywords(instructionLower, DEVELOPMENT_KEYWORDS);
        const needsBusiness = this.containsKeywords(instructionLower, BUSINESS_KEYWORDS);
        const needsResearchBeforeDev = this.containsKeywords(instructionLower, RESEARCH_BEFORE_DEV_KEYWORDS);
        const complexity = this.estimateComplexity(instruction);
        const requiredTeams = this.identifyRequiredTeams(instruction);
        const phases = [];
        phases.push({
            type: PhaseType.PLANNING,
            team: mission_orchestrator_service_1.TeamType.MEMORY,
            tasks: [],
            status: TaskStatus.PENDING,
            estimatedDurationMs: 5_000,
            dependsOn: [],
        });
        if (needsBrowser || (needsResearchBeforeDev && needsDevelopment)) {
            phases.push({
                type: PhaseType.BROWSER,
                team: mission_orchestrator_service_1.TeamType.BROWSER,
                tasks: [],
                status: TaskStatus.PENDING,
                estimatedDurationMs: 30_000,
                dependsOn: [PhaseType.PLANNING],
            });
        }
        if (needsDevelopment) {
            const devDepends = [PhaseType.PLANNING];
            if (phases.some((p) => p.type === PhaseType.BROWSER)) {
                devDepends.push(PhaseType.BROWSER);
            }
            phases.push({
                type: PhaseType.DEVELOPMENT,
                team: mission_orchestrator_service_1.TeamType.DEVELOPMENT,
                tasks: [],
                status: TaskStatus.PENDING,
                estimatedDurationMs: 120_000 * (complexity.score / 30 + 0.5),
                dependsOn: devDepends,
            });
        }
        if (needsBusiness) {
            phases.push({
                type: PhaseType.BUSINESS,
                team: mission_orchestrator_service_1.TeamType.BUSINESS,
                tasks: [],
                status: TaskStatus.PENDING,
                estimatedDurationMs: 60_000,
                dependsOn: [PhaseType.PLANNING],
            });
        }
        phases.push({
            type: PhaseType.CERTIFICATION,
            team: mission_orchestrator_service_1.TeamType.CERTIFICATION,
            tasks: [],
            status: TaskStatus.PENDING,
            estimatedDurationMs: 20_000,
            dependsOn: phases.filter((p) => p.type !== PhaseType.PLANNING).map((p) => p.type),
        });
        phases.push({
            type: PhaseType.DELIVERY,
            team: mission_orchestrator_service_1.TeamType.DELIVERY,
            tasks: [],
            status: TaskStatus.PENDING,
            estimatedDurationMs: 10_000,
            dependsOn: [PhaseType.CERTIFICATION],
        });
        const allTasks = [];
        for (const phase of phases) {
            const tasks = this.decomposeIntoTasks(instruction, phase.team);
            phase.tasks = tasks;
            allTasks.push(...tasks);
        }
        const dependencies = this.buildDependencyGraph(phases, allTasks);
        const totalEstimatedDurationMs = phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);
        const plan = {
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
        this.logger.log(`Created plan "${id}": ${phases.length} phases, ${allTasks.length} tasks, ` +
            `complexity=${complexity.level}(${complexity.score}), duration≈${totalEstimatedDurationMs}ms`);
        return plan;
    }
    estimateComplexity(instruction) {
        const lower = instruction.toLowerCase();
        let score = 0;
        const reasons = [];
        const domainHits = [
            this.containsKeywords(lower, BROWSER_KEYWORDS),
            this.containsKeywords(lower, DEVELOPMENT_KEYWORDS),
            this.containsKeywords(lower, BUSINESS_KEYWORDS),
        ].filter(Boolean).length;
        if (domainHits >= 3) {
            score += 30;
            reasons.push('multi-domain instruction (browser+dev+business)');
        }
        else if (domainHits === 2) {
            score += 15;
            reasons.push('cross-domain instruction');
        }
        else if (domainHits === 1) {
            score += 5;
            reasons.push('single-domain instruction');
        }
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
        const wordCount = instruction.split(/\s+/).length;
        if (wordCount > 50) {
            score += 15;
            reasons.push('long instruction (50+ words)');
        }
        else if (wordCount > 25) {
            score += 8;
            reasons.push('medium-length instruction');
        }
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
        score = Math.max(0, Math.min(100, score));
        let level;
        if (score <= 10)
            level = 'TRIVIAL';
        else if (score <= 25)
            level = 'SIMPLE';
        else if (score <= 50)
            level = 'MODERATE';
        else if (score <= 75)
            level = 'COMPLEX';
        else
            level = 'EPIC';
        return {
            score,
            level,
            reasoning: reasons.join('; '),
        };
    }
    identifyRequiredTeams(instruction) {
        const lower = instruction.toLowerCase();
        const teams = new Set();
        teams.add(mission_orchestrator_service_1.TeamType.MEMORY);
        if (this.containsKeywords(lower, BROWSER_KEYWORDS)) {
            teams.add(mission_orchestrator_service_1.TeamType.BROWSER);
        }
        if (this.containsKeywords(lower, DEVELOPMENT_KEYWORDS)) {
            teams.add(mission_orchestrator_service_1.TeamType.DEVELOPMENT);
        }
        if (this.containsKeywords(lower, BUSINESS_KEYWORDS)) {
            teams.add(mission_orchestrator_service_1.TeamType.BUSINESS);
        }
        teams.add(mission_orchestrator_service_1.TeamType.CERTIFICATION);
        teams.add(mission_orchestrator_service_1.TeamType.DELIVERY);
        if (teams.size <= 3) {
            teams.add(mission_orchestrator_service_1.TeamType.BROWSER);
        }
        return [...teams];
    }
    decomposeIntoTasks(instruction, team) {
        const lower = instruction.toLowerCase();
        const tasks = [];
        switch (team) {
            case mission_orchestrator_service_1.TeamType.BROWSER:
                tasks.push(this.createTask('research', "Recherche et collecte d'informations", PhaseType.BROWSER, team, TaskPriority.HIGH));
                if (lower.includes('scrape') || lower.includes('extract') || lower.includes('extraire')) {
                    tasks.push(this.createTask('scrape', 'Extraction de données web', PhaseType.BROWSER, team, TaskPriority.HIGH));
                }
                if (lower.includes('monitor') || lower.includes('surveiller')) {
                    tasks.push(this.createTask('monitor', 'Mise en place du monitoring', PhaseType.BROWSER, team, TaskPriority.MEDIUM));
                }
                if (lower.includes('compare') || lower.includes('comparer')) {
                    tasks.push(this.createTask('compare', 'Analyse comparative', PhaseType.BROWSER, team, TaskPriority.MEDIUM));
                }
                break;
            case mission_orchestrator_service_1.TeamType.DEVELOPMENT:
                tasks.push(this.createTask('setup', "Configuration de l'environnement", PhaseType.DEVELOPMENT, team, TaskPriority.HIGH));
                if (lower.includes('api') || lower.includes('backend')) {
                    tasks.push(this.createTask('api', 'Développement API / Backend', PhaseType.DEVELOPMENT, team, TaskPriority.HIGH));
                }
                if (lower.includes('frontend') || lower.includes('ui') || lower.includes('interface')) {
                    tasks.push(this.createTask('frontend', 'Développement Frontend / UI', PhaseType.DEVELOPMENT, team, TaskPriority.HIGH));
                }
                if (lower.includes('database') || lower.includes('base de données')) {
                    tasks.push(this.createTask('database', 'Conception et mise en place base de données', PhaseType.DEVELOPMENT, team, TaskPriority.HIGH));
                }
                if (lower.includes('test') || lower.includes('tester')) {
                    tasks.push(this.createTask('testing', 'Écriture et exécution des tests', PhaseType.DEVELOPMENT, team, TaskPriority.MEDIUM));
                }
                if (lower.includes('deploy') || lower.includes('déployer')) {
                    tasks.push(this.createTask('deploy', 'Déploiement et configuration CI/CD', PhaseType.DEVELOPMENT, team, TaskPriority.MEDIUM));
                }
                if (tasks.length === 1) {
                    tasks.push(this.createTask('implement', 'Implémentation de la solution', PhaseType.DEVELOPMENT, team, TaskPriority.HIGH));
                }
                break;
            case mission_orchestrator_service_1.TeamType.BUSINESS:
                if (lower.includes('seo') || lower.includes('référencement')) {
                    tasks.push(this.createTask('seo', 'Audit et optimisation SEO', PhaseType.BUSINESS, team, TaskPriority.HIGH));
                }
                if (lower.includes('marketing') ||
                    lower.includes('campagne') ||
                    lower.includes('campaign')) {
                    tasks.push(this.createTask('marketing', 'Élaboration de la stratégie marketing', PhaseType.BUSINESS, team, TaskPriority.HIGH));
                }
                if (lower.includes('rapport') || lower.includes('report')) {
                    tasks.push(this.createTask('report', 'Rédaction du rapport / livrable', PhaseType.BUSINESS, team, TaskPriority.MEDIUM));
                }
                if (lower.includes('analytics') || lower.includes('analytics')) {
                    tasks.push(this.createTask('analytics', 'Configuration et analyse des métriques', PhaseType.BUSINESS, team, TaskPriority.MEDIUM));
                }
                if (tasks.length === 0) {
                    tasks.push(this.createTask('strategy', 'Analyse stratégique et recommandations', PhaseType.BUSINESS, team, TaskPriority.MEDIUM));
                }
                break;
            case mission_orchestrator_service_1.TeamType.MEMORY:
                tasks.push(this.createTask('context', 'Chargement du contexte et historique', PhaseType.PLANNING, team, TaskPriority.HIGH));
                tasks.push(this.createTask('store', 'Stockage des résultats intermédiaires', PhaseType.PLANNING, team, TaskPriority.MEDIUM));
                break;
            case mission_orchestrator_service_1.TeamType.CERTIFICATION:
                tasks.push(this.createTask('validate', 'Validation et tests de conformité', PhaseType.CERTIFICATION, team, TaskPriority.HIGH));
                tasks.push(this.createTask('quality', 'Contrôle qualité et revue finale', PhaseType.CERTIFICATION, team, TaskPriority.HIGH));
                break;
            case mission_orchestrator_service_1.TeamType.DELIVERY:
                tasks.push(this.createTask('package', 'Packaging et préparation de la livraison', PhaseType.DELIVERY, team, TaskPriority.HIGH));
                tasks.push(this.createTask('deliver', 'Livraison finale et documentation', PhaseType.DELIVERY, team, TaskPriority.HIGH));
                break;
        }
        for (let i = 1; i < tasks.length; i++) {
            tasks[i].dependencies.push(tasks[i - 1].id);
        }
        return tasks;
    }
    buildDependencyGraph(phases, tasks) {
        const deps = {};
        for (const task of tasks) {
            deps[task.id] = [...task.dependencies];
        }
        const phaseTaskMap = new Map();
        for (const task of tasks) {
            if (!phaseTaskMap.has(task.phase)) {
                phaseTaskMap.set(task.phase, []);
            }
            phaseTaskMap.get(task.phase).push(task);
        }
        for (const phase of phases) {
            const phaseTasks = phaseTaskMap.get(phase.type) ?? [];
            if (phaseTasks.length === 0)
                continue;
            const firstTask = phaseTasks[0];
            for (const depPhase of phase.dependsOn) {
                const depPhaseTasks = phaseTaskMap.get(depPhase) ?? [];
                if (depPhaseTasks.length === 0)
                    continue;
                const lastDepTask = depPhaseTasks[depPhaseTasks.length - 1];
                if (!firstTask.dependencies.includes(lastDepTask.id)) {
                    firstTask.dependencies.push(lastDepTask.id);
                    deps[firstTask.id].push(lastDepTask.id);
                }
            }
        }
        return deps;
    }
    getPlan(missionId) {
        return this.plans.get(missionId) ?? null;
    }
    getAllPlans() {
        return [...this.plans.values()];
    }
    updatePlan(planId, updates) {
        const plan = this.plans.get(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }
        Object.assign(plan, updates, { updatedAt: new Date() });
        this.logger.log(`Updated plan "${planId}"`);
        return plan;
    }
    containsKeywords(text, keywords) {
        return keywords.some((kw) => text.includes(kw.toLowerCase()));
    }
    createTask(slug, description, phase, team, priority) {
        const id = this.generateId(`task_${slug}`);
        const durationBase = {
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
    generateId(prefix) {
        this.idCounter++;
        return `${prefix}_${Date.now()}_${this.idCounter}`;
    }
};
exports.MissionPlannerService = MissionPlannerService;
exports.MissionPlannerService = MissionPlannerService = MissionPlannerService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionPlannerService);
//# sourceMappingURL=mission-planner.service.js.map