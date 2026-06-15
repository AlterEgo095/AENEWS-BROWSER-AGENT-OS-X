import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AgentStatus } from './agent.entity';

@Entity({ schema: 'agent', name: 'executions' })
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @ManyToOne('Agent', 'executions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: import('./agent.entity').Agent;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @ManyToOne('Task', undefined, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task: import('../../task/entities/task.entity').Task;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne('Tenant', undefined)
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant;

  @Column({ type: 'enum', enum: AgentStatus })
  status: AgentStatus;

  @Column({ type: 'jsonb', default: '{}' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
