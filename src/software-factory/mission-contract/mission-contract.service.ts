/**
 * AENEWS Software Factory — Mission Contract Service
 * 
 * Creates, validates, and tracks mission contracts.
 * A contract is the single source of truth for any mission.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MissionContract,
  MissionQuality,
  DeliverableType,
  ContractNegotiationResult,
  ContractViolation,
  BudgetConstraint,
  TimeConstraint,
  DeliverableSpec,
  AcceptanceCriterion,
  MissionConstraint,
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MissionContractService {
  private readonly logger = new Logger(MissionContractService.name);
  private readonly contracts = new Map<string, MissionContract>();
  private readonly violations = new Map<string, ContractViolation[]>();

  /**
   * Create a new mission contract from natural language instruction
   */
  createContract(params: {
    mission: string;
    description?: string;
    quality?: MissionQuality;
    deadline?: Date;
    budgetMaxUsd?: number;
    deliverables?: DeliverableType[];
    acceptanceCriteria?: string[];
    constraints?: MissionConstraint[];
    tags?: string[];
    createdBy?: string;
  }): MissionContract {
    const id = `contract-${uuidv4().slice(0, 8)}`;
    const now = new Date();

    const contract: MissionContract = {
      id,
      mission: params.mission,
      description: params.description || params.mission,
      quality: params.quality || MissionQuality.STANDARD,
      deadline: {
        deadline: params.deadline || new Date(now.getTime() + 48 * 60 * 60 * 1000), // default 48h
        estimatedDuration: '48h',
        milestones: this.generateDefaultMilestones(params.deadline || new Date(now.getTime() + 48 * 60 * 60 * 1000)),
      },
      budget: {
        maxApiCostUsd: params.budgetMaxUsd || 20,
        currentSpendUsd: 0,
        maxComputeHours: 24,
        currentComputeHours: 0,
        maxAgentInstances: 20,
        currentAgentInstances: 0,
      },
      deliverables: this.inferDeliverables(params.deliverables, params.mission),
      acceptanceCriteria: (params.acceptanceCriteria || this.generateDefaultCriteria(params.mission)).map(
        (desc, idx) => ({
          id: `ac-${id}-${idx}`,
          description: typeof desc === 'string' ? desc : (desc as AcceptanceCriterion).description,
          category: 'functional' as const,
          mandatory: true,
          verified: false,
        }),
      ),
      constraints: params.constraints || [],
      createdAt: now,
      updatedAt: now,
      createdBy: params.createdBy || 'system',
      tags: params.tags || [],
      metadata: {},
    };

    this.contracts.set(id, contract);
    this.violations.set(id, []);
    this.logger.log(`Contract created: ${id} — "${params.mission}" [${contract.quality}]`);
    return contract;
  }

  /**
   * Negotiate a contract — check feasibility before execution
   */
  negotiate(contract: MissionContract): ContractNegotiationResult {
    const warnings: string[] = [];
    let feasibilityScore = 100;

    // Check budget vs quality expectations
    const qualityCostMap: Record<MissionQuality, number> = {
      [MissionQuality.DRAFT]: 2,
      [MissionQuality.STANDARD]: 10,
      [MissionQuality.PROFESSIONAL]: 25,
      [MissionQuality.ENTERPRISE]: 50,
      [MissionQuality.MISSION_CRITICAL]: 100,
    };

    const estimatedCost = qualityCostMap[contract.quality] || 10;
    if (estimatedCost > contract.budget.maxApiCostUsd) {
      warnings.push(`Budget $${contract.budget.maxApiCostUsd} may be insufficient for ${contract.quality} quality (est. $${estimatedCost})`);
      feasibilityScore -= 30;
    }

    // Check deadline feasibility
    const deadlineMs = contract.deadline.deadline.getTime() - Date.now();
    const deliverableCount = contract.deliverables.filter(d => d.required).length;
    const estimatedDurationMs = deliverableCount * 2 * 60 * 60 * 1000; // ~2h per deliverable
    if (deadlineMs < estimatedDurationMs) {
      warnings.push(`Deadline may be too tight for ${deliverableCount} deliverables (est. ${estimatedDurationMs / 3600000}h)`);
      feasibilityScore -= 25;
    }

    // Check acceptance criteria completeness
    if (contract.acceptanceCriteria.length === 0) {
      warnings.push('No acceptance criteria defined — quality validation will be minimal');
      feasibilityScore -= 15;
    }

    const modifiedContract: Partial<MissionContract> = {};
    if (feasibilityScore < 50) {
      modifiedContract.quality = MissionQuality.STANDARD;
      warnings.push('Quality downgraded to STANDARD due to feasibility concerns');
    }

    return {
      accepted: feasibilityScore >= 30,
      modifiedContract: Object.keys(modifiedContract).length > 0 ? modifiedContract : undefined,
      warnings,
      estimatedCost,
      estimatedDuration: `${Math.ceil(estimatedDurationMs / 3600000)}h`,
      feasibilityScore: Math.max(0, feasibilityScore),
    };
  }

  /**
   * Get contract by ID
   */
  getContract(contractId: string): MissionContract | undefined {
    return this.contracts.get(contractId);
  }

  /**
   * Update contract (e.g., after negotiation or during execution)
   */
  updateContract(contractId: string, updates: Partial<MissionContract>): MissionContract | undefined {
    const contract = this.contracts.get(contractId);
    if (!contract) return undefined;

    Object.assign(contract, updates, { updatedAt: new Date() });
    this.contracts.set(contractId, contract);
    return contract;
  }

  /**
   * Track spending against contract budget
   */
  trackSpend(contractId: string, amountUsd: number, computeHours: number = 0): ContractViolation | null {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    contract.budget.currentSpendUsd += amountUsd;
    contract.budget.currentComputeHours += computeHours;
    this.contracts.set(contractId, contract);

    // Check for violations
    if (contract.budget.currentSpendUsd > contract.budget.maxApiCostUsd) {
      const violation: ContractViolation = {
        id: `violation-${uuidv4().slice(0, 8)}`,
        contractId,
        type: 'budget_exceeded',
        description: `Budget exceeded: $${contract.budget.currentSpendUsd.toFixed(2)} / $${contract.budget.maxApiCostUsd}`,
        severity: 'critical',
        detectedAt: new Date(),
        resolved: false,
      };
      const violations = this.violations.get(contractId) || [];
      violations.push(violation);
      this.violations.set(contractId, violations);
      this.logger.warn(`Contract violation: ${violation.description}`);
      return violation;
    }

    return null;
  }

  /**
   * Mark a deliverable as validated
   */
  validateDeliverable(contractId: string, deliverableType: DeliverableType, path: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    const deliverable = contract.deliverables.find(d => d.type === deliverableType);
    if (deliverable) {
      deliverable.validated = true;
      deliverable.path = path;
      this.contracts.set(contractId, contract);
      this.logger.log(`Deliverable validated: ${deliverableType} for contract ${contractId}`);
      return true;
    }
    return false;
  }

  /**
   * Verify acceptance criterion
   */
  verifyAcceptanceCriterion(contractId: string, criterionId: string, verifiedBy: string, notes?: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    const criterion = contract.acceptanceCriteria.find(c => c.id === criterionId);
    if (criterion) {
      criterion.verified = true;
      criterion.verifiedBy = verifiedBy;
      criterion.verifiedAt = new Date();
      criterion.notes = notes;
      this.contracts.set(contractId, contract);
      return true;
    }
    return false;
  }

  /**
   * Get all violations for a contract
   */
  getViolations(contractId: string): ContractViolation[] {
    return this.violations.get(contractId) || [];
  }

  /**
   * Check if all mandatory deliverables are validated
   */
  areDeliverablesComplete(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    return contract.deliverables
      .filter(d => d.required)
      .every(d => d.validated);
  }

  /**
   * Check if all mandatory acceptance criteria are verified
   */
  areCriteriaMet(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    return contract.acceptanceCriteria
      .filter(c => c.mandatory)
      .every(c => c.verified);
  }

  /**
   * Get overall contract completion percentage
   */
  getCompletionPercentage(contractId: string): number {
    const contract = this.contracts.get(contractId);
    if (!contract) return 0;

    const deliverableScore = contract.deliverables.filter(d => d.validated).length / Math.max(contract.deliverables.length, 1);
    const criteriaScore = contract.acceptanceCriteria.filter(c => c.verified).length / Math.max(contract.acceptanceCriteria.length, 1);
    const budgetScore = Math.min(1, contract.budget.currentSpendUsd / Math.max(contract.budget.maxApiCostUsd, 1));

    return Math.round((deliverableScore * 0.4 + criteriaScore * 0.4 + budgetScore * 0.2) * 100);
  }

  /**
   * Infer deliverables from mission description
   */
  private inferDeliverables(requested: DeliverableType[] | undefined, mission: string): DeliverableSpec[] {
    if (requested && requested.length > 0) {
      return requested.map(type => ({
        type,
        description: `${type} for: ${mission}`,
        required: true,
        validated: false,
      }));
    }

    // Auto-infer from mission text
    const missionLower = mission.toLowerCase();
    const deliverables: DeliverableSpec[] = [];

    // Always include README and documentation
    deliverables.push(
      { type: DeliverableType.README, description: 'Project README', required: true, validated: false },
      { type: DeliverableType.DOCUMENTATION, description: 'Technical documentation', required: true, validated: false },
    );

    if (missionLower.includes('saas') || missionLower.includes('application') || missionLower.includes('app') || missionLower.includes('développ') || missionLower.includes('créer') || missionLower.includes('create')) {
      deliverables.push(
        { type: DeliverableType.SOURCE_CODE, description: 'Application source code', required: true, validated: false },
        { type: DeliverableType.TEST_SUITE, description: 'Automated test suite', required: true, validated: false },
        { type: DeliverableType.DOCKER_IMAGE, description: 'Docker configuration', required: true, validated: false },
        { type: DeliverableType.DEPLOYMENT, description: 'Deployment scripts and configuration', required: false, validated: false },
      );
    }

    if (missionLower.includes('rapport') || missionLower.includes('report') || missionLower.includes('audit') || missionLower.includes('analyse') || missionLower.includes('analyze')) {
      deliverables.push(
        { type: DeliverableType.PDF_REPORT, description: 'Analysis report (PDF)', required: true, validated: false },
      );
    }

    if (missionLower.includes('api') || missionLower.includes('backend')) {
      deliverables.push(
        { type: DeliverableType.API_SPEC, description: 'API specification', required: true, validated: false },
        { type: DeliverableType.DATABASE_SCRIPT, description: 'Database migration scripts', required: false, validated: false },
      );
    }

    // Default: at minimum source code + tests
    if (!deliverables.find(d => d.type === DeliverableType.SOURCE_CODE)) {
      deliverables.push(
        { type: DeliverableType.SOURCE_CODE, description: 'Generated source code', required: true, validated: false },
      );
    }

    return deliverables;
  }

  /**
   * Generate default milestones based on deadline
   */
  private generateDefaultMilestones(deadline: Date): any[] {
    const totalMs = deadline.getTime() - Date.now();
    const now = Date.now();
    const states = ['PLANNED', 'RESEARCH', 'BUILDING', 'TESTING', 'AUDITING', 'CERTIFYING', 'DELIVERING'];
    const weights = [0.05, 0.15, 0.35, 0.15, 0.1, 0.1, 0.1];

    return states.map((state, idx) => {
      const offsetMs = weights.slice(0, idx + 1).reduce((a, b) => a + b, 0) * totalMs;
      return {
        name: state,
        state,
        estimatedAt: new Date(now + offsetMs),
        status: 'pending' as const,
      };
    });
  }

  /**
   * Generate default acceptance criteria from mission text
   */
  private generateDefaultCriteria(mission: string): string[] {
    const criteria = [
      'All required deliverables are produced and accessible',
      'No critical errors or exceptions during execution',
      'Code passes lint and compilation checks',
    ];

    const missionLower = mission.toLowerCase();
    if (missionLower.includes('test') || missionLower.includes('qa')) {
      criteria.push('Test coverage meets minimum threshold (80%)');
      criteria.push('All test cases pass successfully');
    }
    if (missionLower.includes('sécur') || missionLower.includes('security') || missionLower.includes('audit')) {
      criteria.push('Security audit passes with no critical findings');
      criteria.push('No sensitive data exposed in deliverables');
    }
    if (missionLower.includes('déploy') || missionLower.includes('deploy')) {
      criteria.push('Deployment succeeds without manual intervention');
      criteria.push('Application is accessible and responsive after deployment');
    }

    return criteria;
  }
}
