/**
 * AENEWS Software Factory — Mission Contract Entity
 *
 * TypeORM entity representing a contract bound to a mission.
 * Tracks terms, budget, deliverables, and contract lifecycle status.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// ─── Enums ──────────────────────────────────────────────────

export enum ContractStatus {
  NEGOTIATING = 'NEGOTIATING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  FULFILLED = 'FULFILLED',
}

// ─── Entity ────────────────────────────────────────────────

@Entity({ schema: 'software_factory', name: 'mission_contracts' })
export class MissionContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mission_id' })
  missionId: string;

  @ManyToOne('Mission', 'contracts')
  @JoinColumn({ name: 'mission_id' })
  mission: import('./mission.entity').Mission;

  @Column({ length: 100 })
  type: string;

  @Column({ type: 'jsonb', default: '{}' })
  terms: Record<string, any>;

  @Column({ type: 'integer', nullable: true })
  budget: number | null;

  @Column({ type: 'integer', default: 0 })
  spent: number;

  @Column({ type: 'jsonb', default: "'[]'" })
  deliverables: Record<string, any>[];

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.NEGOTIATING,
  })
  status: ContractStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
