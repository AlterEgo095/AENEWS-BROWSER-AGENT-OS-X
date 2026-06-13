-- AENEWS Agent OS X Database Initialization
-- Phase 0: Foundation

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Schemas
CREATE SCHEMA IF NOT EXISTS agent;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS audit;

-- Base types
CREATE TYPE agent_status AS ENUM ('idle', 'running', 'paused', 'error', 'stopped', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retrying');
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'operator', 'viewer');
CREATE TYPE cluster_type AS ENUM ('browser', 'computer', 'coding', 'office', 'marketing', 'business', 'infrastructure', 'security', 'meta-intelligence', 'llm-intelligence', 'intelligent-orchestration', 'watchdog', 'self-evolution', 'certification');
CREATE TYPE event_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Tenants table
CREATE TABLE IF NOT EXISTS tenant.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    quotas JSONB DEFAULT '{"maxAgents": 100, "maxTasks": 10000, "maxStorage": 5120, "maxConcurrentExecutions": 50}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS tenant.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'viewer',
    tenant_id UUID NOT NULL REFERENCES tenant.tenants(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agent.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cluster cluster_type NOT NULL,
    status agent_status DEFAULT 'idle',
    config JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    tenant_id UUID NOT NULL REFERENCES tenant.tenants(id) ON DELETE CASCADE,
    version VARCHAR(50) DEFAULT '1.0.0',
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS agent.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    agent_id UUID REFERENCES agent.agents(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenant.tenants(id) ON DELETE CASCADE,
    status task_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    parent_task_id UUID REFERENCES agent.tasks(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent executions log
CREATE TABLE IF NOT EXISTS agent.executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent.agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent.tasks(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenant.tenants(id) ON DELETE CASCADE,
    status agent_status NOT NULL,
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plugins table
CREATE TABLE IF NOT EXISTS agent.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    hooks TEXT[] DEFAULT '{}',
    tenant_id UUID REFERENCES tenant.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, version, tenant_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS audit.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    source VARCHAR(255) NOT NULL,
    severity event_severity DEFAULT 'info',
    tenant_id UUID REFERENCES tenant.tenants(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    user_id UUID REFERENCES tenant.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenant.tenants(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_cluster ON agent.agents(cluster);
CREATE INDEX idx_agents_status ON agent.agents(status);
CREATE INDEX idx_agents_tenant ON agent.agents(tenant_id);
CREATE INDEX idx_tasks_status ON agent.tasks(status);
CREATE INDEX idx_tasks_agent ON agent.tasks(agent_id);
CREATE INDEX idx_tasks_tenant ON agent.tasks(tenant_id);
CREATE INDEX idx_tasks_priority ON agent.tasks(priority);
CREATE INDEX idx_executions_agent ON agent.executions(agent_id);
CREATE INDEX idx_executions_task ON agent.executions(task_id);
CREATE INDEX idx_events_type ON audit.events(type);
CREATE INDEX idx_events_namespace ON audit.events(namespace);
CREATE INDEX idx_events_tenant ON audit.events(tenant_id);
CREATE INDEX idx_events_created ON audit.events(created_at);
CREATE INDEX idx_audit_log_entity ON audit.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit.audit_log(user_id);
CREATE INDEX idx_audit_log_tenant ON audit.audit_log(tenant_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-update
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenant.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON tenant.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agent.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON agent.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON agent.plugins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default super admin tenant
INSERT INTO tenant.tenants (name, slug, plan, is_active, config) VALUES
    ('System', 'system', 'enterprise', true, '{"isSystem": true}');

-- Default super admin user (password: admin123 - change in production!)
INSERT INTO tenant.users (email, password_hash, first_name, last_name, role, tenant_id) VALUES
    ('admin@aenews-osx.io', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu6GK', 'System', 'Admin', 'super_admin', (SELECT id FROM tenant.tenants WHERE slug = 'system'));
