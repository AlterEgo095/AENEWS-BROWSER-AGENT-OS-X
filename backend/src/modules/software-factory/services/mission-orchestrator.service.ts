/**
 * AENEWS Software Factory — Mission Orchestrator Service
 *
 * The central orchestrator implementing the mission flow:
 *
 *   Mission → Contract → Plan → Execute → Certify → Deliver
 *
 * Uses AgentOrchestratorService for the Decompose→Plan→Execute pipeline,
 * MissionStateMachineService for lifecycle management, and
 * AgentEventBusService for event emission.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MissionState,
  TransitionTrigger,
  TransitionContext,
  MissionQuality,
  MissionContract,
  MissionRequest,
  MissionExecution,
} from '../interfaces/mission.interface';
import { MissionContractService } from './mission-contract.service';
import { MissionStateMachineService } from './mission-state-machine.service';
import { AgentOrchestratorService } from '../../agent-framework/services/agent-orchestrator.service';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';
import { PlanningTeamService } from './teams/planning-team.service';
import { ExecutionTeamService } from './teams/execution-team.service';
import { CertificationTeamService } from './teams/certification-team.service';

@Injectable()
export class MissionOrchestratorService {
  private readonly logger = new Logger(MissionOrchestratorService.name);
  private readonly executions = new Map<string, MissionExecution>();

  constructor(
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly agentOrchestrator: AgentOrchestratorService,
    private readonly eventBus: AgentEventBusService,
    private readonly planningTeam: PlanningTeamService,
    private readonly executionTeam: ExecutionTeamService,
    private readonly certificationTeam: CertificationTeamService,
  ) {}

  /**
   * Start a new mission
   */
  async startMission(request: MissionRequest): Promise<MissionExecution> {
    const missionId = `mission-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(`New mission submitted: ${missionId} — "${request.instruction}"`);

    // Step 1: Create Contract
    const contract = this.contractService.createContract({
      mission: request.instruction,
      description: request.description,
      quality: request.quality,
      deadline: request.deadline,
      budgetMaxUsd: request.budgetMaxUsd,
      tags: request.tags,
      createdBy: request.createdBy,
    });

    // Step 2: Negotiate Contract Feasibility
    const negotiation = this.contractService.negotiate(contract);
    if (!negotiation.accepted) {
      this.logger.error(`Mission ${missionId} rejected: feasibility ${negotiation.feasibilityScore}`);
      const execution = this.createExecution(missionId, contract.id, MissionState.DRAFT);
      execution.errors = negotiation.warnings;
      execution.warnings = negotiation.warnings;
      return execution;
    }

    if (negotiation.modifiedContract) {
      this.contractService.updateContract(contract.id, negotiation.modifiedContract);
    }

    // Step 3: Initialize State Machine
    this.stateMachine.initializeMission(missionId);

    // Step 4: Create Execution Record
    const execution = this.createExecution(missionId, contract.id, MissionState.DRAFT);
    execution.warnings = negotiation.warnings;

    // Step 5: Auto-start Pipeline (async)
    this.executePipeline(missionId, request, contract).catch((err) => {
      this.logger.error(`Pipeline failed for ${missionId}: ${err.message}`);
    });

    return execution;
  }

  /**
   * Pause a mission
   */
  async pauseMission(missionId: string): Promise<boolean> {
    const execution = this.executions.get(missionId);
    if (!execution) return false;

    const paused = this.stateMachine.pause(missionId);
    if (paused) {
      execution.currentPhase = 'Paused';
      this.executions.set(missionId, execution);

      await this.eventBus.emitProgress(missionId, execution.progress, 'Paused');
      this.logger.log(`Mission ${missionId} paused`);
    }
    return paused;
  }

  /**
   * Resume a paused mission
   */
  async resumeMission(missionId: string): Promise<boolean> {
    const execution = this.executions.get(missionId);
    if (!execution) return false;

    const resumedState = this.stateMachine.resume(missionId);
    if (resumedState) {
      execution.status = resumedState;
      execution.currentPhase = `Resumed at ${resumedState}`;
      this.executions.set(missionId, execution);

      await this.eventBus.emitProgress(missionId, execution.progress, `Resumed at ${resumedState}`);
      this.logger.log(`Mission ${missionId} resumed at state ${resumedState}`);
    }
    return resumedState !== null;
  }

  /**
   * Cancel a mission
   */
  async cancelMission(missionId: string): Promise<boolean> {
    const execution = this.executions.get(missionId);
    if (!execution) return false;

    execution.status = MissionState.ARCHIVED;
    execution.errors = [...execution.errors, 'Mission cancelled by user'];
    execution.currentPhase = 'Cancelled';
    this.executions.set(missionId, execution);

    this.stateMachine.archiveMission(missionId);

    await this.eventBus.emitStateChange(missionId, execution.status, MissionState.ARCHIVED, {
      reason: 'cancelled',
    });

    this.logger.log(`Mission ${missionId} cancelled`);
    return true;
  }

  /**
   * Get mission status
   */
  getMissionStatus(missionId: string): MissionExecution | undefined {
    const execution = this.executions.get(missionId);
    if (!execution) return undefined;

    // Update progress from state machine
    const progress = this.stateMachine.getProgress(missionId);
    const currentState = this.stateMachine.getCurrentState(missionId);

    if (currentState) {
      execution.status = currentState;
    }
    execution.progress = progress;

    return execution;
  }

  /**
   * List all active missions
   */
  getActiveMissions(): MissionExecution[] {
    return Array.from(this.executions.values()).filter(
      (e) => e.status !== MissionState.ARCHIVED && e.status !== MissionState.COMPLETED,
    );
  }

  /**
   * Get all missions
   */
  getAllMissions(): MissionExecution[] {
    return Array.from(this.executions.values());
  }

  // ─── Private Helpers ────────────────────────────────────────

  private createExecution(
    missionId: string,
    contractId: string,
    status: MissionState,
  ): MissionExecution {
    const execution: MissionExecution = {
      missionId,
      contractId,
      status,
      progress: 0,
      currentPhase: 'Initializing',
      activeWorkers: 0,
      totalCost: 0,
      startedAt: new Date(),
      errors: [],
      warnings: [],
    };
    this.executions.set(missionId, execution);
    return execution;
  }

  private async executePipeline(
    missionId: string,
    request: MissionRequest,
    contract: MissionContract,
  ): Promise<void> {
    const execution = this.executions.get(missionId);
    if (!execution) return;

    try {
      // Phase 1: PLANNING
      await this.transitionTo(missionId, TransitionTrigger.SUBMIT);
      execution.currentPhase = 'Planning';
      execution.progress = 5;
      this.executions.set(missionId, execution);

      const plan = await this.planningTeam.createPlan(missionId, {
        instruction: request.instruction,
        quality: contract.quality,
        budget: contract.budget.maxApiCostUsd,
        deadline: contract.deadline.deadline,
      }, contract);

      await this.eventBus.emitProgress(missionId, 5, 'Planning');

      // Phase 2: RESEARCH
      await this.transitionTo(missionId, TransitionTrigger.START_RESEARCH);
      execution.currentPhase = 'Research';
      execution.progress = 15;
      this.executions.set(missionId, execution);

      const research = await this.planningTeam.executeResearch(missionId, plan);

      await this.eventBus.emitProgress(missionId, 15, 'Research');

      // Phase 3: BUILDING
      await this.transitionTo(missionId, TransitionTrigger.START_BUILD);
      execution.currentPhase = 'Building';
      execution.progress = 30;
      this.executions.set(missionId, execution);

      const buildResults = await this.executionTeam.execute(missionId, plan, research);
      execution.totalCost += buildResults.codeArtifacts?.linesOfCode
        ? buildResults.codeArtifacts.linesOfCode * 0.001
        : 5;

      await this.eventBus.emitProgress(missionId, 30, 'Building');

      // Phase 4: TESTING
      await this.transitionTo(missionId, TransitionTrigger.START_TESTING);
      execution.currentPhase = 'Testing';
      execution.progress = 50;
      this.executions.set(missionId, execution);

      const testResults = await this.certificationTeam.runTests(missionId, buildResults);

      await this.eventBus.emitProgress(missionId, 50, 'Testing');

      // Phase 5: AUDITING
      await this.transitionTo(missionId, TransitionTrigger.START_AUDIT);
      execution.currentPhase = 'Auditing';
      execution.progress = 65;
      this.executions.set(missionId, execution);

      const auditResults = await this.certificationTeam.runAudit(missionId);

      await this.eventBus.emitProgress(missionId, 65, 'Auditing');

      // Phase 6: CERTIFYING
      await this.transitionTo(missionId, TransitionTrigger.START_CERTIFICATION);
      execution.currentPhase = 'Certifying';
      execution.progress = 80;
      this.executions.set(missionId, execution);

      const certResult = await this.certificationTeam.certify(missionId);

      if (!certResult.certified) {
        throw new Error(`Certification failed: ${certResult.reasons.join(', ')}`);
      }

      await this.eventBus.emitProgress(missionId, 80, 'Certifying');

      // Phase 7: DELIVERING
      await this.transitionTo(missionId, TransitionTrigger.START_DELIVERY);
      execution.currentPhase = 'Delivering';
      execution.progress = 90;
      this.executions.set(missionId, execution);

      await this.eventBus.emitProgress(missionId, 90, 'Delivering');

      // Phase 8: COMPLETION
      await this.transitionTo(missionId, TransitionTrigger.MARK_COMPLETE);
      execution.currentPhase = 'Completed';
      execution.progress = 100;
      execution.status = MissionState.COMPLETED;
      this.executions.set(missionId, execution);

      await this.eventBus.emitProgress(missionId, 100, 'Completed');

      this.logger.log(`Mission ${missionId} completed successfully!`);
    } catch (error) {
      this.logger.error(`Pipeline error for ${missionId}: ${(error as Error).message}`);
      execution.errors.push((error as Error).message);
      execution.currentPhase = 'Failed';
      this.executions.set(missionId, execution);

      await this.eventBus.emitStateChange(missionId, execution.status, MissionState.ARCHIVED, {
        error: (error as Error).message,
      });
    }
  }

  private async transitionTo(
    missionId: string,
    trigger: TransitionTrigger,
  ): Promise<void> {
    const execution = this.executions.get(missionId);
    const currentState = this.stateMachine.getCurrentState(missionId) || MissionState.DRAFT;

    const ctx: TransitionContext = {
      missionId,
      contractId: execution?.contractId || '',
      currentState,
      trigger,
    };

    await this.stateMachine.transition(ctx);
  }
}
