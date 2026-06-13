/**
 * AENEWS Software Factory — Mission Contract Interface
 *
 * Every mission is governed by a contract that defines:
 * objective, constraints, budget, deadline, acceptance criteria,
 * deliverables, and quality level.
 */

export enum MissionQuality {
  DRAFT = 'draft',
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  MISSION_CRITICAL = 'mission_critical',
}

export enum DeliverableType {
  SOURCE_CODE = 'source_code',
  DOCKER_IMAGE = 'docker_image',
  PDF_REPORT = 'pdf_report',
  TEST_SUITE = 'test_suite',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  README = 'readme',
  ARCHIVE_ZIP = 'archive_zip',
  DATABASE_SCRIPT = 'database_script',
  API_SPEC = 'api_spec',
  CONFIGURATION = 'configuration',
  PRESENTATION = 'presentation',
  SPREADSHEET = 'spreadsheet',
  VIDEO = 'video',
  CUSTOM = 'custom',
}

export interface DeliverableSpec {
  type: DeliverableType;
  description: string;
  format?: string;
  required: boolean;
  path?: string;
  validated: boolean;
  validationNotes?: string;
}

export interface BudgetConstraint {
  maxApiCostUsd: number;
  currentSpendUsd: number;
  maxComputeHours: number;
  currentComputeHours: number;
  maxAgentInstances: number;
  currentAgentInstances: number;
}

export interface TimeConstraint {
  deadline: Date;
  estimatedDuration: string;
  startedAt?: Date;
  completedAt?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  state: MissionState;
  estimatedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  category: 'functional' | 'performance' | 'security' | 'quality' | 'compliance';
  mandatory: boolean;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface MissionConstraint {
  type: 'technical' | 'business' | 'legal' | 'security' | 'resource';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  enforced: boolean;
}

export interface MissionContract {
  id: string;
  mission: string;
  description: string;
  quality: MissionQuality;
  deadline: TimeConstraint;
  budget: BudgetConstraint;
  deliverables: DeliverableSpec[];
  acceptanceCriteria: AcceptanceCriterion[];
  constraints: MissionConstraint[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  parentId?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ContractViolation {
  id: string;
  contractId: string;
  type:
    | 'budget_exceeded'
    | 'deadline_missed'
    | 'quality_below_minimum'
    | 'deliverable_missing'
    | 'constraint_broken';
  description: string;
  severity: 'warning' | 'critical' | 'fatal';
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
}

export interface ContractNegotiationResult {
  accepted: boolean;
  modifiedContract?: Partial<MissionContract>;
  warnings: string[];
  estimatedCost: number;
  estimatedDuration: string;
  feasibilityScore: number; // 0-100
}

import { MissionState } from './mission-state.interface';
