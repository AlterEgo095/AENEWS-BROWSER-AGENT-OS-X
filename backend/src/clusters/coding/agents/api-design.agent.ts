import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * APIDesignAgent — LLM-powered API design and architecture.
 *
 * Performs OpenAPI generation, endpoint design, schema modeling,
 * API documentation, GraphQL design, versioning strategy, and authentication design.
 * Uses LLM for intelligent API design when available,
 * falling back to heuristic-based assessment.
 */
export class APIDesignAgent extends BaseAgent {
  readonly name = 'APIDesignAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = [
    'openapi-generation',
    'endpoint-design',
    'schema-modeling',
    'api-documentation',
    'graphql-design',
    'versioning-strategy',
    'authentication-design',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Expert in API design, OpenAPI generation, endpoint design, schema modeling, GraphQL design, and authentication design';

  readonly missionCategories = [MissionCategory.CODE_DEVELOPMENT, MissionCategory.COMMUNICATION_OPS];
  readonly creditCost = 5;
  readonly powerLevel = 3;
  readonly tier = 'elite';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'generate-openapi';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      const llmResult = await this.executeWithLLM(
        `You are an expert in API design, OpenAPI specification generation, endpoint design, schema modeling, API documentation, GraphQL schema design, versioning strategy, and authentication design. Process the API design action and return comprehensive results.
For action "${action}", return a JSON object matching the expected API design structure.
Include realistic API specifications, schema definitions, and best-practice recommendations.`,
        `Action: ${action}\nConfig: ${JSON.stringify(config)}`,
        { responseFormat: 'json' },
      );

      if (llmResult) {
        const parsed = this.safeJsonParse(llmResult);
        if (parsed) {
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'llm' });
          const resultKey = action === 'generate-openapi' ? 'openApiSpec'
            : action === 'design-endpoints' ? 'endpointDesign'
            : action === 'model-schemas' ? 'schemaModeling'
            : action === 'design-graphql' ? 'graphqlSchema'
            : action === 'plan-versioning' ? 'versioningStrategy'
            : 'authDesign';
          return {
            success: true,
            data: { action, ...config, [resultKey]: parsed, status: `${action}_complete`, generatedBy: 'llm', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime, source: 'llm' },
          };
        }
      }

      this.logger.log('LLM unavailable — falling back to heuristic API design');
      this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });

      switch (action) {
        case 'generate-openapi': {
          const apiName = config.apiName || 'MyAPI';
          const apiVersion = config.apiVersion || '1.0.0';
          const style = config.style || 'REST';
          const includeExamples = config.includeExamples !== false;
          const format = config.format || '3.1';

          return {
            success: true,
            data: {
              action, apiName, apiVersion, style: style as any,
              includeExamples, format,
              openApiSpec: {
                openapi: '3.1.0',
                info: { title: apiName, version: apiVersion, description: `${apiName} - Auto-generated OpenAPI specification` },
                servers: [
                  { url: 'https://api.example.com/v1', description: 'Production' },
                  { url: 'https://staging-api.example.com/v1', description: 'Staging' },
                ],
                paths: {
                  '/users': {
                    get: {
                      summary: 'List all users',
                      operationId: 'listUsers',
                      tags: ['Users'],
                      parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page' },
                        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'created_at', 'email'] }, description: 'Sort field' },
                      ],
                      responses: {
                        '200': { description: 'Paginated list of users', content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserListResponse' } } } },
                        '401': { description: 'Unauthorized' },
                        '500': { description: 'Internal server error' },
                      },
                    },
                    post: {
                      summary: 'Create a new user',
                      operationId: 'createUser',
                      tags: ['Users'],
                      requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateUserRequest' } } } },
                      responses: {
                        '201': { description: 'User created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserResponse' } } } },
                        '400': { description: 'Validation error' },
                        '409': { description: 'User already exists' },
                      },
                    },
                  },
                  '/users/{id}': {
                    get: {
                      summary: 'Get user by ID',
                      operationId: 'getUser',
                      tags: ['Users'],
                      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                      responses: {
                        '200': { description: 'User details', content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserResponse' } } } },
                        '404': { description: 'User not found' },
                      },
                    },
                  },
                },
                components: {
                  schemas: {
                    User: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'user', 'viewer'] }, createdAt: { type: 'string', format: 'date-time' } }, required: ['id', 'name', 'email'] },
                    CreateUserRequest: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 100 }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'user', 'viewer'], default: 'user' } }, required: ['name', 'email'] },
                    UserListResponse: { type: 'object', properties: { data: { type: 'array', items: { '$ref': '#/components/schemas/User' } }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } } } },
                    UserResponse: { type: 'object', properties: { data: { '$ref': '#/components/schemas/User' } } },
                  },
                  securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                    apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
                  },
                },
                security: [{ bearerAuth: [] }],
                examples: includeExamples ? {
                  createUser: { summary: 'Create user example', value: { name: 'John Doe', email: 'john@example.com', role: 'user' } },
                } : undefined,
                status: 'generated',
              },
              status: 'openapi_generation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'design-endpoints': {
          const domain = config.domain || 'user-management';
          const style = config.style || 'REST';
          const includeRateLimiting = config.includeRateLimiting !== false;
          const includePagination = config.includePagination !== false;
          const maxEndpoints = config.maxEndpoints || 50;

          return {
            success: true,
            data: {
              action, domain, style: style as any,
              includeRateLimiting, includePagination, maxEndpoints,
              endpointDesign: {
                domain,
                style,
                endpoints: [
                  { method: 'GET', path: '/users', description: 'List all users with filtering and pagination', auth: 'required' as const, rate: '100/min', pagination: includePagination },
                  { method: 'POST', path: '/users', description: 'Create a new user', auth: 'required' as const, rate: '30/min', pagination: false },
                  { method: 'GET', path: '/users/{id}', description: 'Get user details', auth: 'required' as const, rate: '200/min', pagination: false },
                  { method: 'PATCH', path: '/users/{id}', description: 'Update user partially', auth: 'required' as const, rate: '30/min', pagination: false },
                  { method: 'DELETE', path: '/users/{id}', description: 'Delete a user', auth: 'admin-only' as const, rate: '10/min', pagination: false },
                  { method: 'POST', path: '/users/{id}/activate', description: 'Activate user account', auth: 'admin-only' as const, rate: '30/min', pagination: false },
                  { method: 'POST', path: '/users/{id}/deactivate', description: 'Deactivate user account', auth: 'admin-only' as const, rate: '30/min', pagination: false },
                  { method: 'GET', path: '/users/{id}/roles', description: 'List user roles', auth: 'required' as const, rate: '200/min', pagination: includePagination },
                  { method: 'POST', path: '/users/{id}/roles', description: 'Assign role to user', auth: 'admin-only' as const, rate: '30/min', pagination: false },
                ],
                designPrinciples: [
                  { principle: 'Consistent naming', description: 'Use plural nouns for collections, kebab-case for paths' },
                  { principle: 'Proper HTTP methods', description: 'GET for reads, POST for creates, PATCH for partial updates, DELETE for removals' },
                  { principle: 'Idempotency', description: 'PUT and DELETE must be idempotent; POST may not be' },
                  { principle: 'HATEOAS links', description: 'Include navigation links in responses for discoverability' },
                ],
                rateLimiting: includeRateLimiting ? {
                  strategy: 'sliding-window' as const,
                  defaultLimit: '100/min',
                  burstAllowance: 1.5,
                  headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
                } : undefined,
                status: 'designed',
              },
              status: 'endpoint_design_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'model-schemas': {
          const domain = config.domain || 'user-management';
          const format = config.format || 'json-schema';
          const includeValidation = config.includeValidation !== false;
          const includeRelationships = config.includeRelationships !== false;

          return {
            success: true,
            data: {
              action, domain, format: format as any,
              includeValidation, includeRelationships,
              schemaModeling: {
                domain,
                format,
                schemas: [
                  {
                    name: 'User',
                    type: 'entity' as const,
                    fields: [
                      { name: 'id', type: 'UUID', required: true, unique: true, description: 'Unique user identifier' },
                      { name: 'email', type: 'string', required: true, unique: true, validation: includeValidation ? { format: 'email', minLength: 5, maxLength: 255 } : undefined },
                      { name: 'name', type: 'string', required: true, validation: includeValidation ? { minLength: 1, maxLength: 100, pattern: '^[\\p{L}\\s\\-]+$' } : undefined },
                      { name: 'role', type: 'enum', required: true, enumValues: ['admin', 'user', 'viewer'], default: 'user' },
                      { name: 'status', type: 'enum', required: true, enumValues: ['active', 'inactive', 'suspended'], default: 'active' },
                      { name: 'createdAt', type: 'datetime', required: true, readOnly: true },
                      { name: 'updatedAt', type: 'datetime', required: true, readOnly: true },
                    ],
                    indexes: [{ fields: ['email'], unique: true }, { fields: ['status'] }, { fields: ['createdAt'] }],
                  },
                  {
                    name: 'Role',
                    type: 'entity' as const,
                    fields: [
                      { name: 'id', type: 'UUID', required: true, unique: true },
                      { name: 'name', type: 'string', required: true, unique: true, validation: includeValidation ? { pattern: '^[a-z_]+$' } : undefined },
                      { name: 'permissions', type: 'array', itemType: 'string', required: true },
                      { name: 'description', type: 'string', required: false },
                    ],
                  },
                  {
                    name: 'CreateUserRequest',
                    type: 'dto' as const,
                    fields: [
                      { name: 'email', type: 'string', required: true },
                      { name: 'name', type: 'string', required: true },
                      { name: 'role', type: 'string', required: false, default: 'user' },
                    ],
                  },
                  {
                    name: 'UserListResponse',
                    type: 'dto' as const,
                    fields: [
                      { name: 'data', type: 'array', itemType: 'User', required: true },
                      { name: 'meta', type: 'PaginationMeta', required: true },
                    ],
                  },
                ],
                relationships: includeRelationships ? [
                  { from: 'User', to: 'Role', type: 'many-to-many' as const, throughTable: 'user_roles', description: 'Users can have multiple roles' },
                ] : undefined,
                status: 'modeled',
              },
              status: 'schema_modeling_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'design-graphql': {
          const domain = config.domain || 'user-management';
          const includeSubscriptions = config.includeSubscriptions !== false;
          const includeDirectives = config.includeDirectives || false;
          const schemaStyle = config.schemaStyle || 'code-first';

          return {
            success: true,
            data: {
              action, domain, includeSubscriptions,
              includeDirectives, schemaStyle: schemaStyle as any,
              graphqlSchema: {
                domain,
                schemaStyle,
                typeDefs: `
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  status: UserStatus!
  posts: [Post!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum Role {
  ADMIN
  USER
  VIEWER
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: DateTime!
}

type PaginatedUsers {
  data: [User!]!
  meta: PaginationMeta!
}

type PaginationMeta {
  page: Int!
  limit: Int!
  total: Int!
  totalPages: Int!
}

input CreateUserInput {
  email: String!
  name: String!
  role: Role = USER
}

input UpdateUserInput {
  email: String
  name: String
  role: Role
  status: UserStatus
}

type Query {
  users(page: Int = 1, limit: Int = 20, sort: String): PaginatedUsers!
  user(id: ID!): User
  me: User!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}${includeSubscriptions ? `

type Subscription {
  userCreated: User!
  userUpdated(id: ID): User!
  userStatusChanged(userId: ID!): User!
}` : ''}

scalar DateTime
`,
                resolvers: {
                  Query: { users: 'UserService.findAll', user: 'UserService.findById', me: 'UserService.getCurrentUser' },
                  Mutation: { createUser: 'UserService.create', updateUser: 'UserService.update', deleteUser: 'UserService.delete' },
                  ...(includeSubscriptions ? { Subscription: { userCreated: 'UserSubscription.onCreated', userUpdated: 'UserSubscription.onUpdated', userStatusChanged: 'UserSubscription.onStatusChanged' } } : {}),
                  User: { posts: 'PostService.findByAuthorId' },
                },
                performance: {
                  n1IssueMitigation: 'Use DataLoader for batching and caching',
                  paginationStrategy: 'Cursor-based for real-time data, offset-based for static data',
                  cachingStrategy: 'Response caching with stale-while-revalidate',
                },
                status: 'designed',
              },
              status: 'graphql_design_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'plan-versioning': {
          const apiName = config.apiName || 'MyAPI';
          const currentVersion = config.currentVersion || 'v1';
          const versioningStyle = config.versioningStyle || 'url-path';
          const includeDeprecation = config.includeDeprecation !== false;
          const includeSunsetPolicy = config.includeSunsetPolicy !== false;

          return {
            success: true,
            data: {
              action, apiName, currentVersion, versioningStyle: versioningStyle as any,
              includeDeprecation, includeSunsetPolicy,
              versioningStrategy: {
                apiName,
                currentVersion,
                strategy: {
                  style: versioningStyle,
                  options: [
                    { style: 'url-path' as const, example: '/api/v2/users', pros: ['Clear version in URL', 'Easy routing'], cons: ['URL changes required', 'Not REST-purist'] },
                    { style: 'header' as const, example: 'Accept: application/vnd.api.v2+json', pros: ['Clean URLs', 'Content negotiation'], cons: ['Hidden from URL', 'Complex routing'] },
                    { style: 'query-param' as const, example: '/api/users?version=2', pros: ['Simple implementation', 'Easy to test'], cons: ['Not recommended for production', 'Cache issues'] },
                  ],
                },
                versionLifecycle: {
                  phases: [
                    { phase: 'active' as const, description: 'Fully supported, receives new features and bug fixes' },
                    { phase: 'deprecated' as const, description: 'No new features, critical bug fixes only', notificationPeriod: '6 months' },
                    { phase: 'sunset' as const, description: 'No support, will be removed', removalDate: '12 months after deprecation' },
                  ],
                },
                deprecationPolicy: includeDeprecation ? {
                  headers: ['Deprecation: true', 'Sunset: Sat, 01 Jan 2026 00:00:00 GMT', 'Link: </api/v2/users>; rel="successor-version"'],
                  notificationChannels: ['API response headers', 'Developer portal announcement', 'Email to registered developers', 'Changelog entry'],
                  migrationSupport: ['6-month overlap period', 'Migration guide provided', 'Compatibility mode available'],
                } : undefined,
                sunsetPolicy: includeSunsetPolicy ? {
                  minimumNotice: '12 months',
                  gracePeriod: '3 months after sunset (read-only)',
                  emergencyProvision: 'Critical fixes for 6 months after sunset for enterprise clients',
                } : undefined,
                status: 'planned',
              },
              status: 'versioning_plan_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'design-auth': {
          const apiName = config.apiName || 'MyAPI';
          const authRequirements = config.authRequirements || ['user-authentication', 'api-key', 'oauth2'];
          const includeTokenManagement = config.includeTokenManagement !== false;
          const includePermissions = config.includePermissions !== false;

          return {
            success: true,
            data: {
              action, apiName, authRequirements: authRequirements as string[],
              includeTokenManagement, includePermissions,
              authDesign: {
                apiName,
                strategies: [
                  {
                    type: 'JWT Bearer' as const,
                    description: 'Stateless authentication using JSON Web Tokens',
                    flow: 'Client authenticates → Server issues JWT → Client includes JWT in Authorization header → Server validates JWT',
                    tokenFormat: { type: 'JWT', algorithm: 'RS256', accessTokenExpiry: '15 minutes', refreshTokenExpiry: '7 days' },
                    pros: ['Stateless', 'Scalable', 'Standard-based'],
                    cons: ['Token revocation complexity', 'Token size overhead'],
                  },
                  {
                    type: 'API Key' as const,
                    description: 'Simple key-based authentication for service-to-service communication',
                    flow: 'Client includes API key in X-API-Key header → Server validates key → Request processed',
                    keyFormat: { prefix: 'ak_live_', length: 32, encoding: 'base64url' },
                    pros: ['Simple', 'Low overhead', 'Service-to-service friendly'],
                    cons: ['No user context', 'Key rotation complexity'],
                  },
                  {
                    type: 'OAuth 2.0' as const,
                    description: 'Delegated authorization for third-party access',
                    flows: ['Authorization Code (with PKCE)', 'Client Credentials', 'Refresh Token'],
                    scopes: ['read:users', 'write:users', 'admin', 'read:posts', 'write:posts'],
                    pros: ['Industry standard', 'Fine-grained scopes', 'Third-party support'],
                    cons: ['Complex implementation', 'Multiple flows to manage'],
                  },
                ],
                tokenManagement: includeTokenManagement ? {
                  rotation: { accessTokenRotation: 'On every refresh request', refreshTokenRotation: 'On every use (rotation with reuse detection)', keyRotation: 'Every 90 days' },
                  storage: { serverSide: 'Redis for revocation checking', clientSide: 'HttpOnly secure cookies for web, secure storage for mobile' },
                  revocation: { strategy: 'Token blacklist in Redis', propagationDelay: '5 seconds', fallback: 'Short token TTL limits exposure' },
                } : undefined,
                permissions: includePermissions ? {
                  model: 'RBAC with ABAC extensions',
                  roles: [
                    { name: 'admin', permissions: ['*'], description: 'Full system access' },
                    { name: 'user', permissions: ['read:own_profile', 'write:own_profile', 'read:posts', 'write:own_posts'], description: 'Standard user access' },
                    { name: 'viewer', permissions: ['read:own_profile', 'read:posts'], description: 'Read-only access' },
                  ],
                  attributeRules: [
                    { rule: 'User can only modify own resources unless admin', attributes: ['resource.ownerId == user.id', 'user.role == admin'] },
                  ],
                } : undefined,
                securityConsiderations: [
                  'Enforce HTTPS for all API communication',
                  'Implement rate limiting on authentication endpoints',
                  'Use constant-time comparison for token validation',
                  'Log all authentication events for audit',
                ],
                status: 'designed',
              },
              status: 'auth_design_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: generate-openapi, design-endpoints, model-schemas, design-graphql, plan-versioning, design-auth`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
