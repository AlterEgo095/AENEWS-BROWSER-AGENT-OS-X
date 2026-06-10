import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity({ schema: 'audit', name: 'events' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  type: string;

  @Column({ length: 100 })
  namespace: string;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, any>;

  @Column({ length: 255 })
  source: string;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @ManyToOne('Tenant', null, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
