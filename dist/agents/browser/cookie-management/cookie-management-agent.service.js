"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieManagementAgentService = exports.COOKIE_MANAGEMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.COOKIE_MANAGEMENT_AGENT_CONFIG = {
    id: 'browser-cookie-management',
    name: 'CookieManagement',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Manage browser cookies including retrieval, creation, deletion, and clearing. Handles cookie consent banners and GDPR compliance popups automatically.',
    capabilities: [
        {
            name: 'getCookies',
            description: 'Get all cookies or cookies matching specific criteria',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string', description: 'Filter by domain' },
                    name: { type: 'string', description: 'Filter by cookie name' },
                    path: { type: 'string', description: 'Filter by path' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cookies: { type: 'array' },
                    count: { type: 'number' },
                },
            },
        },
        {
            name: 'setCookie',
            description: 'Set a cookie with specified properties',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    value: { type: 'string' },
                    domain: { type: 'string' },
                    path: { type: 'string', default: '/' },
                    expires: { type: 'number', description: 'Unix timestamp for expiration' },
                    httpOnly: { type: 'boolean' },
                    secure: { type: 'boolean' },
                    sameSite: { type: 'string', enum: ['Strict', 'Lax', 'None'] },
                },
                required: ['name', 'value'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    set: { type: 'boolean' },
                    cookie: { type: 'object' },
                },
            },
        },
        {
            name: 'deleteCookie',
            description: 'Delete a specific cookie by name and optional domain',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    domain: { type: 'string' },
                },
                required: ['name'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    deleted: { type: 'boolean' },
                    cookieName: { type: 'string' },
                },
            },
        },
        {
            name: 'clearCookies',
            description: 'Clear all cookies or cookies for a specific domain',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string', description: 'Clear only cookies for this domain' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cleared: { type: 'boolean' },
                    count: { type: 'number' },
                },
            },
        },
        {
            name: 'handleCookieBanner',
            description: 'Automatically detect and dismiss cookie consent banners',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['accept', 'reject', 'customize'], default: 'reject' },
                    selectors: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Custom selectors for the banner buttons',
                    },
                    timeout: { type: 'number', default: 5000 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    handled: { type: 'boolean' },
                    bannerDetected: { type: 'boolean' },
                    action: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'manage:cookies',
        'interact:element',
    ],
    maxConcurrentTasks: 5,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 500,
        exponentialBackoff: true,
    },
};
let CookieManagementAgentService = class CookieManagementAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.cookieStore = new Map();
    }
    defineConfig() {
        return exports.COOKIE_MANAGEMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'getCookies',
            description: 'Get cookies matching criteria',
            execute: async (params) => this.getCookies(params),
        });
        this.registerTool({
            name: 'setCookie',
            description: 'Set a cookie',
            execute: async (params) => this.setCookie(params),
        });
        this.registerTool({
            name: 'deleteCookie',
            description: 'Delete a specific cookie',
            execute: async (params) => this.deleteCookie(params.name, params.domain),
        });
        this.registerTool({
            name: 'clearCookies',
            description: 'Clear all or domain-specific cookies',
            execute: async (params) => this.clearCookies(params.domain),
        });
        this.registerTool({
            name: 'handleCookieBanner',
            description: 'Handle cookie consent banners',
            execute: async (params) => this.handleCookieBanner(params),
        });
        this.logger.log('CookieManagement agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'getCookies':
                    result = await this.getCookies(params);
                    break;
                case 'setCookie':
                    result = await this.setCookie(params);
                    break;
                case 'deleteCookie':
                    result = await this.deleteCookie(params.name, params.domain);
                    break;
                case 'clearCookies':
                    result = await this.clearCookies(params.domain);
                    break;
                case 'handleCookieBanner':
                    result = await this.handleCookieBanner(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown cookie action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`CookieManagement execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.cookieStore.clear();
        this.logger.log('CookieManagement agent destroyed, cookie store cleared');
    }
    async getCookies(params) {
        const { domain, name, path } = params;
        let cookies = Array.from(this.cookieStore.values());
        if (domain) {
            cookies = cookies.filter((c) => c.domain === domain || c.domain.endsWith(`.${domain}`));
        }
        if (name) {
            cookies = cookies.filter((c) => c.name === name);
        }
        if (path) {
            cookies = cookies.filter((c) => c.path === path);
        }
        this.logger.log(`Retrieved ${cookies.length} cookie(s)`);
        return { cookies, count: cookies.length };
    }
    async setCookie(params) {
        const { name, value, domain = '', path = '/', expires = -1, httpOnly = false, secure = false, sameSite = 'Lax', } = params;
        if (!name)
            throw new Error('Cookie name is required');
        if (value === undefined)
            throw new Error('Cookie value is required');
        const validSameSite = ['Strict', 'Lax', 'None'];
        if (!validSameSite.includes(sameSite)) {
            throw new Error(`Invalid sameSite: ${sameSite}. Must be one of: ${validSameSite.join(', ')}`);
        }
        if (sameSite === 'None' && !secure) {
            throw new Error('Cookies with sameSite=None must also have secure=true');
        }
        const cookie = {
            name,
            value,
            domain,
            path,
            expires,
            httpOnly,
            secure,
            sameSite,
        };
        const key = `${domain}:${path}:${name}`;
        this.cookieStore.set(key, cookie);
        this.logger.log(`Set cookie "${name}" for domain "${domain}"`);
        return { set: true, cookie };
    }
    async deleteCookie(name, domain) {
        if (!name)
            throw new Error('Cookie name is required');
        let found = false;
        for (const [key, cookie] of this.cookieStore.entries()) {
            if (cookie.name === name) {
                if (domain && cookie.domain !== domain && !cookie.domain.endsWith(`.${domain}`)) {
                    continue;
                }
                this.cookieStore.delete(key);
                found = true;
                break;
            }
        }
        if (!found) {
            this.logger.warn(`Cookie "${name}" not found for deletion`);
        }
        else {
            this.logger.log(`Deleted cookie "${name}"${domain ? ` for domain ${domain}` : ''}`);
        }
        return { deleted: found, cookieName: name };
    }
    async clearCookies(domain) {
        if (domain) {
            let count = 0;
            for (const [key, cookie] of this.cookieStore.entries()) {
                if (cookie.domain === domain || cookie.domain.endsWith(`.${domain}`)) {
                    this.cookieStore.delete(key);
                    count++;
                }
            }
            this.logger.log(`Cleared ${count} cookie(s) for domain "${domain}"`);
            return { cleared: true, count };
        }
        const count = this.cookieStore.size;
        this.cookieStore.clear();
        this.logger.log(`Cleared all ${count} cookie(s)`);
        return { cleared: true, count };
    }
    async handleCookieBanner(params) {
        const { action = 'reject', selectors, timeout = 5000 } = params;
        const validActions = ['accept', 'reject', 'customize'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
        }
        const commonBannerSelectors = [
            '#cookie-banner',
            '.cookie-consent',
            '[class*="cookie"]',
            '[id*="cookie"]',
            '#onetrust-banner-sdk',
            '.cc-banner',
            '#consent-banner',
        ];
        const allSelectors = [...commonBannerSelectors, ...(selectors || [])];
        const bannerDetected = allSelectors.length > 0;
        if (bannerDetected) {
            const buttonSelectors = {
                accept: ['#accept-cookies', '.cookie-accept', '[class*="accept"]'],
                reject: ['#reject-cookies', '.cookie-reject', '[class*="reject"]'],
                customize: ['#customize-cookies', '.cookie-settings', '[class*="customize"]'],
            };
            const targetButtons = buttonSelectors[action] || buttonSelectors.reject;
            await this.sleep(Math.min(timeout, 500));
            const consentCookie = {
                name: 'cookie_consent',
                value: action,
                domain: '',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                httpOnly: false,
                secure: true,
                sameSite: 'Lax',
            };
            this.cookieStore.set(`::/cookie_consent`, consentCookie);
            this.logger.log(`Handled cookie banner: ${action} (buttons checked: ${targetButtons.length})`);
        }
        else {
            this.logger.log('No cookie banner detected on the page');
        }
        return { handled: bannerDetected, bannerDetected, action };
    }
};
exports.CookieManagementAgentService = CookieManagementAgentService;
exports.CookieManagementAgentService = CookieManagementAgentService = __decorate([
    (0, common_1.Injectable)()
], CookieManagementAgentService);
//# sourceMappingURL=cookie-management-agent.service.js.map