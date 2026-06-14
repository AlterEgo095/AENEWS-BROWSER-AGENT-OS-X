-- ============================================================
-- AENEWS Software Factory — Database Initialization
-- ============================================================
-- Creates the software_factory schema, enum types, and tables
-- for missions and mission_contracts.
-- ============================================================

-- ─── Schema ────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS software_factory;

-- ─── Enum Types ────────────────────────────────────────────

DO $$ BEGIN
    -- mission_state enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_state') THEN
        CREATE TYPE mission_state AS ENUM (
            'DRAFT',
            'PLANNED',
            'RESEARCH',
            'BUILDING',
            'TESTING',
            'AUDITING',
            'CERTIFYING',
            'DELIVERING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
            'ARCHIVED'
        );
    END IF;

    -- mission_priority enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_priority') THEN
        CREATE TYPE mission_priority AS ENUM (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        );
    END IF;

    -- contract_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM (
            'NEGOTIATING',
            'ACCEPTED',
            'REJECTED',
            'EXPIRED',
            'FULFILLED'
        );
    END IF;
END $$;

-- ─── Missions Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS software_factory.missions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    state               mission_state NOT NULL DEFAULT 'DRAFT',
    priority            mission_priority NOT NULL DEFAULT 'MEDIUM',
    requester_id        VARCHAR(255) NOT NULL,
    assigned_team_ids   JSONB NOT NULL DEFAULT '[]',
    objectives          JSONB NOT NULL DEFAULT '[]',
    constraints         JSONB NOT NULL DEFAULT '[]',
    required_capabilities JSONB NOT NULL DEFAULT '[]',
    result              JSONB,
    error               TEXT,
    progress            INTEGER NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    deadline            TIMESTAMPTZ,
    tenant_id           VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_missions_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenant.tenants(id) ON DELETE SET NULL
);

-- ─── Mission Contracts Table ──────────────────────────────

CREATE TABLE IF NOT EXISTS software_factory.mission_contracts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id          UUID NOT NULL,
    type                VARCHAR(100) NOT NULL,
    terms               JSONB NOT NULL DEFAULT '{}',
    budget              INTEGER,
    spent               INTEGER NOT NULL DEFAULT 0,
    deliverables        JSONB NOT NULL DEFAULT '[]',
    status              contract_status NOT NULL DEFAULT 'NEGOTIATING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_contracts_mission FOREIGN KEY (mission_id)
        REFERENCES software_factory.missions(id) ON DELETE CASCADE
);

-- ─── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_missions_state ON software_factory.missions (state);
CREATE INDEX IF NOT EXISTS idx_missions_priority ON software_factory.missions (priority);
CREATE INDEX IF NOT EXISTS idx_missions_tenant_id ON software_factory.missions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_missions_created_at ON software_factory.missions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_requester_id ON software_factory.missions (requester_id);

CREATE INDEX IF NOT EXISTS idx_contracts_mission_id ON software_factory.mission_contracts (mission_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON software_factory.mission_contracts (status);

-- ─── Updated_at Trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION software_factory.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_missions_updated_at ON software_factory.missions;
CREATE TRIGGER trg_missions_updated_at
    BEFORE UPDATE ON software_factory.missions
    FOR EACH ROW
    EXECUTE FUNCTION software_factory.update_timestamp();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON software_factory.mission_contracts;
CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON software_factory.mission_contracts
    FOR EACH ROW
    EXECUTE FUNCTION software_factory.update_timestamp();
