-- PDEOS Phase 4 — Migration: create memory_entries table
-- File: backend/src/migrations/1700000000000-CreateMemoryEntries.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMemoryEntries1700000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TYPE memory_level_enum AS ENUM ('stm', 'mtm', 'ltm')`);
    await q.query(`CREATE TYPE memory_type_enum AS ENUM ('mission','habit','preference','failure','success','project','context','knowledge')`);
    await q.createTable(new Table({
      name: 'memory_entries',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
        { name: 'level', type: 'memory_level_enum', isNullable: false },
        { name: 'type', type: 'memory_type_enum', isNullable: true },
        { name: 'key', type: 'varchar', length: '512', isNullable: false },
        { name: 'value', type: 'jsonb', isNullable: false },
        { name: 'tenantId', type: 'varchar', length: '64', isNullable: true },
        { name: 'userId', type: 'varchar', length: '64', isNullable: true },
        { name: 'expiresAt', type: 'timestamptz', isNullable: true },
        { name: 'createdAt', type: 'timestamptz', default: 'now()' },
      ],
    }), true);
    await q.createIndices('memory_entries', [
      new TableIndex({ name: 'idx_memory_level_tenant', columnNames: ['level', 'tenantId'] }),
      new TableIndex({ name: 'idx_memory_level_user', columnNames: ['level', 'userId'] }),
      new TableIndex({ name: 'idx_memory_type_tenant', columnNames: ['type', 'tenantId'] }),
      new TableIndex({ name: 'idx_memory_key', columnNames: ['key'] }),
      new TableIndex({ name: 'idx_memory_created', columnNames: ['createdAt'] }),
    ]);
    await q.query(`CREATE INDEX idx_memory_value_gin ON memory_entries USING GIN (value jsonb_path_ops)`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.dropTable('memory_entries');
    await q.query(`DROP TYPE IF EXISTS memory_level_enum; DROP TYPE IF EXISTS memory_type_enum;`);
  }
}
