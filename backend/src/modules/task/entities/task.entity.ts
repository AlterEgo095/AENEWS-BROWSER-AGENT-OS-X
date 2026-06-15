import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

@Entity({ schema: 'agent', name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  type: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @ManyToOne('Agent', 'tasks', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: import('../../agent/entities/agent.entity').Agent;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne('Tenant', 'tasks')
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ default: 5 })
  priority: number;

  @Column({ type: 'jsonb', default: '{}' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'parent_task_id', nullable: true })
  parentTaskId: string;

  @ManyToOne('Task', undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Task;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
