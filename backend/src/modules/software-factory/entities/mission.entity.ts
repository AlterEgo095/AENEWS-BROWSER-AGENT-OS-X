/**
 * AENEWS Software Factory — Mission Entity
 *
 * TypeORM entity representing a mission in the software factory.
 * Persists mission lifecycle, objectives, constraints, and results.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

// ─── Enums ──────────────────────────────────────────────────

export enum MissionState {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RESEARCH = 'RESEARCH',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  AUDITING = 'AUDITING',
  CERTIFYING = 'CERTIFYING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum MissionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── JSON Column Interfaces ────────────────────────────────

export interface MissionObjective {
  id: string;
  description: string;
  successCriteria: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// ─── Entity ────────────────────────────────────────────────

@Entity({ schema: 'software_factory', name: 'missions' })
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: MissionState,
    default: MissionState.DRAFT,
  })
  state: MissionState;

  @Column({
    type: 'enum',
    enum: MissionPriority,
    default: MissionPriority.MEDIUM,
  })
  priority: MissionPriority;

  @Column({ name: 'requester_id', length: 255 })
  requesterId: string;

  @Column({
    name: 'assigned_team_ids',
    type: 'jsonb',
    default: "'[]'",
  })
  assignedTeamIds: string[];

  @Column({ type: 'jsonb', default: "'[]'" })
  objectives: MissionObjective[];

  @Column({ type: 'jsonb', default: "'[]'" })
  constraints: string[];

  @Column({
    name: 'required_capabilities',
    type: 'jsonb',
    default: "'[]'",
  })
  requiredCapabilities: string[];

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant | null;

  @OneToMany('MissionContract', 'mission')
  contracts: import('./mission-contract.entity').MissionContract[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
