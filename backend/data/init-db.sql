-- ============================================================
-- AENEWS Agent OS X — Database Initialization
-- ============================================================
-- SINGLE SOURCE OF TRUTH for DB schema initialization.
--
-- This script is executed by the PostgreSQL Docker container on
-- first startup (when the data volume is empty). It creates the
-- schemas, enum types, tables, indexes, foreign keys, triggers,
-- and seed data required for the platform.
--
-- Location:  backend/data/init-db.sql
-- Symlinked: docker/init-db.sql → ../../backend/data/init-db.sql
--
-- Do NOT create duplicate init-db.sql files elsewhere.
-- Previous duplicates removed:
--   - backend/docker/init-db.sql  (DELETED — was contradictory)
--   - backend/db/init-db.sql      (DELETED — was contradictory)
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Schemas ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS "tenant";
CREATE SCHEMA IF NOT EXISTS "agent";
CREATE SCHEMA IF NOT EXISTS "audit";
CREATE SCHEMA IF NOT EXISTS "software_factory";

-- ─── Grant schema permissions ─────────────────────────────────
GRANT ALL PRIVILEGES ON SCHEMA "tenant"            TO aenews;
GRANT ALL PRIVILEGES ON SCHEMA "agent"             TO aenews;
GRANT ALL PRIVILEGES ON SCHEMA "audit"             TO aenews;
GRANT ALL PRIVILEGES ON SCHEMA "software_factory"  TO aenews;

-- ─── Enum types (matching TypeORM entities) ───────────────────

-- tenant.user_role_enum
CREATE TYPE "tenant"."user_role_enum" AS ENUM (
  'super_admin', 'tenant_admin', 'operator', 'viewer'
);

-- agent.cluster_type_enum
CREATE TYPE "agent"."cluster_type_enum" AS ENUM (
  'browser', 'computer', 'coding', 'office', 'marketing',
  'business', 'infrastructure', 'security', 'meta-intelligence',
  'llm-intelligence', 'intelligent-orchestration', 'watchdog',
  'self-evolution', 'certification'
);

-- agent.agent_status_enum
CREATE TYPE "agent"."agent_status_enum" AS ENUM (
  'idle', 'running', 'paused', 'error', 'stopped', 'completed'
);

-- agent.task_status_enum
CREATE TYPE "agent"."task_status_enum" AS ENUM (
  'pending', 'queued', 'running', 'completed', 'failed',
  'cancelled', 'retrying'
);

-- audit.event_severity_enum
CREATE TYPE "audit"."event_severity_enum" AS ENUM (
  'info', 'warning', 'error', 'critical'
);

-- software_factory.mission_state_enum (UPPERCASE matching TypeORM)
CREATE TYPE "software_factory"."mission_state_enum" AS ENUM (
  'DRAFT', 'PLANNED', 'RESEARCH', 'BUILDING', 'TESTING',
  'AUDITING', 'CERTIFYING', 'DELIVERING', 'COMPLETED',
  'FAILED', 'CANCELLED', 'ARCHIVED'
);

-- software_factory.mission_priority_enum (UPPERCASE matching TypeORM)
CREATE TYPE "software_factory"."mission_priority_enum" AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

-- software_factory.contract_status_enum (UPPERCASE matching TypeORM)
CREATE TYPE "software_factory"."contract_status_enum" AS ENUM (
  'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'FULFILLED'
);

-- ─── Tables ───────────────────────────────────────────────────

-- ─── tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenant"."tenants" (
  "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "name"            VARCHAR(255) NOT NULL,
  "slug"            VARCHAR(100) NOT NULL UNIQUE,
  "plan"            VARCHAR(50)  NOT NULL DEFAULT 'free',
  "is_active"       BOOLEAN      NOT NULL DEFAULT true,
  "config"          JSONB        NOT NULL DEFAULT '{}',
  "quotas"          JSONB        NOT NULL DEFAULT '{"maxAgents": 100, "maxTasks": 10000, "maxStorage": 5120, "maxConcurrentExecutions": 50}',
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenant"."users" (
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
);

CREATE INDEX IF NOT EXISTS "idx_users_tenant_id" ON "tenant"."users" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_users_email"    ON "tenant"."users" ("email");

-- ─── agents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "agent"."agents" (
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
);

CREATE INDEX IF NOT EXISTS "idx_agents_tenant_id" ON "agent"."agents" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_agents_cluster"   ON "agent"."agents" ("cluster");
CREATE INDEX IF NOT EXISTS "idx_agents_status"    ON "agent"."agents" ("status");

-- ─── tasks ────────────────────────────────────────────────────
-- NOTE: tasks is created BEFORE executions to avoid circular FK issues
CREATE TABLE IF NOT EXISTS "agent"."tasks" (
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
  CONSTRAINT "fk_tasks_agent"  FOREIGN KEY ("agent_id")
    REFERENCES "agent"."agents"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_tasks_tenant" FOREIGN KEY ("tenant_id")
    REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_tasks_parent" FOREIGN KEY ("parent_task_id")
    REFERENCES "agent"."tasks"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_tasks_tenant_id"     ON "agent"."tasks" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_agent_id"      ON "agent"."tasks" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status"        ON "agent"."tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_parent_task_id" ON "agent"."tasks" ("parent_task_id");

-- ─── executions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "agent"."executions" (
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
  CONSTRAINT "fk_executions_agent"  FOREIGN KEY ("agent_id")
    REFERENCES "agent"."agents"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_executions_task"    FOREIGN KEY ("task_id")
    REFERENCES "agent"."tasks"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_executions_tenant"  FOREIGN KEY ("tenant_id")
    REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_executions_agent_id"  ON "agent"."executions" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_executions_tenant_id" ON "agent"."executions" ("tenant_id");

-- ─── plugins ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "agent"."plugins" (
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
);

CREATE INDEX IF NOT EXISTS "idx_plugins_tenant_id" ON "agent"."plugins" ("tenant_id");

-- ─── events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit"."events" (
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
);

CREATE INDEX IF NOT EXISTS "idx_events_tenant_id"  ON "audit"."events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_events_namespace"  ON "audit"."events" ("namespace");
CREATE INDEX IF NOT EXISTS "idx_events_type"       ON "audit"."events" ("type");
CREATE INDEX IF NOT EXISTS "idx_events_created_at" ON "audit"."events" ("created_at");

-- ─── audit_log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit"."audit_log" (
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
  CONSTRAINT "fk_audit_log_user"   FOREIGN KEY ("user_id")
    REFERENCES "tenant"."users"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_audit_log_tenant"  FOREIGN KEY ("tenant_id")
    REFERENCES "tenant"."tenants"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_log_tenant_id" ON "audit"."audit_log" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_user_id"   ON "audit"."audit_log" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity"    ON "audit"."audit_log" ("entity_type", "entity_id");

-- ─── missions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "software_factory"."missions" (
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
    REFERENCES "tenant"."tenants"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_missions_tenant_id" ON "software_factory"."missions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_missions_state"     ON "software_factory"."missions" ("state");
CREATE INDEX IF NOT EXISTS "idx_missions_priority"  ON "software_factory"."missions" ("priority");

-- ─── mission_contracts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "software_factory"."mission_contracts" (
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
);

CREATE INDEX IF NOT EXISTS "idx_mission_contracts_mission_id" ON "software_factory"."mission_contracts" ("mission_id");

-- ─── collaboration_state ──────────────────────────────────────
-- Durable persistence for multi-agent collaboration checkpoints.
-- Used by CollaborationPersistenceService as L2 (durable) store,
-- with in-memory Maps serving as L1 (hot) cache.
CREATE TABLE IF NOT EXISTS "agent"."collaboration_state" (
  "collaboration_id"  VARCHAR(128) NOT NULL PRIMARY KEY,
  "phase"             VARCHAR(64)  NOT NULL,
  "agent_ids"         JSONB        NOT NULL DEFAULT '[]',
  "assigned_agents"   JSONB        NOT NULL DEFAULT '[]',
  "results"           JSONB        NOT NULL DEFAULT '[]',
  "errors"            JSONB        NOT NULL DEFAULT '[]',
  "started_at"        BIGINT       NOT NULL,
  "last_checkpoint_at" BIGINT      NOT NULL,
  "parent_mission_id" VARCHAR(128),
  "pattern"           VARCHAR(64)  NOT NULL,
  "metadata"          JSONB        NOT NULL DEFAULT '{}',
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_collaboration_state_pattern"          ON "agent"."collaboration_state" ("pattern");
CREATE INDEX IF NOT EXISTS "idx_collaboration_state_parent_mission"   ON "agent"."collaboration_state" ("parent_mission_id");
CREATE INDEX IF NOT EXISTS "idx_collaboration_state_created_at"       ON "agent"."collaboration_state" ("created_at");

-- ─── refresh_tokens ───────────────────────────────────────────
-- Durable JWT refresh token storage for token rotation & theft detection.
-- When Redis is unavailable, this table serves as the persistent store.
CREATE TABLE IF NOT EXISTS "tenant"."refresh_tokens" (
  "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "token_hash"      VARCHAR(128) NOT NULL UNIQUE,
  "family"          UUID         NOT NULL,
  "user_id"         UUID         NOT NULL,
  "tenant_id"       UUID         NOT NULL,
  "role"            VARCHAR(50)  NOT NULL DEFAULT 'viewer',
  "is_revoked"      BOOLEAN      NOT NULL DEFAULT false,
  "previous_token_hash" VARCHAR(128),
  "user_agent"      TEXT,
  "ip_address"      INET,
  "expires_at"      TIMESTAMPTZ  NOT NULL,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "fk_refresh_tokens_user"   FOREIGN KEY ("user_id")
    REFERENCES "tenant"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_refresh_tokens_tenant" FOREIGN KEY ("tenant_id")
    REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id"    ON "tenant"."refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family"     ON "tenant"."refresh_tokens" ("family");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_tenant_id"  ON "tenant"."refresh_tokens" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "tenant"."refresh_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_is_revoked" ON "tenant"."refresh_tokens" ("is_revoked");

-- ─── updated_at trigger function ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-update updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON "tenant"."tenants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "tenant"."users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON "agent"."agents" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON "agent"."tasks" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON "agent"."plugins" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON "software_factory"."missions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON "software_factory"."mission_contracts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaboration_state_updated_at BEFORE UPDATE ON "agent"."collaboration_state" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Default system tenant (no default admin user — create via app) ──
INSERT INTO "tenant"."tenants" ("name", "slug", "plan", "is_active", "config") VALUES
    ('System', 'system', 'enterprise', true, '{"isSystem": true}');

-- ─── Grant table permissions ──────────────────────────────────
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "tenant"            TO aenews;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "agent"             TO aenews;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "audit"             TO aenews;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "software_factory"  TO aenews;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "tenant"            TO aenews;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "agent"             TO aenews;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "audit"             TO aenews;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "software_factory"  TO aenews;
