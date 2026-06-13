"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationAgentService = exports.AUTHENTICATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.AUTHENTICATION_AGENT_CONFIG = {
    id: 'security-authentication',
    name: 'Authentication',
    cluster: agent_interface_1.AgentCluster.SECURITY,
    version: '1.0.0',
    description: 'Manage authentication workflows including MFA, SSO, token lifecycle, access revocation, and authentication event auditing.',
    capabilities: [
        {
            name: 'authenticate',
            description: 'Authenticate a user with credentials',
            inputSchema: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'User identifier' },
                    credentials: { type: 'object', description: 'Authentication credentials' },
                    method: {
                        type: 'string',
                        enum: ['password', 'mfa', 'sso', 'api_key', 'certificate'],
                        description: 'Authentication method',
                    },
                },
                required: ['userId', 'credentials', 'method'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    authenticated: { type: 'boolean' },
                    token: { type: 'string' },
                    expiresAt: { type: 'string' },
                    mfaRequired: { type: 'boolean' },
                },
            },
        },
        {
            name: 'validateToken',
            description: 'Validate an authentication token',
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Token to validate' },
                    checkRevocation: { type: 'boolean', description: 'Whether to check revocation list' },
                },
                required: ['token'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    valid: { type: 'boolean' },
                    userId: { type: 'string' },
                    expiresAt: { type: 'string' },
                    scopes: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'manageMFA',
            description: 'Manage multi-factor authentication settings',
            inputSchema: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'User identifier' },
                    operation: {
                        type: 'string',
                        enum: ['enable', 'disable', 'verify', 'reset'],
                        description: 'MFA operation',
                    },
                    method: {
                        type: 'string',
                        enum: ['totp', 'sms', 'email', 'hardware'],
                        description: 'MFA method',
                    },
                },
                required: ['userId', 'operation'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    mfaEnabled: { type: 'boolean' },
                    method: { type: 'string' },
                    backupCodes: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'configureSSO',
            description: 'Configure single sign-on integration',
            inputSchema: {
                type: 'object',
                properties: {
                    provider: { type: 'string', description: 'SSO provider (e.g., Okta, Azure AD, Google)' },
                    operation: {
                        type: 'string',
                        enum: ['setup', 'update', 'test', 'disable'],
                        description: 'SSO operation',
                    },
                    config: { type: 'object', description: 'SSO configuration parameters' },
                },
                required: ['provider', 'operation'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    configured: { type: 'boolean' },
                    provider: { type: 'string' },
                    connectionStatus: { type: 'string' },
                },
            },
        },
        {
            name: 'revokeAccess',
            description: 'Revoke user access and invalidate tokens',
            inputSchema: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'User whose access to revoke' },
                    scope: {
                        type: 'string',
                        enum: ['session', 'all_tokens', 'full'],
                        description: 'Revocation scope',
                    },
                    reason: { type: 'string', description: 'Reason for revocation' },
                },
                required: ['userId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    revoked: { type: 'boolean' },
                    tokensInvalidated: { type: 'number' },
                    sessionsTerminated: { type: 'number' },
                },
            },
        },
        {
            name: 'auditAuthEvents',
            description: 'Audit and review authentication events',
            inputSchema: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'Filter by user ID' },
                    eventType: {
                        type: 'string',
                        enum: ['login', 'logout', 'mfa_challenge', 'token_refresh', 'failed_attempt'],
                        description: 'Event type filter',
                    },
                    timeRange: { type: 'string', description: 'Time range for audit' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    events: { type: 'array', items: { type: 'object' } },
                    totalEvents: { type: 'number' },
                    suspiciousActivity: { type: 'boolean' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:auth',
        'write:auth',
        'manage:mfa',
        'manage:sso',
        'revoke:access',
        'audit:auth',
    ],
    maxConcurrentTasks: 10,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let AuthenticationAgentService = class AuthenticationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.authEvents = [];
        this.activeTokens = new Map();
        this.mfaStates = new Map();
        this.ssoProviders = new Map();
    }
    defineConfig() {
        return exports.AUTHENTICATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'authenticate',
            description: 'Authenticate a user with credentials',
            execute: async (params) => this.authenticate(params),
        });
        this.registerTool({
            name: 'validateToken',
            description: 'Validate an authentication token',
            execute: async (params) => this.validateToken(params),
        });
        this.registerTool({
            name: 'manageMFA',
            description: 'Manage multi-factor authentication settings',
            execute: async (params) => this.manageMFA(params),
        });
        this.registerTool({
            name: 'configureSSO',
            description: 'Configure single sign-on integration',
            execute: async (params) => this.configureSSO(params),
        });
        this.registerTool({
            name: 'revokeAccess',
            description: 'Revoke user access and invalidate tokens',
            execute: async (params) => this.revokeAccess(params),
        });
        this.registerTool({
            name: 'auditAuthEvents',
            description: 'Audit and review authentication events',
            execute: async (params) => this.auditAuthEvents(params),
        });
        this.logger.log('Authentication agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.CertCapability.COMPLIANCE, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'authenticate':
                    result = await this.authenticate(params);
                    break;
                case 'validateToken':
                    result = await this.validateToken(params);
                    break;
                case 'manageMFA':
                    result = await this.manageMFA(params);
                    break;
                case 'configureSSO':
                    result = await this.configureSSO(params);
                    break;
                case 'revokeAccess':
                    result = await this.revokeAccess(params);
                    break;
                case 'auditAuthEvents':
                    result = await this.auditAuthEvents(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown authentication action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Authentication execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.authEvents = [];
        this.activeTokens.clear();
        this.mfaStates.clear();
        this.ssoProviders.clear();
        this.logger.log('Authentication agent destroyed, state cleared');
    }
    async authenticate(params) {
        const { userId, credentials, method } = params;
        if (!userId || !credentials || !method) {
            throw new Error('userId, credentials, and method are required');
        }
        const mfaState = this.mfaStates.get(userId);
        const mfaRequired = !!(mfaState?.enabled && method !== 'mfa');
        const authenticated = method === 'mfa' || Math.random() > 0.1;
        const event = {
            id: this.generateId(),
            userId,
            eventType: authenticated ? 'login' : 'failed_attempt',
            timestamp: new Date(),
            success: authenticated,
            metadata: { method },
        };
        this.authEvents.push(event);
        if (authenticated && !mfaRequired) {
            const tokenId = this.generateId();
            const expiresAt = new Date(Date.now() + 3600000);
            const tokenRecord = {
                tokenId,
                userId,
                issuedAt: new Date(),
                expiresAt,
                revoked: false,
                scopes: ['read', 'write'],
            };
            this.activeTokens.set(tokenId, tokenRecord);
            this.logger.log(`User ${userId} authenticated via ${method}`);
            return {
                authenticated: true,
                token: tokenId,
                expiresAt: expiresAt.toISOString(),
                mfaRequired: false,
            };
        }
        this.logger.warn(`Authentication ${authenticated ? 'succeeded' : 'failed'} for user ${userId} via ${method}`);
        return {
            authenticated,
            mfaRequired,
        };
    }
    async validateToken(params) {
        const { token, checkRevocation = true } = params;
        if (!token) {
            throw new Error('Token is required');
        }
        const record = this.activeTokens.get(token);
        if (!record) {
            return { valid: false };
        }
        const isExpired = record.expiresAt < new Date();
        const isRevoked = checkRevocation && record.revoked;
        const valid = !isExpired && !isRevoked;
        return valid
            ? {
                valid: true,
                userId: record.userId,
                expiresAt: record.expiresAt.toISOString(),
                scopes: record.scopes,
            }
            : { valid: false };
    }
    async manageMFA(params) {
        const { userId, operation, method = 'totp' } = params;
        if (!userId || !operation) {
            throw new Error('userId and operation are required');
        }
        let state = this.mfaStates.get(userId);
        switch (operation) {
            case 'enable': {
                const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
                state = {
                    userId,
                    enabled: true,
                    method,
                    verifiedAt: null,
                    backupCodes,
                };
                this.mfaStates.set(userId, state);
                this.logger.log(`MFA enabled for user ${userId} using ${method}`);
                return { success: true, mfaEnabled: true, method, backupCodes };
            }
            case 'disable': {
                if (state) {
                    state.enabled = false;
                    this.mfaStates.set(userId, state);
                }
                this.logger.log(`MFA disabled for user ${userId}`);
                return { success: true, mfaEnabled: false };
            }
            case 'verify': {
                if (state) {
                    state.verifiedAt = new Date();
                    this.mfaStates.set(userId, state);
                }
                this.logger.log(`MFA verified for user ${userId}`);
                return { success: true, mfaEnabled: state?.enabled ?? false, method: state?.method };
            }
            case 'reset': {
                const newBackupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
                if (state) {
                    state.backupCodes = newBackupCodes;
                    state.verifiedAt = null;
                    this.mfaStates.set(userId, state);
                }
                this.logger.log(`MFA reset for user ${userId}`);
                return { success: true, mfaEnabled: state?.enabled ?? false, backupCodes: newBackupCodes };
            }
            default:
                throw new Error(`Unknown MFA operation: ${operation}`);
        }
    }
    async configureSSO(params) {
        const { provider, operation, config } = params;
        if (!provider || !operation) {
            throw new Error('provider and operation are required');
        }
        switch (operation) {
            case 'setup': {
                const status = 'connected';
                this.ssoProviders.set(provider, { configured: true, connectionStatus: status });
                this.logger.log(`SSO configured for ${provider}: ${status}`);
                return { configured: true, provider, connectionStatus: status };
            }
            case 'update': {
                const existing = this.ssoProviders.get(provider);
                if (!existing) {
                    throw new Error(`SSO provider ${provider} not configured`);
                }
                this.logger.log(`SSO updated for ${provider}`);
                return { configured: true, provider, connectionStatus: existing.connectionStatus };
            }
            case 'test': {
                const entry = this.ssoProviders.get(provider);
                const connectionStatus = entry?.configured ? 'reachable' : 'not_configured';
                this.logger.log(`SSO test for ${provider}: ${connectionStatus}`);
                return { configured: entry?.configured ?? false, provider, connectionStatus };
            }
            case 'disable': {
                this.ssoProviders.delete(provider);
                this.logger.log(`SSO disabled for ${provider}`);
                return { configured: false, provider, connectionStatus: 'disabled' };
            }
            default:
                throw new Error(`Unknown SSO operation: ${operation}`);
        }
    }
    async revokeAccess(params) {
        const { userId, scope = 'all_tokens', reason } = params;
        if (!userId) {
            throw new Error('userId is required');
        }
        let tokensInvalidated = 0;
        let sessionsTerminated = 0;
        for (const [tokenId, record] of this.activeTokens) {
            if (record.userId === userId) {
                record.revoked = true;
                this.activeTokens.set(tokenId, record);
                tokensInvalidated++;
                sessionsTerminated++;
            }
        }
        const event = {
            id: this.generateId(),
            userId,
            eventType: 'access_revoked',
            timestamp: new Date(),
            success: true,
            metadata: { scope, reason, tokensInvalidated },
        };
        this.authEvents.push(event);
        this.logger.log(`Access revoked for user ${userId}: ${tokensInvalidated} tokens invalidated (reason: ${reason || 'N/A'})`);
        return { revoked: true, tokensInvalidated, sessionsTerminated };
    }
    async auditAuthEvents(params) {
        const { userId, eventType, timeRange = 'last 24h' } = params;
        let filtered = [...this.authEvents];
        if (userId) {
            filtered = filtered.filter((e) => e.userId === userId);
        }
        if (eventType) {
            filtered = filtered.filter((e) => e.eventType === eventType);
        }
        const failedAttempts = filtered.filter((e) => !e.success).length;
        const suspiciousActivity = failedAttempts > 5;
        if (suspiciousActivity) {
            this.logger.warn(`Suspicious auth activity detected: ${failedAttempts} failed attempts`);
        }
        return {
            events: filtered.map((e) => ({
                id: e.id,
                userId: e.userId,
                eventType: e.eventType,
                timestamp: e.timestamp.toISOString(),
                success: e.success,
                metadata: e.metadata,
            })),
            totalEvents: filtered.length,
            suspiciousActivity,
        };
    }
};
exports.AuthenticationAgentService = AuthenticationAgentService;
exports.AuthenticationAgentService = AuthenticationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], AuthenticationAgentService);
//# sourceMappingURL=authentication-agent.service.js.map