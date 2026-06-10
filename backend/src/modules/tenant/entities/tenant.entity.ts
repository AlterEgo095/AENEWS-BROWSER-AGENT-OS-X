import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity({ schema: 'tenant', name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 50, default: 'free' })
  plan: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @Column({
    type: 'jsonb',
    default: () =>
      `'{"maxAgents": 100, "maxTasks": 10000, "maxStorage": 5120, "maxConcurrentExecutions": 50}'`,
  })
  quotas: {
    maxAgents: number;
    maxTasks: number;
    maxStorage: number;
    maxConcurrentExecutions: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('User', 'tenant')
  users: import('../../user/entities/user.entity').User[];

  @OneToMany('Agent', 'tenant')
  agents: import('../../agent/entities/agent.entity').Agent[];

  @OneToMany('Task', 'tenant')
  tasks: import('../../task/entities/task.entity').Task[];
}
