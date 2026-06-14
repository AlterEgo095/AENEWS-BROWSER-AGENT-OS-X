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
exports.NetworkInterceptAgentService = exports.NETWORK_INTERCEPT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.NETWORK_INTERCEPT_AGENT_CONFIG = {
    id: 'browser-network-intercept',
    name: 'NetworkIntercept',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Intercept, modify, and mock network requests in the browser. Supports request interception, response mocking, request blocking, header modification, and network activity logging for testing and debugging.',
    capabilities: [
        {
            name: 'interceptRequest',
            description: 'Intercept network requests matching a URL pattern',
            inputSchema: {
                type: 'object',
                properties: {
                    urlPattern: { type: 'string', description: 'URL pattern or regex to match' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'] },
                    action: {
                        type: 'string',
                        enum: ['continue', 'modify', 'abort', 'respond'],
                        default: 'continue',
                    },
                    modifications: { type: 'object', description: 'Modifications to apply to the request' },
                },
                required: ['urlPattern'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    interceptId: { type: 'string' },
                    active: { type: 'boolean' },
                    matchedRequests: { type: 'number' },
                },
            },
        },
        {
            name: 'mockResponse',
            description: 'Mock a network response for requests matching a pattern',
            inputSchema: {
                type: 'object',
                properties: {
                    urlPattern: { type: 'string' },
                    status: { type: 'number', default: 200 },
                    headers: { type: 'object' },
                    body: { type: 'string' },
                    contentType: { type: 'string', default: 'application/json' },
                    delay: { type: 'number', description: 'Simulated response delay in ms' },
                },
                required: ['urlPattern', 'body'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    mockId: { type: 'string' },
                    active: { type: 'boolean' },
                    urlPattern: { type: 'string' },
                },
            },
        },
        {
            name: 'blockRequest',
            description: 'Block network requests matching a URL pattern or resource type',
            inputSchema: {
                type: 'object',
                properties: {
                    urlPattern: { type: 'string' },
                    resourceType: {
                        type: 'string',
                        enum: [
                            'image',
                            'stylesheet',
                            'script',
                            'font',
                            'media',
                            'xhr',
                            'fetch',
                            'websocket',
                            'document',
                        ],
                    },
                    reason: { type: 'string' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    blocked: { type: 'boolean' },
                    blockId: { type: 'string' },
                    urlPattern: { type: 'string' },
                },
            },
        },
        {
            name: 'modifyHeaders',
            description: 'Modify request or response headers for matching requests',
            inputSchema: {
                type: 'object',
                properties: {
                    urlPattern: { type: 'string' },
                    requestHeaders: { type: 'object', description: 'Headers to add/modify on requests' },
                    responseHeaders: { type: 'object', description: 'Headers to add/modify on responses' },
                    removeRequestHeaders: { type: 'array', items: { type: 'string' } },
                    removeResponseHeaders: { type: 'array', items: { type: 'string' } },
                },
                required: ['urlPattern'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    modificationId: { type: 'string' },
                    active: { type: 'boolean' },
                },
            },
        },
        {
            name: 'getNetworkLog',
            description: 'Get the log of all intercepted network activity',
            inputSchema: {
                type: 'object',
                properties: {
                    filter: { type: 'string', enum: ['all', 'blocked', 'modified', 'mocked', 'failed'] },
                    urlPattern: { type: 'string' },
                    limit: { type: 'number', default: 50 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    entries: { type: 'array' },
                    count: { type: 'number' },
                    totalRequests: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'intercept:network',
        'modify:requests',
        'mock:responses',
    ],
    maxConcurrentTasks: 5,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 1,
        backoffMs: 500,
        exponentialBackoff: false,
    },
};
let NetworkInterceptAgentService = class NetworkInterceptAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.interceptRules = new Map();
        this.mockResponses = new Map();
        this.blockRules = new Map();
        this.headerModifications = new Map();
        this.networkLog = [];
    }
    defineConfig() {
        return exports.NETWORK_INTERCEPT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'interceptRequest',
            description: 'Intercept network requests matching a pattern',
            execute: async (params) => this.interceptRequest(params),
        });
        this.registerTool({
            name: 'mockResponse',
            description: 'Mock a network response',
            execute: async (params) => this.mockResponse(params),
        });
        this.registerTool({
            name: 'blockRequest',
            description: 'Block network requests',
            execute: async (params) => this.blockRequest(params),
        });
        this.registerTool({
            name: 'modifyHeaders',
            description: 'Modify request/response headers',
            execute: async (params) => this.modifyHeaders(params),
        });
        this.registerTool({
            name: 'getNetworkLog',
            description: 'Get network activity log',
            execute: async (params) => this.getNetworkLog(params),
        });
        this.logger.log('NetworkIntercept agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.SESSION, {
                    missionId: input.taskId,
                    instruction: action || 'interceptNetwork',
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge execution failed, falling back to local: ${error.message}`);
            }
        }
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'interceptRequest':
                    result = await this.interceptRequest(params);
                    break;
                case 'mockResponse':
                    result = await this.mockResponse(params);
                    break;
                case 'blockRequest':
                    result = await this.blockRequest(params);
                    break;
                case 'modifyHeaders':
                    result = await this.modifyHeaders(params);
                    break;
                case 'getNetworkLog':
                    result = await this.getNetworkLog(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown network action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`NetworkIntercept execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.interceptRules.clear();
        this.mockResponses.clear();
        this.blockRules.clear();
        this.headerModifications.clear();
        this.networkLog = [];
        this.logger.log('NetworkIntercept agent destroyed, all rules and logs cleared');
    }
    async interceptRequest(params) {
        const { urlPattern, method = 'ANY', action = 'continue', modifications } = params;
        if (!urlPattern)
            throw new Error('URL pattern is required');
        try {
            new RegExp(urlPattern);
        }
        catch {
            if (!urlPattern.includes('*') && !urlPattern.startsWith('http')) {
                throw new Error(`Invalid URL pattern: ${urlPattern}`);
            }
        }
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'];
        if (!validMethods.includes(method.toUpperCase())) {
            throw new Error(`Invalid method: ${method}`);
        }
        const validActions = ['continue', 'modify', 'abort', 'respond'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
        }
        const id = this.generateId();
        const rule = {
            id,
            urlPattern,
            method: method.toUpperCase(),
            action,
            modifications,
            active: true,
            matchedCount: 0,
            createdAt: new Date(),
        };
        this.interceptRules.set(id, rule);
        this.logger.log(`Intercept rule created: ${urlPattern} (${method}) -> ${action}`);
        return { interceptId: id, active: true, matchedRequests: 0 };
    }
    async mockResponse(params) {
        const { urlPattern, status = 200, headers = {}, body, contentType = 'application/json', delay = 0, } = params;
        if (!urlPattern)
            throw new Error('URL pattern is required');
        if (body === undefined || body === null)
            throw new Error('Response body is required');
        if (status < 100 || status > 599) {
            throw new Error(`Invalid HTTP status code: ${status}`);
        }
        const id = this.generateId();
        const mock = {
            id,
            urlPattern,
            status,
            headers,
            body,
            contentType,
            delay,
            active: true,
            servedCount: 0,
            createdAt: new Date(),
        };
        this.mockResponses.set(id, mock);
        this.networkLog.push({
            id: this.generateId(),
            url: urlPattern,
            method: 'GET',
            resourceType: 'xhr',
            status,
            requestHeaders: {},
            responseHeaders: { 'Content-Type': contentType, ...headers },
            timing: { start: Date.now(), end: Date.now() + delay, duration: delay },
            blocked: false,
            modified: false,
            mocked: true,
            timestamp: new Date(),
        });
        this.logger.log(`Mock response set: ${urlPattern} -> ${status} (${contentType})`);
        return { mockId: id, active: true, urlPattern };
    }
    async blockRequest(params) {
        const { urlPattern, resourceType, reason = 'Blocked by agent' } = params;
        if (!urlPattern && !resourceType) {
            throw new Error('Either urlPattern or resourceType must be provided');
        }
        const validResourceTypes = [
            'image',
            'stylesheet',
            'script',
            'font',
            'media',
            'xhr',
            'fetch',
            'websocket',
            'document',
        ];
        if (resourceType && !validResourceTypes.includes(resourceType)) {
            throw new Error(`Invalid resource type: ${resourceType}`);
        }
        const id = this.generateId();
        const rule = {
            id,
            urlPattern,
            resourceType,
            reason,
            active: true,
            blockedCount: 0,
            createdAt: new Date(),
        };
        this.blockRules.set(id, rule);
        this.logger.log(`Block rule created: ${urlPattern || resourceType} (${reason})`);
        return {
            blocked: true,
            blockId: id,
            urlPattern: urlPattern || resourceType || '*',
        };
    }
    async modifyHeaders(params) {
        const { urlPattern, requestHeaders = {}, responseHeaders = {}, removeRequestHeaders = [], removeResponseHeaders = [], } = params;
        if (!urlPattern)
            throw new Error('URL pattern is required');
        if (Object.keys(requestHeaders).length === 0 &&
            Object.keys(responseHeaders).length === 0 &&
            removeRequestHeaders.length === 0 &&
            removeResponseHeaders.length === 0) {
            throw new Error('At least one header modification must be specified');
        }
        const id = this.generateId();
        const modification = {
            id,
            urlPattern,
            requestHeaders,
            responseHeaders,
            removeRequestHeaders,
            removeResponseHeaders,
            active: true,
            appliedCount: 0,
            createdAt: new Date(),
        };
        this.headerModifications.set(id, modification);
        const changes = [
            Object.keys(requestHeaders).length > 0
                ? `${Object.keys(requestHeaders).length} request header(s)`
                : '',
            Object.keys(responseHeaders).length > 0
                ? `${Object.keys(responseHeaders).length} response header(s)`
                : '',
            removeRequestHeaders.length > 0
                ? `remove ${removeRequestHeaders.length} request header(s)`
                : '',
            removeResponseHeaders.length > 0
                ? `remove ${removeResponseHeaders.length} response header(s)`
                : '',
        ]
            .filter(Boolean)
            .join(', ');
        this.logger.log(`Header modification set for ${urlPattern}: ${changes}`);
        return { modificationId: id, active: true };
    }
    async getNetworkLog(params) {
        const { filter = 'all', urlPattern, limit = 50 } = params;
        let entries = [...this.networkLog];
        switch (filter) {
            case 'blocked':
                entries = entries.filter((e) => e.blocked);
                break;
            case 'modified':
                entries = entries.filter((e) => e.modified);
                break;
            case 'mocked':
                entries = entries.filter((e) => e.mocked);
                break;
            case 'failed':
                entries = entries.filter((e) => e.status >= 400);
                break;
        }
        if (urlPattern) {
            try {
                const regex = new RegExp(urlPattern);
                entries = entries.filter((e) => regex.test(e.url));
            }
            catch {
                entries = entries.filter((e) => e.url.includes(urlPattern));
            }
        }
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const totalRequests = entries.length;
        entries = entries.slice(0, limit);
        this.logger.log(`Network log: ${entries.length}/${totalRequests} entries (filter: ${filter})`);
        return { entries, count: entries.length, totalRequests };
    }
};
exports.NetworkInterceptAgentService = NetworkInterceptAgentService;
exports.NetworkInterceptAgentService = NetworkInterceptAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], NetworkInterceptAgentService);
//# sourceMappingURL=network-intercept-agent.service.js.map