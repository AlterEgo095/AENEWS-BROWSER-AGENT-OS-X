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

export enum ClusterType {
  BROWSER = 'browser',
  COMPUTER = 'computer',
  CODING = 'coding',
  OFFICE = 'office',
  MARKETING = 'marketing',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  META_INTELLIGENCE = 'meta-intelligence',
  // Phase 2 — Intelligence Clusters
  LLM_INTELLIGENCE = 'llm-intelligence',
  INTELLIGENT_ORCHESTRATION = 'intelligent-orchestration',
  WATCHDOG = 'watchdog',
  SELF_EVOLUTION = 'self-evolution',
  CERTIFICATION = 'certification',
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}

@Entity({ schema: 'agent', name: 'agents' })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ClusterType })
  cluster: ClusterType;

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.IDLE })
  status: AgentStatus;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @Column({ type: 'text', array: true, default: '{}' })
  capabilities: string[];

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne('Tenant', 'agents')
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant;

  @Column({ length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_execution_at', type: 'timestamptz', nullable: true })
  lastExecutionAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('Task', 'agent')
  tasks: import('../../task/entities/task.entity').Task[];

  @OneToMany('Execution', 'agent')
  executions: import('./execution.entity').Execution[];
}
