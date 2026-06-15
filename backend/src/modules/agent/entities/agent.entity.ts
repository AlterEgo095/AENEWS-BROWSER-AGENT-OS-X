import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

export enum ClusterType {
  BROWSER = 'browser',
  COMPUTER = 'computer',
  CODING = 'coding',
  OFFICE = 'office',
  MARKETING = 'marketing',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  META_INTELLIGENCE = 'meta-intelligence',
  // Phase 2 — Intelligence Clusters
  LLM_INTELLIGENCE = 'llm-intelligence',
  INTELLIGENT_ORCHESTRATION = 'intelligent-orchestration',
  WATCHDOG = 'watchdog',
  SELF_EVOLUTION = 'self-evolution',
  CERTIFICATION = 'certification',
  STEALTH_OPS = 'stealth-ops',
  // Phase 3 — Data & Communication Clusters
  DATA_INTELLIGENCE = 'data-intelligence',
  COMMUNICATION = 'communication',
}

export enum MissionCategory {
  RESEARCH_ANALYSIS = 'research-analysis',      // Web search, OSINT, data analysis
  CONTENT_CREATION = 'content-creation',        // Writing, presentations, media
  CODE_DEVELOPMENT = 'code-development',        // Coding, deployment, debugging
  SECURITY_OPS = 'security-ops',                // Security testing, encryption, forensics
  STEALTH_OPERATIONS = 'stealth-operations',    // Undetectable ops, wrappers, covert
  BUSINESS_INTELLIGENCE = 'business-intelligence', // BI, analytics, reporting
  MARKETING_GROWTH = 'marketing-growth',        // Marketing, SEO, social media
  INFRASTRUCTURE_MGMT = 'infrastructure-mgmt',  // DevOps, cloud, monitoring
  AUTOMATION_WORKFLOW = 'automation-workflow',   // Browser automation, scraping, workflows
  DOCUMENT_PROCESSING = 'document-processing',  // Office, documents, spreadsheets
  AI_ORCHESTRATION = 'ai-orchestration',        // Meta-intelligence, swarm, orchestration
  SYSTEM_ADMINISTRATION = 'system-administration', // Computer ops, terminal, file system
  DATA_ENGINEERING = 'data-engineering',            // ETL, pipelines, data quality, warehousing
  COMMUNICATION_OPS = 'communication-ops',          // API, webhooks, notifications, real-time
  ADVANCED_REASONING = 'advanced-reasoning',        // Causal, multimodal, federated, agent forging
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}

@Entity({ schema: 'agent', name: 'agents' })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ClusterType })
  cluster: ClusterType;

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.IDLE })
  status: AgentStatus;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @Column({ type: 'text', array: true, default: '{}' })
  capabilities: string[];

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne('Tenant', 'agents')
  @JoinColumn({ name: 'tenant_id' })
  tenant: import('../../tenant/entities/tenant.entity').Tenant;

  @Column({ length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  missionCategories: MissionCategory[];

  @Column({ name: 'credit_cost', type: 'integer', default: 1 })
  creditCost: number;

  @Column({ name: 'power_level', type: 'integer', default: 1 })
  powerLevel: number;  // 1=standard, 2=advanced, 3=elite/premium

  @Column({ length: 20, default: 'standard' })
  tier: string;  // 'standard', 'advanced', 'elite', 'stealth'

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_execution_at', type: 'timestamptz', nullable: true })
  lastExecutionAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('Task', 'agent')
  tasks: import('../../task/entities/task.entity').Task[];

  @OneToMany('Execution', 'agent')
  executions: import('./execution.entity').Execution[];
}
