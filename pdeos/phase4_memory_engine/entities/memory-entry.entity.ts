/**
 * PDEOS Phase 4 — Memory Engine entity
 * Table: memory_entries (5 indexes + GIN JSONB)
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { MemoryLevel, MemoryType } from '../dto/memory.dto';

@Entity('memory_entries')
@Index(['level', 'tenantId'])
@Index(['level', 'userId'])
@Index(['type', 'tenantId'])
@Index(['key'])
@Index(['createdAt'])
export class MemoryEntryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: MemoryLevel }) level: MemoryLevel;
  @Column({ type: 'enum', enum: MemoryType, nullable: true }) type: MemoryType;
  @Column({ type: 'varchar', length: 512 }) key: string;
  @Column({ type: 'jsonb' }) value: any;
  @Column({ type: 'varchar', length: 64, nullable: true }) tenantId: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) userId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
