"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PlanningTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../../interfaces");
const uuid_1 = require("uuid");
let PlanningTeamService = PlanningTeamService_1 = class PlanningTeamService {
    constructor() {
        this.logger = new common_1.Logger(PlanningTeamService_1.name);
        this.plans = new Map();
        this.researchResults = new Map();
    }
    async createPlan(missionId, context, contract) {
        this.logger.log(`Planning team creating plan for mission ${missionId}`);
        const instruction = context.instruction || '';
        const instructionLower = instruction.toLowerCase();
        const requiresBrowser = /site|web|navigate|browser|scrap|facebook|google|url|http/i.test(instruction);
        const requiresCoding = /créer|create|develop|build|saas|app|application|code|api|backend|frontend/i.test(instruction);
        const requiresDocuments = /rapport|report|pdf|document|audit|analyse/i.test(instruction);
        const requiresDeployment = /deploy|déploy|docker|cloud|host|server/i.test(instruction);
        const requiresWebScraping = /scrap|extract|collect|monitor|track/i.test(instruction);
        const requiresDevelopment = requiresCoding || /développ|implement|intégr/i.test(instruction);
        const requiresReports = requiresDocuments || /report|rapport|summary|résumé/i.test(instruction);
        const requiresInfrastructure = requiresDeployment || /infrastructure|server|scaling|monitoring/i.test(instruction);
        const phases = [];
        phases.push({
            id: `phase-${missionId}-research`,
            name: 'Research & Analysis',
            description: `Analyze requirements for: ${instruction}`,
            teamType: interfaces_1.TeamType.PLANNING,
            assignedRoles: [interfaces_1.AgentRole.RESEARCHER, interfaces_1.AgentRole.BUSINESS_ANALYST],
            tasks: [
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: `Research domain knowledge for: ${instruction}`,
                    role: interfaces_1.AgentRole.RESEARCHER,
                    priority: 'high',
                    inputSpec: { instruction, quality: context.quality },
                    expectedOutput: ['domain_research', 'best_practices', 'technology_recommendations'],
                },
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: `Analyze business requirements and constraints`,
                    role: interfaces_1.AgentRole.BUSINESS_ANALYST,
                    priority: 'high',
                    inputSpec: { instruction, budget: context.budget, deadline: context.deadline },
                    expectedOutput: ['requirements_document', 'feasibility_report', 'cost_estimate'],
                },
            ],
            estimatedDurationMs: 30 * 60 * 1000,
            dependsOn: [],
        });
        phases.push({
            id: `phase-${missionId}-architecture`,
            name: 'Architecture Design',
            description: 'Design technical architecture and implementation strategy',
            teamType: interfaces_1.TeamType.PLANNING,
            assignedRoles: [interfaces_1.AgentRole.ARCHITECT],
            tasks: [
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Design system architecture',
                    role: interfaces_1.AgentRole.ARCHITECT,
                    priority: 'critical',
                    inputSpec: { instruction, requirements: '${researchResults}' },
                    expectedOutput: ['architecture_document', 'technology_stack', 'component_diagram'],
                },
            ],
            estimatedDurationMs: 20 * 60 * 1000,
            dependsOn: [phases[0].id],
        });
        if (requiresBrowser || requiresCoding || requiresDocuments || requiresDeployment) {
            const executionRoles = [];
            const executionTasks = [];
            if (requiresBrowser) {
                executionRoles.push(interfaces_1.AgentRole.BROWSER_OPERATOR);
                executionTasks.push({
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Execute browser automation tasks',
                    role: interfaces_1.AgentRole.BROWSER_OPERATOR,
                    priority: 'high',
                    inputSpec: { instruction, urls: [], actions: [] },
                    expectedOutput: ['browser_data', 'screenshots', 'extracted_content'],
                });
            }
            if (requiresCoding) {
                executionRoles.push(interfaces_1.AgentRole.CODER);
                executionTasks.push({
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Implement application code',
                    role: interfaces_1.AgentRole.CODER,
                    priority: 'critical',
                    inputSpec: { instruction, architecture: '${architecture}' },
                    expectedOutput: ['source_code', 'tests', 'configuration'],
                });
            }
            if (requiresDocuments) {
                executionRoles.push(interfaces_1.AgentRole.OFFICE_OPERATOR);
                executionTasks.push({
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Generate documents and reports',
                    role: interfaces_1.AgentRole.OFFICE_OPERATOR,
                    priority: 'high',
                    inputSpec: { instruction, data: '${executionResults}' },
                    expectedOutput: ['pdf_report', 'documentation'],
                });
            }
            if (requiresDeployment) {
                executionRoles.push(interfaces_1.AgentRole.DEPLOYER);
                executionTasks.push({
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Deploy application to target environment',
                    role: interfaces_1.AgentRole.DEPLOYER,
                    priority: 'high',
                    inputSpec: { instruction, artifacts: '${buildArtifacts}' },
                    expectedOutput: ['deployment_config', 'live_url', 'health_check'],
                });
            }
            phases.push({
                id: `phase-${missionId}-execution`,
                name: 'Execution',
                description: 'Execute planned development and automation tasks',
                teamType: interfaces_1.TeamType.EXECUTION,
                assignedRoles: executionRoles,
                tasks: executionTasks,
                estimatedDurationMs: 2 * 60 * 60 * 1000,
                dependsOn: [phases[1].id],
            });
        }
        phases.push({
            id: `phase-${missionId}-certification`,
            name: 'Certification',
            description: 'Test, audit, and certify all deliverables',
            teamType: interfaces_1.TeamType.CERTIFICATION,
            assignedRoles: [
                interfaces_1.AgentRole.QA_TESTER,
                interfaces_1.AgentRole.SECURITY_AUDITOR,
                interfaces_1.AgentRole.DOCUMENTATION_WRITER,
            ],
            tasks: [
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Run automated test suite',
                    role: interfaces_1.AgentRole.QA_TESTER,
                    priority: 'critical',
                    inputSpec: { sourceCode: '${sourceCode}' },
                    expectedOutput: ['test_report', 'coverage_report'],
                },
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Perform security audit',
                    role: interfaces_1.AgentRole.SECURITY_AUDITOR,
                    priority: 'critical',
                    inputSpec: { sourceCode: '${sourceCode}', config: '${config}' },
                    expectedOutput: ['security_report', 'vulnerability_list'],
                },
                {
                    id: `task-${(0, uuid_1.v4)().slice(0, 8)}`,
                    description: 'Generate final documentation',
                    role: interfaces_1.AgentRole.DOCUMENTATION_WRITER,
                    priority: 'high',
                    inputSpec: { project: '${project}', testResults: '${testResults}' },
                    expectedOutput: ['readme', 'api_documentation', 'deployment_guide'],
                },
            ],
            estimatedDurationMs: 45 * 60 * 1000,
            dependsOn: phases.length > 2 ? [phases[2].id] : [phases[1].id],
        });
        const risks = [
            {
                id: `risk-${(0, uuid_1.v4)().slice(0, 8)}`,
                description: 'Unclear requirements may lead to rework',
                probability: 'medium',
                impact: 'medium',
                mitigation: 'Clarify requirements in research phase before building',
            },
            {
                id: `risk-${(0, uuid_1.v4)().slice(0, 8)}`,
                description: 'API costs may exceed budget for complex missions',
                probability: 'low',
                impact: 'high',
                mitigation: 'Monitor spending during execution, implement cost caps',
            },
        ];
        const plan = {
            missionId,
            objective: instruction,
            phases,
            requiredCapabilities: [
                ...(requiresBrowser ? ['browser_automation'] : []),
                ...(requiresCoding ? ['code_generation', 'testing'] : []),
                ...(requiresDocuments ? ['document_generation'] : []),
                ...(requiresDeployment ? ['deployment'] : []),
                'quality_assurance',
                'documentation',
            ],
            estimatedDuration: '4h',
            estimatedCost: 15,
            risks,
            dependencies: [],
            requiresBrowser,
            requiresCoding,
            requiresDocuments,
            requiresDeployment,
            requiresWebScraping,
            requiresDevelopment,
            requiresReports,
            requiresInfrastructure,
        };
        this.plans.set(missionId, plan);
        this.logger.log(`Plan created for mission ${missionId}: ${phases.length} phases, ${risks.length} risks`);
        return plan;
    }
    async executeResearch(missionId, plan) {
        this.logger.log(`Planning team executing research for mission ${missionId}`);
        const results = {
            missionId,
            findings: [
                {
                    topic: 'Domain Analysis',
                    summary: `Analyzed requirements for mission ${missionId}`,
                    details: 'Identified key components, technology choices, and implementation strategy based on mission objectives and constraints.',
                    confidence: 0.85,
                    source: 'internal_analysis',
                },
                {
                    topic: 'Technology Selection',
                    summary: 'Selected optimal technology stack',
                    details: 'Evaluated multiple frameworks and tools based on mission requirements, team capabilities, and budget constraints.',
                    confidence: 0.9,
                    source: 'technology_evaluation',
                },
            ],
            sources: ['internal_knowledge', 'web_research', 'best_practices'],
            recommendations: [
                'Start with core functionality, iterate on features',
                'Implement automated testing from the beginning',
                'Use containerized deployment for consistency',
            ],
            constraints: [
                'Must stay within budget limits',
                'All deliverables must pass certification',
                'Follow security best practices',
            ],
        };
        this.researchResults.set(missionId, results);
        return results;
    }
    getPlan(missionId) {
        return this.plans.get(missionId);
    }
    getResearchResults(missionId) {
        return this.researchResults.get(missionId);
    }
};
exports.PlanningTeamService = PlanningTeamService;
exports.PlanningTeamService = PlanningTeamService = PlanningTeamService_1 = __decorate([
    (0, common_1.Injectable)()
], PlanningTeamService);
//# sourceMappingURL=planning-team.service.js.map