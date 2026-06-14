import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  // ──────────────────────────────────────────────────────────────
  // UP — Create the complete AENEWS Agent OS X schema
  // ──────────────────────────────────────────────────────────────

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Create schemas ──────────────────────────────────────────
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "tenant"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "agent"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "audit"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "software_factory"`);

    // ── Create enum types ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "tenant"."user_role_enum" AS ENUM (
        'super_admin', 'tenant_admin', 'operator', 'viewer'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent"."cluster_type_enum" AS ENUM (
        'browser', 'computer', 'coding', 'office', 'marketing',
        'business', 'infrastructure', 'security', 'meta-intelligence',
        'llm-intelligence', 'intelligent-orchestration', 'watchdog',
        'self-evolution', 'certification'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent"."agent_status_enum" AS ENUM (
        'idle', 'running', 'paused', 'error', 'stopped', 'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent"."task_status_enum" AS ENUM (
        'pending', 'queued', 'running', 'completed', 'failed',
        'cancelled', 'retrying'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit"."event_severity_enum" AS ENUM (
        'info', 'warning', 'error', 'critical'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "software_factory"."mission_state_enum" AS ENUM (
        'DRAFT', 'PLANNED', 'RESEARCH', 'BUILDING', 'TESTING',
        'AUDITING', 'CERTIFYING', 'DELIVERING', 'COMPLETED',
        'FAILED', 'CANCELLED', 'ARCHIVED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "software_factory"."mission_priority_enum" AS ENUM (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "software_factory"."contract_status_enum" AS ENUM (
        'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'FULFILLED'
      )
    `);

    // ── tenants table ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tenant"."tenants" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"            VARCHAR(255) NOT NULL,
        "slug"            VARCHAR(100) NOT NULL UNIQUE,
        "plan"            VARCHAR(50)  NOT NULL DEFAULT 'free',
        "is_active"       BOOLEAN      NOT NULL DEFAULT true,
        "config"          JSONB        NOT NULL DEFAULT '{}',
        "quotas"          JSONB        NOT NULL DEFAULT '{"maxAgents": 100, "maxTasks": 10000, "maxStorage": 5120, "maxConcurrentExecutions": 50}',
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // ── users table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tenant"."users" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "email"           VARCHAR(255) NOT NULL UNIQUE,
        "password_hash"   VARCHAR(255) NOT NULL,
        "first_name"      VARCHAR(100) NOT NULL,
        "last_name"       VARCHAR(100) NOT NULL,
        "role"            "tenant"."user_role_enum" NOT NULL DEFAULT 'viewer',
        "tenant_id"       UUID         NOT NULL,
        "is_active"       BOOLEAN      NOT NULL DEFAULT true,
        "last_login_at"   TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_tenant_id" ON "tenant"."users" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_users_email" ON "tenant"."users" ("email")
    `);

    // ── agents table ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "agent"."agents" (
        "id"                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"              VARCHAR(255) NOT NULL,
        "cluster"           "agent"."cluster_type_enum" NOT NULL,
        "status"            "agent"."agent_status_enum" NOT NULL DEFAULT 'idle',
        "config"            JSONB        NOT NULL DEFAULT '{}',
        "capabilities"      TEXT[]       NOT NULL DEFAULT '{}',
        "tenant_id"         UUID         NOT NULL,
        "version"           VARCHAR(50)  NOT NULL DEFAULT '1.0.0',
        "description"       TEXT,
        "is_enabled"        BOOLEAN      NOT NULL DEFAULT true,
        "last_execution_at" TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_agents_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_agents_tenant_id" ON "agent"."agents" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_agents_cluster" ON "agent"."agents" ("cluster")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_agents_status" ON "agent"."agents" ("status")
    `);

    // ── executions table ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "agent"."executions" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "agent_id"      UUID         NOT NULL,
        "task_id"       UUID,
        "tenant_id"     UUID         NOT NULL,
        "status"        "agent"."agent_status_enum" NOT NULL,
        "input"         JSONB        NOT NULL DEFAULT '{}',
        "output"        JSONB,
        "error"         TEXT,
        "duration_ms"   INTEGER,
        "metadata"      JSONB        NOT NULL DEFAULT '{}',
        "started_at"    TIMESTAMPTZ  NOT NULL,
        "completed_at"  TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_executions_agent" FOREIGN KEY ("agent_id")
          REFERENCES "agent"."agents"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_executions_task" FOREIGN KEY ("task_id")
          REFERENCES "agent"."tasks"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_executions_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_executions_agent_id" ON "agent"."executions" ("agent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_executions_tenant_id" ON "agent"."executions" ("tenant_id")
    `);

    // ── tasks table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "agent"."tasks" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "type"            VARCHAR(100) NOT NULL,
        "agent_id"        UUID,
        "tenant_id"       UUID         NOT NULL,
        "status"          "agent"."task_status_enum" NOT NULL DEFAULT 'pending',
        "priority"        INTEGER      NOT NULL DEFAULT 5,
        "input"           JSONB        NOT NULL DEFAULT '{}',
        "output"          JSONB,
        "error"           TEXT,
        "retry_count"     INTEGER      NOT NULL DEFAULT 0,
        "max_retries"     INTEGER      NOT NULL DEFAULT 3,
        "parent_task_id"  UUID,
        "scheduled_at"    TIMESTAMPTZ,
        "started_at"      TIMESTAMPTZ,
        "completed_at"    TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_tasks_agent" FOREIGN KEY ("agent_id")
          REFERENCES "agent"."agents"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_tasks_parent" FOREIGN KEY ("parent_task_id")
          REFERENCES "agent"."tasks"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_tenant_id" ON "agent"."tasks" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_agent_id" ON "agent"."tasks" ("agent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_status" ON "agent"."tasks" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_parent_task_id" ON "agent"."tasks" ("parent_task_id")
    `);

    // ── plugins table ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "agent"."plugins" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"          VARCHAR(255) NOT NULL,
        "version"       VARCHAR(50)  NOT NULL,
        "description"   TEXT,
        "author"        VARCHAR(255),
        "is_enabled"    BOOLEAN      NOT NULL DEFAULT true,
        "config"        JSONB        NOT NULL DEFAULT '{}',
        "hooks"         TEXT[]       NOT NULL DEFAULT '{}',
        "tenant_id"     UUID,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_plugins_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_plugin_name_version_tenant" UNIQUE ("name", "version", "tenant_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_plugins_tenant_id" ON "agent"."plugins" ("tenant_id")
    `);

    // ── events table ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit"."events" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "type"        VARCHAR(255) NOT NULL,
        "namespace"   VARCHAR(100) NOT NULL,
        "payload"     JSONB        NOT NULL DEFAULT '{}',
        "source"      VARCHAR(255) NOT NULL,
        "severity"    "audit"."event_severity_enum" NOT NULL DEFAULT 'info',
        "tenant_id"   UUID,
        "metadata"    JSONB        NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_events_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_events_tenant_id" ON "audit"."events" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_events_namespace" ON "audit"."events" ("namespace")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_events_type" ON "audit"."events" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_events_created_at" ON "audit"."events" ("created_at")
    `);

    // ── audit_log table ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit"."audit_log" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "action"       VARCHAR(100) NOT NULL,
        "entity_type"  VARCHAR(100) NOT NULL,
        "entity_id"    UUID,
        "user_id"      UUID,
        "tenant_id"    UUID,
        "old_values"   JSONB,
        "new_values"   JSONB,
        "ip_address"   INET,
        "user_agent"   TEXT,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_audit_log_user" FOREIGN KEY ("user_id")
          REFERENCES "tenant"."users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_audit_log_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_tenant_id" ON "audit"."audit_log" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_user_id" ON "audit"."audit_log" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_entity" ON "audit"."audit_log" ("entity_type", "entity_id")
    `);

    // ── missions table ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "software_factory"."missions" (
        "id"                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"                  VARCHAR(255) NOT NULL,
        "description"           TEXT         NOT NULL,
        "state"                 "software_factory"."mission_state_enum" NOT NULL DEFAULT 'DRAFT',
        "priority"              "software_factory"."mission_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "requester_id"          VARCHAR(255) NOT NULL,
        "assigned_team_ids"     JSONB        NOT NULL DEFAULT '[]',
        "objectives"            JSONB        NOT NULL DEFAULT '[]',
        "constraints"           JSONB        NOT NULL DEFAULT '[]',
        "required_capabilities" JSONB        NOT NULL DEFAULT '[]',
        "result"                JSONB,
        "error"                 TEXT,
        "progress"              INTEGER      NOT NULL DEFAULT 0,
        "started_at"            TIMESTAMPTZ,
        "completed_at"          TIMESTAMPTZ,
        "deadline"              TIMESTAMPTZ,
        "tenant_id"             UUID,
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_missions_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenant"."tenants"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_missions_tenant_id" ON "software_factory"."missions" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_missions_state" ON "software_factory"."missions" ("state")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_missions_priority" ON "software_factory"."missions" ("priority")
    `);

    // ── mission_contracts table ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "software_factory"."mission_contracts" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "mission_id"    UUID         NOT NULL,
        "type"          VARCHAR(100) NOT NULL,
        "terms"         JSONB        NOT NULL DEFAULT '{}',
        "budget"        INTEGER,
        "spent"         INTEGER      NOT NULL DEFAULT 0,
        "deliverables"  JSONB        NOT NULL DEFAULT '[]',
        "status"        "software_factory"."contract_status_enum" NOT NULL DEFAULT 'NEGOTIATING',
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_mission_contracts_mission" FOREIGN KEY ("mission_id")
          REFERENCES "software_factory"."missions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_mission_contracts_mission_id" ON "software_factory"."mission_contracts" ("mission_id")
    `);
  }

  // ──────────────────────────────────────────────────────────────
  // DOWN — Reverse the migration (drop everything)
  // ──────────────────────────────────────────────────────────────

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Drop tables (order respects FK dependencies) ────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "software_factory"."mission_contracts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "software_factory"."missions"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "audit"."audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit"."events"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "agent"."plugins"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent"."executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent"."tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent"."agents"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."tenants"`);

    // ── Drop enum types ─────────────────────────────────────────
    await queryRunner.query(`DROP TYPE IF EXISTS "software_factory"."contract_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "software_factory"."mission_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "software_factory"."mission_state_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit"."event_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent"."task_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent"."agent_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent"."cluster_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant"."user_role_enum"`);

    // ── Drop schemas ────────────────────────────────────────────
    await queryRunner.query(`DROP SCHEMA IF EXISTS "software_factory"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "audit"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "agent"`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "tenant"`);
  }
}
