/**
 * AENEWS Agent OS X — Phase 13: Performance Indexes Migration
 *
 * Creates composite and partial indexes for all high-frequency query patterns.
 * Analyzed query patterns:
 *   - Agent lookups by tenant + status + cluster
 *   - Execution history by agent_id + started_at
 *   - Task queue queries by tenant + status + priority
 *   - Mission queries by tenant + state
 *   - Event queries by type + namespace + created_at
 *   - Audit log queries by tenant + action + created_at
 *   - User login by email
 *   - Plugin lookups by tenant + is_active
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class PerformanceIndexes1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════
    //  Schema: agent
    // ═══════════════════════════════════════════════════════════

    // Agents — most common query: find agents by tenant + status (+ optional cluster)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_tenant_status
      ON agent.agents (tenant_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_tenant_cluster_status
      ON agent.agents (tenant_id, cluster, status)
    `);

    // Agents — enabled agents lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_tenant_enabled
      ON agent.agents (tenant_id, is_enabled)
      WHERE is_enabled = true
    `);

    // Agents — GIN index on capabilities array for array-contains queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_capabilities_gin
      ON agent.agents USING GIN (capabilities)
    `);

    // Agents — last execution tracking
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_last_execution
      ON agent.agents (tenant_id, last_execution_at DESC)
      WHERE last_execution_at IS NOT NULL
    `);

    // Executions — history by agent + time range
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_agent_started
      ON agent.executions (agent_id, started_at DESC)
    `);

    // Executions — tenant-scoped queries with status filter
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_tenant_status
      ON agent.executions (tenant_id, status, started_at DESC)
    `);

    // Executions — recent failures for watchdog
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_recent_failures
      ON agent.executions (agent_id, started_at DESC)
      WHERE status = 'error'
    `);

    // Executions — slow execution detection (duration > 30s)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_slow
      ON agent.executions (agent_id, duration_ms DESC)
      WHERE duration_ms > 30000
    `);

    // Tasks — queue processing: tenant + status + priority
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_status_priority
      ON agent.tasks (tenant_id, status, priority DESC, created_at ASC)
    `);

    // Tasks — scheduled tasks lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_scheduled
      ON agent.tasks (status, scheduled_at ASC)
      WHERE status = 'queued' AND scheduled_at IS NOT NULL
    `);

    // Tasks — agent task history
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_agent_status
      ON agent.tasks (agent_id, status, created_at DESC)
      WHERE agent_id IS NOT NULL
    `);

    // Tasks — parent task subtasks
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_parent
      ON agent.tasks (parent_task_id)
      WHERE parent_task_id IS NOT NULL
    `);

    // Tasks — retry-eligible tasks
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_retry_eligible
      ON agent.tasks (status, retry_count, max_retries)
      WHERE status = 'failed' AND retry_count < max_retries
    `);

    // ═══════════════════════════════════════════════════════════
    //  Schema: software_factory
    // ═══════════════════════════════════════════════════════════

    // Missions — tenant + state (most common filter)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_tenant_state
      ON software_factory.missions (tenant_id, state, updated_at DESC)
    `);

    // Missions — active missions by priority
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_active_priority
      ON software_factory.missions (state, priority DESC, created_at ASC)
      WHERE state IN ('DRAFT', 'PLANNED', 'BUILDING', 'TESTING', 'AUDITING')
    `);

    // Missions — requester's missions
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_requester
      ON software_factory.missions (requester_id, created_at DESC)
    `);

    // Missions — deadline tracking
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_deadline
      ON software_factory.missions (state, deadline ASC)
      WHERE deadline IS NOT NULL AND state NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED')
    `);

    // Missions — GIN index on required_capabilities
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missions_capabilities_gin
      ON software_factory.missions USING GIN (required_capabilities)
    `);

    // Mission contracts — mission lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_mission
      ON software_factory.mission_contracts (mission_id)
    `);

    // ═══════════════════════════════════════════════════════════
    //  Schema: audit
    // ═══════════════════════════════════════════════════════════

    // Events — type + namespace + time range (event bus queries)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_type_namespace_time
      ON audit.events (type, namespace, created_at DESC)
    `);

    // Events — tenant-scoped recent events
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_time
      ON audit.events (tenant_id, created_at DESC)
      WHERE tenant_id IS NOT NULL
    `);

    // Events — severity-based alerting
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_severity
      ON audit.events (severity, created_at DESC)
      WHERE severity IN ('error', 'critical')
    `);

    // Events — source-based filtering
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_source_time
      ON audit.events (source, created_at DESC)
    `);

    // Events — GIN index on payload for JSON queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_payload_gin
      ON audit.events USING GIN (payload)
    `);

    // Audit log — tenant + action + time (compliance queries)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tenant_action_time
      ON audit.audit_log (tenant_id, action, created_at DESC)
    `);

    // Audit log — entity type + ID lookups
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_entity
      ON audit.audit_log (entity_type, entity_id, created_at DESC)
    `);

    // Audit log — user activity tracking
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_time
      ON audit.audit_log (user_id, created_at DESC)
      WHERE user_id IS NOT NULL
    `);

    // Audit log — retention cleanup (old records)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_retention
      ON audit.audit_log (created_at ASC)
    `);

    // ═══════════════════════════════════════════════════════════
    //  Schema: tenant
    // ═══════════════════════════════════════════════════════════

    // Tenants — active tenant lookup
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_active
      ON tenant.tenants (is_active, slug)
      WHERE is_active = true
    `);

    // ═══════════════════════════════════════════════════════════
    //  Schema: tenant (users table)
    // ═══════════════════════════════════════════════════════════

    // Users — email lookup for auth (unique already, but btree for login speed)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_tenant
      ON tenant.users (email, tenant_id)
    `);

    // ═══════════════════════════════════════════════════════════
    //  Schema: agent (plugins table)
    // ═══════════════════════════════════════════════════════════

    // Plugins — active plugins by tenant
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plugins_tenant_active
      ON agent.plugins (tenant_id, is_enabled)
      WHERE is_enabled = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    const indexes = [
      'idx_plugins_tenant_active',
      'idx_users_email_tenant',
      'idx_tenants_active',
      'idx_audit_retention',
      'idx_audit_user_time',
      'idx_audit_entity',
      'idx_audit_tenant_action_time',
      'idx_events_payload_gin',
      'idx_events_source_time',
      'idx_events_severity',
      'idx_events_tenant_time',
      'idx_events_type_namespace_time',
      'idx_contracts_mission',
      'idx_missions_capabilities_gin',
      'idx_missions_deadline',
      'idx_missions_requester',
      'idx_missions_active_priority',
      'idx_missions_tenant_state',
      'idx_tasks_retry_eligible',
      'idx_tasks_parent',
      'idx_tasks_agent_status',
      'idx_tasks_scheduled',
      'idx_tasks_tenant_status_priority',
      'idx_executions_slow',
      'idx_executions_recent_failures',
      'idx_executions_tenant_status',
      'idx_executions_agent_started',
      'idx_agents_last_execution',
      'idx_agents_capabilities_gin',
      'idx_agents_tenant_enabled',
      'idx_agents_tenant_cluster_status',
      'idx_agents_tenant_status',
    ];

    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS ${idx}`).catch(() => {
        // Ignore errors — index may be in a different schema
      });
    }
  }
}
