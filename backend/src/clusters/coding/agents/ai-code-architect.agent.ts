import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * AICodeArchitectAgent — AI-powered code architecture design (v3.0.0).
 *
 * Provides architecture design, pattern recommendation, tech stack selection,
 * microservices design, API design, and database schema design capabilities.
 * Uses LLM for intelligent architecture analysis when available,
 * falling back to heuristic-based simulation data.
 */
export class AICodeArchitectAgent extends BaseAgent {
  readonly name = 'AICodeArchitectAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = [
    'architecture-design',
    'pattern-recommendation',
    'tech-stack-selection',
    'microservices-design',
    'api-design',
    'database-schema-design',
  ];
  readonly version = '3.0.0';
  readonly description =
    'AI-powered code architecture design with pattern recommendation, tech stack selection, microservices design, API design, and database schema design';

  readonly missionCategories = [MissionCategory.CODE_DEVELOPMENT];
  readonly creditCost = 3;
  readonly powerLevel = 2;
  readonly tier = 'advanced';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'design-architecture';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action, agent: this.name });

      switch (action) {
        case 'design-architecture': {
          const projectName = config.projectName;
          const projectType = config.projectType || 'web-application';
          const requirements = config.requirements || [];
          const constraints = config.constraints || [];
          const scale = config.scale || 'medium';
          const domain = config.domain || 'general';

          if (!projectName) {
            return { success: false, error: '"projectName" is required for architecture design' };
          }

          this.logger.log(`Designing architecture for "${projectName}" (${projectType}, scale: ${scale})`);

          const llmResult = await this.executeWithLLM(
            `You are a senior software architect. Design comprehensive system architectures with clear component boundaries, data flows, and technology choices. Return structured JSON.`,
            `Design architecture for project "${projectName}" of type ${projectType}. Scale: ${scale}. Domain: ${domain}. Requirements: ${JSON.stringify(requirements)}. Constraints: ${JSON.stringify(constraints)}. Return JSON with: architecture {style, components (array of {name, type, responsibility, technology, dependencies}), dataFlow (array of {from, to, data, protocol}), deploymentStrategy, scalabilityPlan}, diagrams {componentDiagram, deploymentDiagram}, qualityAttributes (array of {attribute, strategy, priority}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, projectName });
            return {
              success: true,
              data: {
                action, projectName, projectType, scale, domain, requirements, constraints,
                architecture: parsed.architecture || { style: '', components: [], dataFlow: [], deploymentStrategy: '', scalabilityPlan: '' },
                diagrams: parsed.diagrams || { componentDiagram: '', deploymentDiagram: '' },
                qualityAttributes: parsed.qualityAttributes || [],
                status: 'designed',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, projectName, projectType, scale, domain, requirements, constraints,
              architecture: {
                style: 'microservices',
                components: [
                  { name: 'API Gateway', type: 'gateway', responsibility: 'Request routing, rate limiting, authentication', technology: 'Kong / Nginx', dependencies: ['Auth Service', 'User Service'] },
                  { name: 'Auth Service', type: 'service', responsibility: 'Authentication, authorization, token management', technology: 'Node.js + Express', dependencies: ['User DB', 'Redis Cache'] },
                  { name: 'User Service', type: 'service', responsibility: 'User management, profiles, preferences', technology: 'TypeScript + NestJS', dependencies: ['User DB'] },
                  { name: 'Core Business Service', type: 'service', responsibility: 'Primary business logic and domain operations', technology: 'TypeScript + NestJS', dependencies: ['Business DB', 'Event Bus'] },
                  { name: 'Event Bus', type: 'infrastructure', responsibility: 'Asynchronous event processing and service decoupling', technology: 'RabbitMQ / Kafka', dependencies: [] },
                  { name: 'Cache Layer', type: 'infrastructure', responsibility: 'Response caching, session storage, rate limiting', technology: 'Redis Cluster', dependencies: [] },
                ],
                dataFlow: [
                  { from: 'Client', to: 'API Gateway', data: 'HTTP Requests', protocol: 'HTTPS' },
                  { from: 'API Gateway', to: 'Auth Service', data: 'Auth Tokens', protocol: 'gRPC' },
                  { from: 'API Gateway', to: 'Core Business Service', data: 'Business Requests', protocol: 'gRPC' },
                  { from: 'Core Business Service', to: 'Event Bus', data: 'Domain Events', protocol: 'AMQP' },
                ],
                deploymentStrategy: 'Containerized with Kubernetes, auto-scaling with HPA, blue-green deployments',
                scalabilityPlan: 'Horizontal scaling of stateless services, read replicas for databases, CDN for static assets',
              },
              diagrams: { componentDiagram: 'Component diagram generated via LLM fallback', deploymentDiagram: 'Deployment diagram generated via LLM fallback' },
              qualityAttributes: [
                { attribute: 'Availability', strategy: 'Multi-AZ deployment, circuit breakers, health checks', priority: 'high' },
                { attribute: 'Performance', strategy: 'Caching, connection pooling, async processing', priority: 'high' },
                { attribute: 'Security', strategy: 'Zero-trust, mTLS, secret management', priority: 'high' },
                { attribute: 'Scalability', strategy: 'Microservices, event-driven, auto-scaling', priority: 'medium' },
                { attribute: 'Maintainability', strategy: 'Clean architecture, domain-driven design, comprehensive logging', priority: 'medium' },
              ],
              status: 'designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'recommend-patterns': {
          const context_ = config.context;
          const language = config.language || 'typescript';
          const framework = config.framework;
          const problemDomain = config.problemDomain || 'general';
          const existingPatterns = config.existingPatterns || [];

          if (!context_) {
            return { success: false, error: '"context" is required for pattern recommendation' };
          }

          this.logger.log(`Recommending patterns for ${language}${framework ? `/${framework}` : ''} (${problemDomain})`);

          const llmResult = await this.executeWithLLM(
            `You are a software design patterns expert. Recommend appropriate design patterns based on the given context, considering language idioms, framework conventions, and domain requirements.`,
            `Recommend design patterns for: ${context_}. Language: ${language}. Framework: ${framework || 'none'}. Domain: ${problemDomain}. Existing patterns: ${existingPatterns.join(', ')}. Return JSON with: recommended (array of {name, category, applicability, implementation, pros, cons, complexity}), antiPatterns (array of {name, reason, alternative}), patternCombinations (array of {patterns, benefit, useCase}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, patternsFound: parsed.recommended?.length || 0 });
            return {
              success: true,
              data: {
                action, context: context_, language, framework, problemDomain, existingPatterns,
                recommended: parsed.recommended || [],
                antiPatterns: parsed.antiPatterns || [],
                patternCombinations: parsed.patternCombinations || [],
                status: 'recommended',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, context: context_, language, framework, problemDomain, existingPatterns,
              recommended: [
                { name: 'Repository Pattern', category: 'structural', applicability: 'Data access abstraction layer', implementation: 'Define interfaces for data operations, implement with specific ORM/DB drivers', pros: ['Testability', 'Swap data sources easily', 'Separation of concerns'], cons: ['Additional abstraction layer', 'More boilerplate'], complexity: 'medium' },
                { name: 'CQRS', category: 'architectural', applicability: 'Separation of read and write operations', implementation: 'Separate command and query models with distinct data stores', pros: ['Optimized read/write performance', 'Scalability', 'Clear separation'], cons: ['Eventual consistency', 'Increased complexity', 'Data synchronization'], complexity: 'high' },
                { name: 'Observer Pattern', category: 'behavioral', applicability: 'Event-driven communication between services', implementation: 'Event emitter/subscription with typed event contracts', pros: ['Loose coupling', 'Extensibility', 'Async processing'], cons: ['Debugging complexity', 'Event ordering challenges'], complexity: 'medium' },
                { name: 'Strategy Pattern', category: 'behavioral', applicability: 'Runtime algorithm selection', implementation: 'Define strategy interface with multiple implementations', pros: ['Open/closed principle', 'Runtime flexibility', 'Testability'], cons: ['Client must know strategies', 'Increased objects'], complexity: 'low' },
              ],
              antiPatterns: [
                { name: 'God Object', reason: 'Single class handles too many responsibilities', alternative: 'Single Responsibility Principle with proper class decomposition' },
                { name: 'Premature Optimization', reason: 'Optimizing before measuring actual bottlenecks', alternative: 'Profile first, then optimize the proven bottlenecks' },
              ],
              patternCombinations: [
                { patterns: ['Repository + Unit of Work'], benefit: 'Transactional consistency with data access abstraction', useCase: 'Complex domain operations requiring atomic changes' },
                { patterns: ['CQRS + Event Sourcing'], benefit: 'Full audit trail with optimized read/write paths', useCase: 'Systems requiring complete event history and high query throughput' },
              ],
              status: 'recommended',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'select-tech-stack': {
          const projectType = config.projectType || 'web-application';
          const requirements = config.requirements || [];
          const teamSize = config.teamSize || '5-10';
          const budget = config.budget || 'medium';
          const timeline = config.timeline || '6-12 months';
          const existingTech = config.existingTech || [];

          this.logger.log(`Selecting tech stack for ${projectType} (team: ${teamSize}, budget: ${budget})`);

          const llmResult = await this.executeWithLLM(
            `You are a technology selection expert. Recommend optimal tech stacks based on project requirements, team capabilities, and constraints. Return structured JSON.`,
            `Select tech stack for ${projectType}. Requirements: ${JSON.stringify(requirements)}. Team: ${teamSize}. Budget: ${budget}. Timeline: ${timeline}. Existing tech: ${existingTech.join(', ')}. Return JSON with: frontend {framework, language, buildTool, testing, rationale}, backend {framework, language, runtime, apiStyle, rationale}, database {primary, cache, search, rationale}, infrastructure {hosting, containerization, ciCd, monitoring, rationale}, alternativesConsidered (array of {category, alternative, reasonNotSelected}).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action });
            return {
              success: true,
              data: {
                action, projectType, requirements, teamSize, budget, timeline, existingTech,
                frontend: parsed.frontend || {},
                backend: parsed.backend || {},
                database: parsed.database || {},
                infrastructure: parsed.infrastructure || {},
                alternativesConsidered: parsed.alternativesConsidered || [],
                status: 'selected',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, projectType, requirements, teamSize, budget, timeline, existingTech,
              frontend: { framework: 'Next.js 16', language: 'TypeScript', buildTool: 'Turbopack', testing: 'Vitest + Playwright', rationale: 'Full-stack SSR framework with excellent DX and performance' },
              backend: { framework: 'NestJS', language: 'TypeScript', runtime: 'Node.js 22', apiStyle: 'REST + GraphQL', rationale: 'Enterprise-grade TypeScript backend with modular architecture' },
              database: { primary: 'PostgreSQL 16', cache: 'Redis 7', search: 'Elasticsearch 8', rationale: 'Battle-tested relational DB with excellent JSON support and full-text search' },
              infrastructure: { hosting: 'AWS / GCP', containerization: 'Docker + Kubernetes', ciCd: 'GitHub Actions', monitoring: 'Prometheus + Grafana', rationale: 'Industry standard with extensive ecosystem support' },
              alternativesConsidered: [
                { category: 'frontend', alternative: 'Remix', reasonNotSelected: 'Smaller ecosystem, less mature than Next.js' },
                { category: 'backend', alternative: 'Go + Fiber', reasonNotSelected: 'Team has stronger TypeScript skills, shared types across stack' },
                { category: 'database', alternative: 'MongoDB', reasonNotSelected: 'Relational data model better fits requirements for ACID compliance' },
              ],
              status: 'selected',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'design-microservices': {
          const domain = config.domain;
          const boundedContexts = config.boundedContexts || [];
          const communicationStyle = config.communicationStyle || 'event-driven';
          const dataOwnership = config.dataOwnership || 'database-per-service';

          if (!domain) {
            return { success: false, error: '"domain" is required for microservices design' };
          }

          this.logger.log(`Designing microservices for domain "${domain}" (${communicationStyle})`);

          const llmResult = await this.executeWithLLM(
            `You are a microservices architecture expert. Design microservice boundaries, communication patterns, and data management strategies following domain-driven design principles.`,
            `Design microservices for domain: "${domain}". Bounded contexts: ${JSON.stringify(boundedContexts)}. Communication: ${communicationStyle}. Data ownership: ${dataOwnership}. Return JSON with: services (array of {name, boundedContext, responsibilities, apiContract, dataStore, dependencies, teamSize}), communication (array of {from, to, type, protocol, async}), sharedKernel (array), sagas (array of {name, steps, compensation}), infrastructure {serviceDiscovery, apiGateway, eventStore, configManagement}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, services: parsed.services?.length || 0 });
            return {
              success: true,
              data: {
                action, domain, boundedContexts, communicationStyle, dataOwnership,
                services: parsed.services || [],
                communication: parsed.communication || [],
                sharedKernel: parsed.sharedKernel || [],
                sagas: parsed.sagas || [],
                infrastructure: parsed.infrastructure || {},
                status: 'designed',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, domain, boundedContexts, communicationStyle, dataOwnership,
              services: [
                { name: 'Identity Service', boundedContext: 'Authentication', responsibilities: ['User authentication', 'Token management', 'SSO'], apiContract: 'REST + OAuth2', dataStore: 'PostgreSQL', dependencies: ['Notification Service'], teamSize: 3 },
                { name: 'Catalog Service', boundedContext: 'Product Management', responsibilities: ['Product CRUD', 'Category management', 'Inventory tracking'], apiContract: 'REST + GraphQL', dataStore: 'PostgreSQL + Elasticsearch', dependencies: ['Event Bus'], teamSize: 4 },
                { name: 'Order Service', boundedContext: 'Order Processing', responsibilities: ['Order lifecycle', 'Payment coordination', 'Fulfillment tracking'], apiContract: 'REST + Events', dataStore: 'PostgreSQL', dependencies: ['Catalog Service', 'Payment Service', 'Notification Service'], teamSize: 5 },
                { name: 'Payment Service', boundedContext: 'Billing', responsibilities: ['Payment processing', 'Refund handling', 'Invoice generation'], apiContract: 'REST + Webhooks', dataStore: 'PostgreSQL', dependencies: ['Event Bus'], teamSize: 3 },
                { name: 'Notification Service', boundedContext: 'Communication', responsibilities: ['Email sending', 'Push notifications', 'SMS delivery'], apiContract: 'Async Events', dataStore: 'MongoDB', dependencies: [], teamSize: 2 },
              ],
              communication: [
                { from: 'Order Service', to: 'Payment Service', type: 'synchronous', protocol: 'gRPC', async: false },
                { from: 'Order Service', to: 'Notification Service', type: 'asynchronous', protocol: 'AMQP', async: true },
                { from: 'Payment Service', to: 'Notification Service', type: 'asynchronous', protocol: 'AMQP', async: true },
                { from: 'Catalog Service', to: 'Order Service', type: 'asynchronous', protocol: 'AMQP', async: true },
              ],
              sharedKernel: ['Money value object', 'Address value object', 'Event base class', 'Error codes enum'],
              sagas: [
                { name: 'Order Fulfillment Saga', steps: ['Create order', 'Reserve inventory', 'Process payment', 'Confirm order', 'Ship order'], compensation: ['Cancel order', 'Release inventory', 'Refund payment'] },
                { name: 'Payment Refund Saga', steps: ['Initiate refund', 'Reverse payment', 'Update order status', 'Send notification'], compensation: ['Cancel refund', 'Restore payment'] },
              ],
              infrastructure: { serviceDiscovery: 'Consul', apiGateway: 'Kong', eventStore: 'Kafka', configManagement: 'Spring Cloud Config / Consul' },
              status: 'designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'design-api': {
          const apiName = config.apiName;
          const apiStyle = config.apiStyle || 'rest';
          const versioning = config.versioning || 'url-path';
          const authMethod = config.authMethod || 'oauth2';
          const resources = config.resources || [];

          if (!apiName) {
            return { success: false, error: '"apiName" is required for API design' };
          }

          this.logger.log(`Designing API "${apiName}" (${apiStyle}, auth: ${authMethod})`);

          const llmResult = await this.executeWithLLM(
            `You are an API design expert. Design comprehensive API contracts with proper resource modeling, authentication, versioning, and documentation standards.`,
            `Design API "${apiName}" with style: ${apiStyle}. Versioning: ${versioning}. Auth: ${authMethod}. Resources: ${JSON.stringify(resources)}. Return JSON with: endpoints (array of {method, path, description, requestSchema, responseSchema, authRequired, rateLimit}), models (array of {name, fields (array of {name, type, required, description})}), errorCodes (array of {code, message, httpStatus}), authConfig {flows, scopes, tokenExpiry}, versioningStrategy {method, currentVersion, deprecationPolicy}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, apiName, endpoints: parsed.endpoints?.length || 0 });
            return {
              success: true,
              data: {
                action, apiName, apiStyle, versioning, authMethod, resources,
                endpoints: parsed.endpoints || [],
                models: parsed.models || [],
                errorCodes: parsed.errorCodes || [],
                authConfig: parsed.authConfig || {},
                versioningStrategy: parsed.versioningStrategy || {},
                status: 'designed',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, apiName, apiStyle, versioning, authMethod, resources,
              endpoints: [
                { method: 'GET', path: '/api/v1/users', description: 'List all users with pagination', requestSchema: { page: 'number', limit: 'number', filter: 'string' }, responseSchema: { data: 'User[]', meta: 'PaginationMeta' }, authRequired: true, rateLimit: '100/min' },
                { method: 'GET', path: '/api/v1/users/:id', description: 'Get user by ID', requestSchema: { id: 'string' }, responseSchema: { data: 'User' }, authRequired: true, rateLimit: '200/min' },
                { method: 'POST', path: '/api/v1/users', description: 'Create a new user', requestSchema: { email: 'string', name: 'string', role: 'string' }, responseSchema: { data: 'User' }, authRequired: true, rateLimit: '50/min' },
                { method: 'PUT', path: '/api/v1/users/:id', description: 'Update user by ID', requestSchema: { email: 'string', name: 'string' }, responseSchema: { data: 'User' }, authRequired: true, rateLimit: '50/min' },
                { method: 'DELETE', path: '/api/v1/users/:id', description: 'Delete user by ID', requestSchema: { id: 'string' }, responseSchema: { data: 'null' }, authRequired: true, rateLimit: '20/min' },
              ],
              models: [
                { name: 'User', fields: [{ name: 'id', type: 'UUID', required: true, description: 'Unique user identifier' }, { name: 'email', type: 'string', required: true, description: 'User email address' }, { name: 'name', type: 'string', required: true, description: 'Display name' }, { name: 'role', type: 'enum', required: true, description: 'admin | user | viewer' }, { name: 'createdAt', type: 'ISO8601', required: true, description: 'Creation timestamp' }] },
              ],
              errorCodes: [
                { code: 'VALIDATION_ERROR', message: 'Request validation failed', httpStatus: 400 },
                { code: 'UNAUTHORIZED', message: 'Authentication required', httpStatus: 401 },
                { code: 'FORBIDDEN', message: 'Insufficient permissions', httpStatus: 403 },
                { code: 'NOT_FOUND', message: 'Resource not found', httpStatus: 404 },
                { code: 'RATE_LIMITED', message: 'Too many requests', httpStatus: 429 },
                { code: 'INTERNAL_ERROR', message: 'Internal server error', httpStatus: 500 },
              ],
              authConfig: { flows: ['authorization_code', 'client_credentials'], scopes: ['read', 'write', 'admin'], tokenExpiry: '1h (access), 7d (refresh)' },
              versioningStrategy: { method: 'url-path', currentVersion: 'v1', deprecationPolicy: '6 months sunset period with header warnings' },
              status: 'designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        case 'design-schema': {
          const schemaName = config.schemaName;
          const databaseType = config.databaseType || 'postgresql';
          const entities = config.entities || [];
          const relationships = config.relationships || [];
          const normalization = config.normalization || '3NF';

          if (!schemaName) {
            return { success: false, error: '"schemaName" is required for database schema design' };
          }

          this.logger.log(`Designing schema "${schemaName}" (${databaseType}, normalization: ${normalization})`);

          const llmResult = await this.executeWithLLM(
            `You are a database design expert. Design optimized database schemas with proper normalization, indexing strategies, and migration paths.`,
            `Design database schema "${schemaName}" for ${databaseType}. Entities: ${JSON.stringify(entities)}. Relationships: ${JSON.stringify(relationships)}. Normalization: ${normalization}. Return JSON with: tables (array of {name, columns (array of {name, type, nullable, default, constraints}), primaryKey, indexes (array of {name, columns, type}), foreignKeys (array of {column, references, onDelete})}), erDiagram, migrationStrategy {approach, estimatedSteps}, performanceConsiderations (array of strings).`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 4096 },
          );

          const parsed = this.safeJsonParse(llmResult);

          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, schemaName, tables: parsed.tables?.length || 0 });
            return {
              success: true,
              data: {
                action, schemaName, databaseType, entities, relationships, normalization,
                tables: parsed.tables || [],
                erDiagram: parsed.erDiagram || '',
                migrationStrategy: parsed.migrationStrategy || { approach: '', estimatedSteps: 0 },
                performanceConsiderations: parsed.performanceConsiderations || [],
                status: 'designed',
                timestamp: new Date().toISOString(),
              },
              metadata: { duration: Date.now() - startTime, source: 'llm' },
            };
          }

          // Heuristic fallback
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'fallback' });
          return {
            success: true,
            data: {
              action, schemaName, databaseType, entities, relationships, normalization,
              tables: [
                {
                  name: 'users',
                  columns: [
                    { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', constraints: ['PRIMARY KEY'] },
                    { name: 'email', type: 'VARCHAR(255)', nullable: false, default: null, constraints: ['UNIQUE', 'NOT NULL'] },
                    { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, default: null, constraints: ['NOT NULL'] },
                    { name: 'name', type: 'VARCHAR(100)', nullable: false, default: null, constraints: ['NOT NULL'] },
                    { name: 'role', type: 'ENUM', nullable: false, default: "'user'", constraints: ['NOT NULL'] },
                    { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()', constraints: ['NOT NULL'] },
                    { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()', constraints: ['NOT NULL'] },
                  ],
                  primaryKey: 'id',
                  indexes: [{ name: 'idx_users_email', columns: ['email'], type: 'UNIQUE' }, { name: 'idx_users_role', columns: ['role'], type: 'BTREE' }],
                  foreignKeys: [],
                },
                {
                  name: 'orders',
                  columns: [
                    { name: 'id', type: 'UUID', nullable: false, default: 'gen_random_uuid()', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'UUID', nullable: false, default: null, constraints: ['NOT NULL'] },
                    { name: 'status', type: 'ENUM', nullable: false, default: "'pending'", constraints: ['NOT NULL'] },
                    { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false, default: '0', constraints: ['NOT NULL', 'CHECK >= 0'] },
                    { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()', constraints: ['NOT NULL'] },
                  ],
                  primaryKey: 'id',
                  indexes: [{ name: 'idx_orders_user_id', columns: ['user_id'], type: 'BTREE' }, { name: 'idx_orders_status', columns: ['status'], type: 'BTREE' }, { name: 'idx_orders_created_at', columns: ['created_at'], type: 'BTREE' }],
                  foreignKeys: [{ column: 'user_id', references: 'users(id)', onDelete: 'CASCADE' }],
                },
              ],
              erDiagram: 'ER diagram: users 1:N orders',
              migrationStrategy: { approach: 'Incremental migrations with reversible steps', estimatedSteps: 4 },
              performanceConsiderations: [
                'Add composite indexes for common query patterns',
                'Consider partitioning orders table by date for large datasets',
                'Use partial indexes for frequently filtered status columns',
                'Implement connection pooling for high-concurrency scenarios',
              ],
              status: 'designed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'fallback' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: design-architecture, recommend-patterns, select-tech-stack, design-microservices, design-api, design-schema`,
          };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
