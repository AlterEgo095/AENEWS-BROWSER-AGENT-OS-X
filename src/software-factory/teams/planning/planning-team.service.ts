/**
 * AENEWS Software Factory — Planning Team
 *
 * Responsible for: Research, Architecture, Business Analysis, Marketing Strategy
 * Creates the execution plan that guides the mission.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AgentRole, TeamType, TeamTask, TeamReport, TaskResult, Artifact } from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface MissionPlan {
  missionId: string;
  objective: string;
  phases: PlanPhase[];
  requiredCapabilities: string[];
  estimatedDuration: string;
  estimatedCost: number;
  risks: RiskAssessment[];
  dependencies: string[];
  requiresBrowser: boolean;
  requiresCoding: boolean;
  requiresDocuments: boolean;
  requiresDeployment: boolean;
  requiresWebScraping: boolean;
  requiresDevelopment: boolean;
  requiresReports: boolean;
  requiresInfrastructure: boolean;
}

export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  teamType: TeamType;
  assignedRoles: AgentRole[];
  tasks: PlanTask[];
  estimatedDurationMs: number;
  dependsOn: string[];
}

export interface PlanTask {
  id: string;
  description: string;
  role: AgentRole;
  priority: 'low' | 'medium' | 'high' | 'critical';
  inputSpec: Record<string, any>;
  expectedOutput: string[];
}

export interface RiskAssessment {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ResearchResults {
  missionId: string;
  findings: ResearchFinding[];
  sources: string[];
  recommendations: string[];
  constraints: string[];
}

export interface ResearchFinding {
  topic: string;
  summary: string;
  details: string;
  confidence: number;
  source: string;
}

@Injectable()
export class PlanningTeamService {
  private readonly logger = new Logger(PlanningTeamService.name);
  private readonly plans = new Map<string, MissionPlan>();
  private readonly researchResults = new Map<string, ResearchResults>();

  /**
   * Create an execution plan for a mission
   */
  async createPlan(
    missionId: string,
    context: Record<string, any>,
    contract: any,
  ): Promise<MissionPlan> {
    this.logger.log(`Planning team creating plan for mission ${missionId}`);

    const instruction = context.instruction || '';
    const instructionLower = instruction.toLowerCase();

    // Analyze mission requirements
    const requiresBrowser = /site|web|navigate|browser|scrap|facebook|google|url|http/i.test(
      instruction,
    );
    const requiresCoding =
      /créer|create|develop|build|saas|app|application|code|api|backend|frontend/i.test(
        instruction,
      );
    const requiresDocuments = /rapport|report|pdf|document|audit|analyse/i.test(instruction);
    const requiresDeployment = /deploy|déploy|docker|cloud|host|server/i.test(instruction);
    const requiresWebScraping = /scrap|extract|collect|monitor|track/i.test(instruction);
    const requiresDevelopment = requiresCoding || /développ|implement|intégr/i.test(instruction);
    const requiresReports = requiresDocuments || /report|rapport|summary|résumé/i.test(instruction);
    const requiresInfrastructure =
      requiresDeployment || /infrastructure|server|scaling|monitoring/i.test(instruction);

    // Build phases
    const phases: PlanPhase[] = [];

    // Phase 1: Research & Analysis
    phases.push({
      id: `phase-${missionId}-research`,
      name: 'Research & Analysis',
      description: `Analyze requirements for: ${instruction}`,
      teamType: TeamType.PLANNING,
      assignedRoles: [AgentRole.RESEARCHER, AgentRole.BUSINESS_ANALYST],
      tasks: [
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: `Research domain knowledge for: ${instruction}`,
          role: AgentRole.RESEARCHER,
          priority: 'high',
          inputSpec: { instruction, quality: context.quality },
          expectedOutput: ['domain_research', 'best_practices', 'technology_recommendations'],
        },
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: `Analyze business requirements and constraints`,
          role: AgentRole.BUSINESS_ANALYST,
          priority: 'high',
          inputSpec: { instruction, budget: context.budget, deadline: context.deadline },
          expectedOutput: ['requirements_document', 'feasibility_report', 'cost_estimate'],
        },
      ],
      estimatedDurationMs: 30 * 60 * 1000, // 30 min
      dependsOn: [],
    });

    // Phase 2: Architecture Design
    phases.push({
      id: `phase-${missionId}-architecture`,
      name: 'Architecture Design',
      description: 'Design technical architecture and implementation strategy',
      teamType: TeamType.PLANNING,
      assignedRoles: [AgentRole.ARCHITECT],
      tasks: [
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Design system architecture',
          role: AgentRole.ARCHITECT,
          priority: 'critical',
          inputSpec: { instruction, requirements: '${researchResults}' },
          expectedOutput: ['architecture_document', 'technology_stack', 'component_diagram'],
        },
      ],
      estimatedDurationMs: 20 * 60 * 1000,
      dependsOn: [phases[0].id],
    });

    // Phase 3: Execution (if needed)
    if (requiresBrowser || requiresCoding || requiresDocuments || requiresDeployment) {
      const executionRoles: AgentRole[] = [];
      const executionTasks: PlanTask[] = [];

      if (requiresBrowser) {
        executionRoles.push(AgentRole.BROWSER_OPERATOR);
        executionTasks.push({
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Execute browser automation tasks',
          role: AgentRole.BROWSER_OPERATOR,
          priority: 'high',
          inputSpec: { instruction, urls: [], actions: [] },
          expectedOutput: ['browser_data', 'screenshots', 'extracted_content'],
        });
      }

      if (requiresCoding) {
        executionRoles.push(AgentRole.CODER);
        executionTasks.push({
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Implement application code',
          role: AgentRole.CODER,
          priority: 'critical',
          inputSpec: { instruction, architecture: '${architecture}' },
          expectedOutput: ['source_code', 'tests', 'configuration'],
        });
      }

      if (requiresDocuments) {
        executionRoles.push(AgentRole.OFFICE_OPERATOR);
        executionTasks.push({
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Generate documents and reports',
          role: AgentRole.OFFICE_OPERATOR,
          priority: 'high',
          inputSpec: { instruction, data: '${executionResults}' },
          expectedOutput: ['pdf_report', 'documentation'],
        });
      }

      if (requiresDeployment) {
        executionRoles.push(AgentRole.DEPLOYER);
        executionTasks.push({
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Deploy application to target environment',
          role: AgentRole.DEPLOYER,
          priority: 'high',
          inputSpec: { instruction, artifacts: '${buildArtifacts}' },
          expectedOutput: ['deployment_config', 'live_url', 'health_check'],
        });
      }

      phases.push({
        id: `phase-${missionId}-execution`,
        name: 'Execution',
        description: 'Execute planned development and automation tasks',
        teamType: TeamType.EXECUTION,
        assignedRoles: executionRoles,
        tasks: executionTasks,
        estimatedDurationMs: 2 * 60 * 60 * 1000, // 2 hours
        dependsOn: [phases[1].id],
      });
    }

    // Phase 4: Certification
    phases.push({
      id: `phase-${missionId}-certification`,
      name: 'Certification',
      description: 'Test, audit, and certify all deliverables',
      teamType: TeamType.CERTIFICATION,
      assignedRoles: [
        AgentRole.QA_TESTER,
        AgentRole.SECURITY_AUDITOR,
        AgentRole.DOCUMENTATION_WRITER,
      ],
      tasks: [
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Run automated test suite',
          role: AgentRole.QA_TESTER,
          priority: 'critical',
          inputSpec: { sourceCode: '${sourceCode}' },
          expectedOutput: ['test_report', 'coverage_report'],
        },
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Perform security audit',
          role: AgentRole.SECURITY_AUDITOR,
          priority: 'critical',
          inputSpec: { sourceCode: '${sourceCode}', config: '${config}' },
          expectedOutput: ['security_report', 'vulnerability_list'],
        },
        {
          id: `task-${uuidv4().slice(0, 8)}`,
          description: 'Generate final documentation',
          role: AgentRole.DOCUMENTATION_WRITER,
          priority: 'high',
          inputSpec: { project: '${project}', testResults: '${testResults}' },
          expectedOutput: ['readme', 'api_documentation', 'deployment_guide'],
        },
      ],
      estimatedDurationMs: 45 * 60 * 1000, // 45 min
      dependsOn: phases.length > 2 ? [phases[2].id] : [phases[1].id],
    });

    // Risk assessment
    const risks: RiskAssessment[] = [
      {
        id: `risk-${uuidv4().slice(0, 8)}`,
        description: 'Unclear requirements may lead to rework',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Clarify requirements in research phase before building',
      },
      {
        id: `risk-${uuidv4().slice(0, 8)}`,
        description: 'API costs may exceed budget for complex missions',
        probability: 'low',
        impact: 'high',
        mitigation: 'Monitor spending during execution, implement cost caps',
      },
    ];

    const plan: MissionPlan = {
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
    this.logger.log(
      `Plan created for mission ${missionId}: ${phases.length} phases, ${risks.length} risks`,
    );
    return plan;
  }

  /**
   * Execute research phase
   */
  async executeResearch(
    missionId: string,
    plan: MissionPlan | undefined,
  ): Promise<ResearchResults> {
    this.logger.log(`Planning team executing research for mission ${missionId}`);

    const results: ResearchResults = {
      missionId,
      findings: [
        {
          topic: 'Domain Analysis',
          summary: `Analyzed requirements for mission ${missionId}`,
          details:
            'Identified key components, technology choices, and implementation strategy based on mission objectives and constraints.',
          confidence: 0.85,
          source: 'internal_analysis',
        },
        {
          topic: 'Technology Selection',
          summary: 'Selected optimal technology stack',
          details:
            'Evaluated multiple frameworks and tools based on mission requirements, team capabilities, and budget constraints.',
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

  /**
   * Get plan for a mission
   */
  getPlan(missionId: string): MissionPlan | undefined {
    return this.plans.get(missionId);
  }

  /**
   * Get research results for a mission
   */
  getResearchResults(missionId: string): ResearchResults | undefined {
    return this.researchResults.get(missionId);
  }
}
