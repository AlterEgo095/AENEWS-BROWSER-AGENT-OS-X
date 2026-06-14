import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Collaboration State Entity — PostgreSQL-backed persistence for collaboration checkpoints.
 *
 * Used by CollaborationPersistenceService as the L2 (durable) store,
 * with in-memory Maps serving as L1 (hot) cache.
 */
@Entity({ name: 'collaboration_state' })
export class CollaborationState {
  @PrimaryColumn({ length: 128 })
  collaborationId: string;

  @Column({ length: 64 })
  phase: string;

  @Column({ type: 'jsonb', default: '[]' })
  agentIds: string[];

  @Column({ type: 'jsonb', default: '[]' })
  assignedAgents: string[];

  @Column({ type: 'jsonb', default: '[]' })
  results: any[];

  @Column({ type: 'jsonb', default: '[]' })
  errors: string[];

  @Column({ type: 'bigint' })
  startedAt: number;

  @Column({ type: 'bigint' })
  lastCheckpointAt: number;

  @Column({ name: 'parent_mission_id', length: 128, nullable: true })
  parentMissionId: string | null;

  @Column({ length: 64 })
  pattern: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
