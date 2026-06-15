import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type CreditTransactionType = 'purchase' | 'usage' | 'admin_add' | 'admin_deduct' | 'bonus';

@Entity({ schema: 'credit', name: 'credit_accounts' })
export class CreditAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  @Column({ name: 'total_purchased', type: 'integer', default: 0 })
  totalPurchased: number;

  @Column({ name: 'total_used', type: 'integer', default: 0 })
  totalUsed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity({ schema: 'credit', name: 'credit_transactions' })
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'admin_id', nullable: true })
  adminId: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @Column({ name: 'mission_id', nullable: true })
  missionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity({ schema: 'credit', name: 'admin_settings' })
export class AdminSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
