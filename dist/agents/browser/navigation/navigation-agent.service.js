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
exports.NavigationAgentService = exports.NAVIGATION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.NAVIGATION_AGENT_CONFIG = {
    id: 'browser-navigation',
    name: 'Navigation',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Navigate to URLs, handle redirects, manage browser history, and control page transitions. Supports navigation with wait strategies, URL validation, and redirect chain tracking.',
    capabilities: [
        {
            name: 'navigateTo',
            description: 'Navigate the browser to a specified URL with optional wait conditions',
            inputSchema: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Target URL to navigate to' },
                    waitUntil: {
                        type: 'string',
                        enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                        description: 'When to consider navigation complete',
                    },
                    timeout: { type: 'number', description: 'Maximum navigation timeout in ms' },
                    referer: { type: 'string', description: 'HTTP referer header' },
                },
                required: ['url'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    finalUrl: { type: 'string' },
                    statusCode: { type: 'number' },
                    redirectChain: { type: 'array', items: { type: 'string' } },
                    loadTime: { type: 'number' },
                },
            },
        },
        {
            name: 'goBack',
            description: 'Navigate back in browser history',
            inputSchema: {
                type: 'object',
                properties: {
                    steps: { type: 'number', description: 'Number of steps to go back' },
                    waitUntil: { type: 'string', description: 'Navigation wait condition' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    previousUrl: { type: 'string' },
                    currentUrl: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'goForward',
            description: 'Navigate forward in browser history',
            inputSchema: {
                type: 'object',
                properties: {
                    steps: { type: 'number', description: 'Number of steps to go forward' },
                    waitUntil: { type: 'string', description: 'Navigation wait condition' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    previousUrl: { type: 'string' },
                    currentUrl: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'refresh',
            description: 'Refresh the current page with optional cache bypass',
            inputSchema: {
                type: 'object',
                properties: {
                    hardRefresh: { type: 'boolean', description: 'Bypass cache on refresh' },
                    waitUntil: { type: 'string', description: 'Navigation wait condition' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    currentUrl: { type: 'string' },
                    loadTime: { type: 'number' },
                    fromCache: { type: 'boolean' },
                },
            },
        },
        {
            name: 'waitForNavigation',
            description: 'Wait for a navigation event to occur within a specified timeout',
            inputSchema: {
                type: 'object',
                properties: {
                    timeout: { type: 'number', description: 'Maximum wait time in ms' },
                    waitUntil: { type: 'string', description: 'Navigation wait condition' },
                    urlPattern: { type: 'string', description: 'URL pattern to wait for' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    navigated: { type: 'boolean' },
                    finalUrl: { type: 'string' },
                    waitTime: { type: 'number' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:browser', 'write:browser', 'navigate:url', 'access:history'],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let NavigationAgentService = class NavigationAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.navigationHistory = [];
        this.currentUrl = '';
        this.historyIndex = -1;
    }
    defineConfig() {
        return exports.NAVIGATION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'navigateTo',
            description: 'Navigate the browser to a specified URL',
            execute: async (params) => this.navigateTo(params),
        });
        this.registerTool({
            name: 'goBack',
            description: 'Navigate back in browser history',
            execute: async (params) => this.goBack(params.steps || 1),
        });
        this.registerTool({
            name: 'goForward',
            description: 'Navigate forward in browser history',
            execute: async (params) => this.goForward(params.steps || 1),
        });
        this.registerTool({
            name: 'refresh',
            description: 'Refresh the current page',
            execute: async (params) => this.refresh(params.hardRefresh || false),
        });
        this.registerTool({
            name: 'waitForNavigation',
            description: 'Wait for a navigation event',
            execute: async (params) => this.waitForNavigation(params),
        });
        this.logger.log('Navigation agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.NAVIGATION, {
                    missionId: input.taskId,
                    instruction: action || 'navigate',
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
                case 'navigateTo':
                    result = await this.navigateTo(params);
                    break;
                case 'goBack':
                    result = await this.goBack(params.steps || 1);
                    break;
                case 'goForward':
                    result = await this.goForward(params.steps || 1);
                    break;
                case 'refresh':
                    result = await this.refresh(params.hardRefresh || false);
                    break;
                case 'waitForNavigation':
                    result = await this.waitForNavigation(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown navigation action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Navigation execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.navigationHistory = [];
        this.currentUrl = '';
        this.historyIndex = -1;
        this.logger.log('Navigation agent destroyed, history cleared');
    }
    async navigateTo(params) {
        const { url, timeout = 30000, referer } = params;
        if (!url || typeof url !== 'string') {
            throw new Error('A valid URL string is required');
        }
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch {
            throw new Error(`Invalid URL format: ${url}`);
        }
        const supportedProtocols = ['http:', 'https:', 'file:'];
        if (!supportedProtocols.includes(parsedUrl.protocol)) {
            throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Use http, https, or file.`);
        }
        const navigationStart = Date.now();
        const redirectChain = [];
        let currentRedirectUrl = url;
        const maxRedirects = 10;
        for (let i = 0; i < maxRedirects; i++) {
            const simulatedRedirect = this.simulateRedirectCheck(currentRedirectUrl);
            if (!simulatedRedirect)
                break;
            redirectChain.push(currentRedirectUrl);
            currentRedirectUrl = simulatedRedirect;
        }
        const finalUrl = currentRedirectUrl;
        const loadTime = Date.now() - navigationStart;
        const statusCode = this.simulateStatusCode(finalUrl);
        const entry = {
            url: finalUrl,
            timestamp: new Date(),
            statusCode,
            redirectChain,
            loadTimeMs: loadTime,
        };
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
        }
        this.navigationHistory.push(entry);
        this.historyIndex = this.navigationHistory.length - 1;
        this.currentUrl = finalUrl;
        if (referer) {
            await this.storeInWorkingMemory('lastReferer', referer, 300000);
        }
        this.logger.log(`Navigated to ${finalUrl} (status: ${statusCode}, load: ${loadTime}ms)`);
        return {
            finalUrl,
            statusCode,
            redirectChain,
            loadTime,
        };
    }
    async goBack(steps) {
        if (this.navigationHistory.length === 0) {
            throw new Error('No navigation history available to go back');
        }
        const previousUrl = this.currentUrl;
        const targetIndex = Math.max(0, this.historyIndex - steps);
        if (targetIndex === this.historyIndex) {
            this.logger.warn('Already at the beginning of history, cannot go back further');
            return { previousUrl, currentUrl: this.currentUrl, success: false };
        }
        this.historyIndex = targetIndex;
        this.currentUrl = this.navigationHistory[targetIndex].url;
        this.logger.log(`Went back ${steps} step(s) to ${this.currentUrl}`);
        return {
            previousUrl,
            currentUrl: this.currentUrl,
            success: true,
        };
    }
    async goForward(steps) {
        if (this.historyIndex >= this.navigationHistory.length - 1) {
            throw new Error('No forward history available');
        }
        const previousUrl = this.currentUrl;
        const targetIndex = Math.min(this.navigationHistory.length - 1, this.historyIndex + steps);
        if (targetIndex === this.historyIndex) {
            this.logger.warn('Already at the end of history, cannot go forward further');
            return { previousUrl, currentUrl: this.currentUrl, success: false };
        }
        this.historyIndex = targetIndex;
        this.currentUrl = this.navigationHistory[targetIndex].url;
        this.logger.log(`Went forward ${steps} step(s) to ${this.currentUrl}`);
        return {
            previousUrl,
            currentUrl: this.currentUrl,
            success: true,
        };
    }
    async refresh(hardRefresh) {
        if (!this.currentUrl) {
            throw new Error('No current page to refresh');
        }
        const refreshStart = Date.now();
        const fromCache = !hardRefresh;
        if (this.historyIndex >= 0 && this.historyIndex < this.navigationHistory.length) {
            this.navigationHistory[this.historyIndex].timestamp = new Date();
            this.navigationHistory[this.historyIndex].loadTimeMs = Date.now() - refreshStart;
        }
        const loadTime = Date.now() - refreshStart;
        this.logger.log(`Refreshed ${this.currentUrl} (hard: ${hardRefresh}, cache: ${fromCache})`);
        return {
            currentUrl: this.currentUrl,
            loadTime,
            fromCache,
        };
    }
    async waitForNavigation(params) {
        const { timeout = 10000, urlPattern } = params;
        const waitStart = Date.now();
        const simulatedWaitTime = Math.min(timeout, Math.random() * 2000);
        await this.sleep(simulatedWaitTime);
        let navigated = true;
        if (urlPattern) {
            try {
                const regex = new RegExp(urlPattern);
                navigated = regex.test(this.currentUrl);
            }
            catch {
                navigated = this.currentUrl.includes(urlPattern);
            }
        }
        const waitTime = Date.now() - waitStart;
        return {
            navigated,
            finalUrl: this.currentUrl,
            waitTime,
        };
    }
    simulateRedirectCheck(url) {
        const parsed = new URL(url);
        if (parsed.hostname.includes('bit.ly') || parsed.hostname.includes('t.co')) {
            return `https://example.com/redirected-from-${parsed.pathname.replace('/', '')}`;
        }
        if (parsed.protocol === 'http:') {
            return url.replace('http://', 'https://');
        }
        return null;
    }
    simulateStatusCode(url) {
        const parsed = new URL(url);
        if (parsed.pathname === '/404')
            return 404;
        if (parsed.pathname === '/500')
            return 500;
        if (parsed.pathname === '/403')
            return 403;
        if (parsed.pathname === '/redirect')
            return 301;
        return 200;
    }
};
exports.NavigationAgentService = NavigationAgentService;
exports.NavigationAgentService = NavigationAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], NavigationAgentService);
//# sourceMappingURL=navigation-agent.service.js.map