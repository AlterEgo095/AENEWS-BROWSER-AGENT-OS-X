/**
 * AENEWS Software Factory — Mission Control Center
 * 
 * The central orchestrator that transforms a natural language instruction
 * into a fully executed, certified, and delivered mission.
 * 
 * Flow: Natural Language → Contract → Plan → Execute → Certify → Deliver
 */

import { Injectable, Logger } from '@nestjs/common';
import { MissionContractService } from '../mission-contract/mission-contract.service';
import { MissionStateMachineService } from '../mission-state-machine/mission-state-machine.service';
import { MissionState, TransitionTrigger } from '../interfaces';
import { AgentPoolService } from '../agent-pool/agent-pool.service';
import { PlanningTeamService } from '../teams/planning/planning-team.service';
import { ExecutionTeamService } from '../teams/execution/execution-team.service';
import { CertificationTeamService } from '../teams/certification/certification-team.service';
import { DeliveryService } from '../delivery/delivery.service';
import { MissionMemoryService } from '../memory/mission-memory.service';
import { MissionArchiveService } from '../archive/mission-archive.service';
import {
  MissionContract,
  MissionQuality,
  TeamType,
  AgentRole,
  TeamTask,
  TransitionContext,
  TransitionResult,
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface MissionRequest {
  instruction: string;
  description?: string;
  quality?: MissionQuality;
  deadline?: Date;
  budgetMaxUsd?: number;
  deliverables?: string[];
  tags?: string[];
  createdBy?: string;
}

export interface MissionExecution {
  missionId: string;
  contractId: string;
  status: MissionState;
  progress: number;
  currentPhase: string;
  activeAgents: number;
  totalCost: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class MissionControlService {
  private readonly logger = new Logger(MissionControlService.name);
  private readonly executions = new Map<string, MissionExecution>();

  constructor(
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly agentPool: AgentPoolService,
    private readonly planningTeam: PlanningTeamService,
    private readonly executionTeam: ExecutionTeamService,
    private readonly certificationTeam: CertificationTeamService,
    private readonly deliveryService: DeliveryService,
    private readonly memoryService: MissionMemoryService,
    private readonly archiveService: MissionArchiveService,
  ) {}

  /**
   * Submit a new mission from natural language instruction
   */
  async submitMission(request: MissionRequest): Promise<MissionExecution> {
    const missionId = `mission-${uuidv4().slice(0, 8)}`;
    this.logger.log(`New mission submitted: ${missionId} — "${request.instruction}"`);

    // Step 1: Create contract
    const contract = this.contractService.createContract({
      mission: request.instruction,
      description: request.description,
      quality: request.quality,
      deadline: request.deadline,
      budgetMaxUsd: request.budgetMaxUsd,
      deliverables: request.deliverables as any[],
      tags: request.tags,
      createdBy: request.createdBy,
    });

    // Step 2: Negotiate contract feasibility
    const negotiation = this.contractService.negotiate(contract);
    if (!negotiation.accepted) {
      this.logger.error(`Mission ${missionId} rejected: feasibility score ${negotiation.feasibilityScore}`);
      return this.createExecution(missionId, contract.id, MissionState.DRAFT, negotiation.warnings);
    }

    if (negotiation.modifiedContract) {
      this.contractService.updateContract(contract.id, negotiation.modifiedContract);
    }

    // Step 3: Initialize state machine
    this.stateMachine.initializeMission(missionId);

    // Step 4: Store in memory
    this.memoryService.storeContext(missionId, {
      instruction: request.instruction,
      contractId: contract.id,
      quality: contract.quality,
      budget: contract.budget.maxApiCostUsd,
      deadline: contract.deadline.deadline,
    });

    // Step 5: Create execution tracking
    const execution = this.createExecution(missionId, contract.id, MissionState.DRAFT, negotiation.warnings);

    // Step 6: Auto-start the pipeline
    this.executePipeline(missionId).catch(err => {
      this.logger.error(`Pipeline failed for mission ${missionId}: ${err.message}`);
      execution.errors.push(err.message);
    });

    return execution;
  }

  /**
   * Execute the full mission pipeline
   */
  private async executePipeline(missionId: string): Promise<void> {
    const execution = this.executions.get(missionId);
    if (!execution) return;

    try {
      // Phase 1: PLANNING
      await this.transitionTo(missionId, TransitionTrigger.SUBMIT, MissionState.PLANNED);
      execution.currentPhase = 'Planning';
      await this.runPlanningPhase(missionId);

      // Phase 2: RESEARCH
      await this.transitionTo(missionId, TransitionTrigger.START_RESEARCH, MissionState.RESEARCH);
      execution.currentPhase = 'Research';
      await this.runResearchPhase(missionId);

      // Phase 3: BUILDING
      await this.transitionTo(missionId, TransitionTrigger.START_BUILD, MissionState.BUILDING);
      execution.currentPhase = 'Building';
      await this.runBuildingPhase(missionId);

      // Phase 4: TESTING
      await this.transitionTo(missionId, TransitionTrigger.START_TESTING, MissionState.TESTING);
      execution.currentPhase = 'Testing';
      await this.runTestingPhase(missionId);

      // Phase 5: AUDITING
      await this.transitionTo(missionId, TransitionTrigger.START_AUDIT, MissionState.AUDITING);
      execution.currentPhase = 'Auditing';
      await this.runAuditingPhase(missionId);

      // Phase 6: CERTIFYING
      await this.transitionTo(missionId, TransitionTrigger.START_CERTIFICATION, MissionState.CERTIFYING);
      execution.currentPhase = 'Certifying';
      await this.runCertificationPhase(missionId);

      // Phase 7: DELIVERING
      await this.transitionTo(missionId, TransitionTrigger.START_DELIVERY, MissionState.DELIVERING);
      execution.currentPhase = 'Delivering';
      await this.runDeliveryPhase(missionId);

      // Phase 8: COMPLETED
      await this.transitionTo(missionId, TransitionTrigger.MARK_COMPLETE, MissionState.COMPLETED);
      execution.currentPhase = 'Completed';

      // Phase 9: Cleanup & Archive
      await this.cleanupMission(missionId);

      this.logger.log(`Mission ${missionId} completed successfully!`);
    } catch (error) {
      this.logger.error(`Pipeline error for mission ${missionId}: ${(error as Error).message}`);
      execution.errors.push((error as Error).message);
      // Attempt rollback based on current state
      await this.handlePipelineError(missionId, error as Error);
    }
  }

  /**
   * Planning Phase — Decompose mission, create execution plan
   */
  private async runPlanningPhase(missionId: string): Promise<void> {
    const context = this.memoryService.getContext(missionId);
    const contract = this.getContractForMission(missionId);

    // Spawn planning agents
    const researcher = await this.agentPool.spawn({
      missionId,
      role: AgentRole.RESEARCHER,
      skills: ['web_search', 'data_analysis', 'market_research'],
    });

    const architect = await this.agentPool.spawn({
      missionId,
      role: AgentRole.ARCHITECT,
      skills: ['system_design', 'technology_selection', 'architecture_patterns'],
    });

    const businessAnalyst = await this.agentPool.spawn({
      missionId,
      role: AgentRole.BUSINESS_ANALYST,
      skills: ['requirements_analysis', 'feasibility_assessment', 'cost_estimation'],
    });

    // Execute planning tasks
    const plan = await this.planningTeam.createPlan(missionId, context || {}, contract);

    // Store plan in memory
    this.memoryService.storePlan(missionId, plan);

    // Complete agent tasks
    for (const agent of this.agentPool.getAgentsByMission(missionId)) {
      this.agentPool.completeTask(agent.id, 0.5, true);
    }
  }

  /**
   * Research Phase — Gather information, analyze requirements
   */
  private async runResearchPhase(missionId: string): Promise<void> {
    const plan = this.memoryService.getPlan(missionId);
    const researchResults = await this.planningTeam.executeResearch(missionId, plan);

    this.memoryService.storeResearch(missionId, researchResults);

    // Terminate planning agents that are no longer needed
    for (const agent of this.agentPool.getAgentsByMission(missionId)) {
      if (agent.role === AgentRole.RESEARCHER || agent.role === AgentRole.BUSINESS_ANALYST) {
        await this.agentPool.terminate({
          agentId: agent.id,
          reason: 'mission_complete',
          archiveResults: true,
        });
      }
    }
  }

  /**
   * Building Phase — Execute the main development/browser/office tasks
   */
  private async runBuildingPhase(missionId: string): Promise<void> {
    const plan = this.memoryService.getPlan(missionId);
    const research = this.memoryService.getResearch(missionId);

    // Spawn execution agents based on plan
    const neededRoles = this.inferRequiredRoles(plan);

    for (const role of neededRoles) {
      await this.agentPool.spawn({
        missionId,
        role,
        skills: this.getSkillsForRole(role),
      });
    }

    const buildResults = await this.executionTeam.execute(missionId, plan, research);
    this.memoryService.storeBuildResults(missionId, buildResults);
  }

  /**
   * Testing Phase — Run automated tests
   */
  private async runTestingPhase(missionId: string): Promise<void> {
    const buildResults = this.memoryService.getBuildResults(missionId);

    // Spawn certification agents for testing
    await this.agentPool.spawn({
      missionId,
      role: AgentRole.QA_TESTER,
      skills: ['unit_testing', 'integration_testing', 'e2e_testing'],
    });

    await this.agentPool.spawn({
      missionId,
      role: AgentRole.PERFORMANCE_TESTER,
      skills: ['load_testing', 'stress_testing', 'benchmarking'],
    });

    const testResults = await this.certificationTeam.runTests(missionId, buildResults);
    this.memoryService.storeTestResults(missionId, testResults);

    // If tests fail, we need to go back to building
    if (!testResults.success) {
      throw new Error(`Tests failed: ${testResults.errors.join(', ')}`);
    }
  }

  /**
   * Auditing Phase — Security and quality audit
   */
  private async runAuditingPhase(missionId: string): Promise<void> {
    await this.agentPool.spawn({
      missionId,
      role: AgentRole.SECURITY_AUDITOR,
      skills: ['vulnerability_scan', 'code_audit', 'compliance_check'],
    });

    const auditResults = await this.certificationTeam.runAudit(missionId);
    this.memoryService.storeAuditResults(missionId, auditResults);

    if (!auditResults.passed) {
      throw new Error(`Audit failed: ${auditResults.findings.join(', ')}`);
    }
  }

  /**
   * Certification Phase — Final quality gate
   */
  private async runCertificationPhase(missionId: string): Promise<void> {
    await this.agentPool.spawn({
      missionId,
      role: AgentRole.DOCUMENTATION_WRITER,
      skills: ['technical_writing', 'api_documentation', 'readme_generation'],
    });

    const certResult = await this.certificationTeam.certify(missionId);
    this.memoryService.storeCertification(missionId, certResult);

    if (!certResult.certified) {
      throw new Error(`Certification failed: ${certResult.reasons.join(', ')}`);
    }
  }

  /**
   * Delivery Phase — Package and deliver all artifacts
   */
  private async runDeliveryPhase(missionId: string): Promise<void> {
    const contract = this.getContractForMission(missionId);
    const allResults = this.memoryService.getAllResults(missionId);

    await this.deliveryService.deliver(missionId, contract, allResults);
  }

  /**
   * Cleanup after mission completion
   */
  private async cleanupMission(missionId: string): Promise<void> {
    // Terminate all remaining agents
    await this.agentPool.terminateMissionAgents(missionId, 'mission_complete');

    // Archive mission
    const timeline = this.stateMachine.archiveMission(missionId);
    const execution = this.executions.get(missionId);

    await this.archiveService.archive(missionId, {
      execution,
      timeline,
      contract: this.getContractForMission(missionId),
      memory: this.memoryService.exportMission(missionId),
      agentStats: this.agentPool.getStatistics(),
    });

    // Transition to ARCHIVED
    await this.transitionTo(missionId, TransitionTrigger.ARCHIVE, MissionState.ARCHIVED);
  }

  /**
   * Handle pipeline errors with rollback
   */
  private async handlePipelineError(missionId: string, error: Error): Promise<void> {
    const currentState = this.stateMachine.getCurrentState(missionId);
    const execution = this.executions.get(missionId);
    if (!execution) return;

    execution.errors.push(error.message);

    // Determine rollback target based on current state
    const rollbackMap: Partial<Record<MissionState, TransitionTrigger>> = {
      [MissionState.RESEARCH]: TransitionTrigger.ROLLBACK,
      [MissionState.BUILDING]: TransitionTrigger.ROLLBACK,
      [MissionState.TESTING]: TransitionTrigger.ROLLBACK,
      [MissionState.AUDITING]: TransitionTrigger.ROLLBACK,
      [MissionState.CERTIFYING]: TransitionTrigger.ROLLBACK,
      [MissionState.DELIVERING]: TransitionTrigger.ROLLBACK,
    };

    const rollbackTrigger = rollbackMap[currentState || MissionState.DRAFT];
    if (rollbackTrigger) {
      const context: TransitionContext = {
        missionId,
        contractId: execution.contractId,
        currentState: currentState || MissionState.DRAFT,
        trigger: rollbackTrigger,
        payload: { error: error.message },
      };
      await this.stateMachine.transition(context);
    }
  }

  /**
   * Get execution status for a mission
   */
  getExecution(missionId: string): MissionExecution | undefined {
    const execution = this.executions.get(missionId);
    if (!execution) return undefined;

    // Update dynamic fields
    const state = this.stateMachine.getCurrentState(missionId);
    if (state) {
      execution.status = state;
      execution.progress = this.stateMachine.getProgress(missionId);
    }

    const agents = this.agentPool.getAgentsByMission(missionId);
    execution.activeAgents = agents.length;

    const contract = this.contractService.getContract(execution.contractId);
    if (contract) {
      execution.totalCost = contract.budget.currentSpendUsd;
    }

    return execution;
  }

  /**
   * List all active missions
   */
  getActiveMissions(): MissionExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.status !== MissionState.ARCHIVED && e.status !== MissionState.COMPLETED,
    );
  }

  /**
   * Cancel a mission
   */
  async cancelMission(missionId: string): Promise<boolean> {
    const execution = this.executions.get(missionId);
    if (!execution) return false;

    await this.agentPool.terminateMissionAgents(missionId, 'manual');
    this.stateMachine.archiveMission(missionId);

    execution.status = MissionState.ARCHIVED;
    execution.errors.push('Mission cancelled by user');

    this.logger.log(`Mission ${missionId} cancelled`);
    return true;
  }

  // --- Private helpers ---

  private createExecution(
    missionId: string,
    contractId: string,
    status: MissionState,
    warnings: string[],
  ): MissionExecution {
    const execution: MissionExecution = {
      missionId,
      contractId,
      status,
      progress: 0,
      currentPhase: 'Draft',
      activeAgents: 0,
      totalCost: 0,
      startedAt: new Date(),
      errors: [],
      warnings,
    };
    this.executions.set(missionId, execution);
    return execution;
  }

  private async transitionTo(
    missionId: string,
    trigger: TransitionTrigger,
    expectedState: MissionState,
  ): Promise<TransitionResult> {
    const execution = this.executions.get(missionId);
    const currentState = this.stateMachine.getCurrentState(missionId) || MissionState.DRAFT;

    const context: TransitionContext = {
      missionId,
      contractId: execution?.contractId || '',
      currentState,
      trigger,
    };

    const result = await this.stateMachine.transition(context);
    if (!result.success) {
      this.logger.warn(`Transition failed: ${currentState} + ${trigger} → ${result.error}`);
    }
    return result;
  }

  private getContractForMission(missionId: string): MissionContract | undefined {
    const execution = this.executions.get(missionId);
    if (!execution) return undefined;
    return this.contractService.getContract(execution.contractId);
  }

  private inferRequiredRoles(plan: any): AgentRole[] {
    const roles: AgentRole[] = [];
    if (plan?.requiresBrowser || plan?.requiresWebScraping) {
      roles.push(AgentRole.BROWSER_OPERATOR);
    }
    if (plan?.requiresCoding || plan?.requiresDevelopment) {
      roles.push(AgentRole.CODER);
    }
    if (plan?.requiresDocuments || plan?.requiresReports) {
      roles.push(AgentRole.OFFICE_OPERATOR);
    }
    if (plan?.requiresDeployment || plan?.requiresInfrastructure) {
      roles.push(AgentRole.DEPLOYER);
    }
    // Default: always include coder for most missions
    if (roles.length === 0) {
      roles.push(AgentRole.CODER);
    }
    return roles;
  }

  private getSkillsForRole(role: AgentRole): string[] {
    const skillMap: Record<AgentRole, string[]> = {
      [AgentRole.RESEARCHER]: ['web_search', 'data_analysis', 'market_research'],
      [AgentRole.ARCHITECT]: ['system_design', 'technology_selection'],
      [AgentRole.BUSINESS_ANALYST]: ['requirements_analysis', 'cost_estimation'],
      [AgentRole.MARKETING_STRATEGIST]: ['seo', 'content_strategy', 'campaign_planning'],
      [AgentRole.BROWSER_OPERATOR]: ['navigation', 'form_filling', 'data_extraction', 'screenshots'],
      [AgentRole.CODER]: ['code_generation', 'debugging', 'testing', 'refactoring'],
      [AgentRole.OFFICE_OPERATOR]: ['document_generation', 'pdf_creation', 'spreadsheet'],
      [AgentRole.DEPLOYER]: ['docker', 'cicd', 'cloud_deployment', 'monitoring'],
      [AgentRole.QA_TESTER]: ['unit_testing', 'integration_testing', 'e2e_testing'],
      [AgentRole.SECURITY_AUDITOR]: ['vulnerability_scan', 'code_audit', 'compliance'],
      [AgentRole.PERFORMANCE_TESTER]: ['load_testing', 'stress_testing', 'benchmarking'],
      [AgentRole.DOCUMENTATION_WRITER]: ['technical_writing', 'api_docs', 'readme'],
    };
    return skillMap[role] || [];
  }
}
