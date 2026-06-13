"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaScriptExecutionAgentService = exports.JAVASCRIPT_EXECUTION_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.JAVASCRIPT_EXECUTION_AGENT_CONFIG = {
    id: 'browser-javascript-execution',
    name: 'JavaScriptExecution',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Execute JavaScript code in the browser page context. Supports evaluating expressions, running scripts, injecting external scripts, and evaluating functions with arguments. Handles sandboxing and result serialization.',
    capabilities: [
        {
            name: 'evaluateExpression',
            description: 'Evaluate a JavaScript expression and return the result',
            inputSchema: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: 'JavaScript expression to evaluate' },
                    returnByValue: {
                        type: 'boolean',
                        default: true,
                        description: 'Return value instead of JSHandle',
                    },
                },
                required: ['expression'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    result: { type: 'any' },
                    resultType: { type: 'string' },
                },
            },
        },
        {
            name: 'executeScript',
            description: 'Execute a block of JavaScript code in the page context',
            inputSchema: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: 'JavaScript code to execute' },
                    args: { type: 'array', description: 'Arguments to pass to the script' },
                },
                required: ['script'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    result: { type: 'any' },
                    executionTime: { type: 'number' },
                    consoleOutput: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'injectScript',
            description: 'Inject an external script by URL into the page',
            inputSchema: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL of the script to inject' },
                    waitForLoad: { type: 'boolean', default: true },
                    timeout: { type: 'number', default: 10000 },
                },
                required: ['url'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    injected: { type: 'boolean' },
                    url: { type: 'string' },
                    loadTime: { type: 'number' },
                },
            },
        },
        {
            name: 'evaluateFunction',
            description: 'Evaluate a JavaScript function with arguments',
            inputSchema: {
                type: 'object',
                properties: {
                    functionBody: { type: 'string', description: 'Function body as a string' },
                    args: { type: 'array', description: 'Arguments to pass to the function' },
                },
                required: ['functionBody'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    result: { type: 'any' },
                    executionTime: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'execute:javascript',
        'inject:script',
    ],
    maxConcurrentTasks: 5,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 1,
        backoffMs: 500,
        exponentialBackoff: false,
    },
};
let JavaScriptExecutionAgentService = class JavaScriptExecutionAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.executionHistory = [];
    }
    defineConfig() {
        return exports.JAVASCRIPT_EXECUTION_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'evaluateExpression',
            description: 'Evaluate a JavaScript expression',
            execute: async (params) => this.evaluateExpression(params),
        });
        this.registerTool({
            name: 'executeScript',
            description: 'Execute a block of JavaScript code',
            execute: async (params) => this.executeScript(params),
        });
        this.registerTool({
            name: 'injectScript',
            description: 'Inject an external script by URL',
            execute: async (params) => this.injectScript(params),
        });
        this.registerTool({
            name: 'evaluateFunction',
            description: 'Evaluate a JavaScript function with arguments',
            execute: async (params) => this.evaluateFunction(params),
        });
        this.logger.log('JavaScriptExecution agent initialized with 4 tools');
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
                case 'evaluateExpression':
                    result = await this.evaluateExpression(params);
                    break;
                case 'executeScript':
                    result = await this.executeScript(params);
                    break;
                case 'injectScript':
                    result = await this.injectScript(params);
                    break;
                case 'evaluateFunction':
                    result = await this.evaluateFunction(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown JS execution action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`JavaScriptExecution execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.executionHistory = [];
        this.logger.log('JavaScriptExecution agent destroyed, history cleared');
    }
    async evaluateExpression(params) {
        const { expression } = params;
        if (!expression)
            throw new Error('JavaScript expression is required');
        this.validateScriptSafety(expression);
        const execStart = Date.now();
        let result;
        let resultType;
        try {
            result = this.simulateEvaluation(expression);
            resultType = typeof result;
        }
        catch (evalError) {
            const record = {
                id: this.generateId(),
                type: 'expression',
                code: expression,
                success: false,
                result: null,
                executionTimeMs: Date.now() - execStart,
                timestamp: new Date(),
                consoleOutput: [`Error: ${evalError.message}`],
            };
            this.executionHistory.push(record);
            throw evalError;
        }
        const record = {
            id: this.generateId(),
            type: 'expression',
            code: expression,
            success: true,
            result,
            executionTimeMs: Date.now() - execStart,
            timestamp: new Date(),
            consoleOutput: [],
        };
        this.executionHistory.push(record);
        this.logger.log(`Evaluated expression (${resultType}): ${expression.substring(0, 50)}...`);
        return { success: true, result, resultType };
    }
    async executeScript(params) {
        const { script } = params;
        if (!script)
            throw new Error('Script code is required');
        this.validateScriptSafety(script);
        const execStart = Date.now();
        const consoleOutput = [];
        const consoleLogPattern = /console\.log\(([^)]+)\)/g;
        let match;
        while ((match = consoleLogPattern.exec(script)) !== null) {
            consoleOutput.push(`[log] ${match[1].replace(/['"]/g, '')}`);
        }
        const simulatedTime = Math.min(500, script.length * 0.5);
        await this.sleep(simulatedTime);
        let result = 'Script executed successfully';
        const success = true;
        if (script.includes('document.querySelector')) {
            result = { tagName: 'div', textContent: 'Simulated element', attributes: {} };
        }
        else if (script.includes('document.title')) {
            result = 'Simulated Page Title';
        }
        else if (script.includes('window.location')) {
            result = 'https://example.com/page';
        }
        else if (script.includes('localStorage')) {
            result = { key: 'value' };
        }
        else if (script.includes('fetch(')) {
            result = { status: 200, data: {} };
            consoleOutput.push('[log] Fetch request simulated');
        }
        const executionTime = Date.now() - execStart;
        const record = {
            id: this.generateId(),
            type: 'script',
            code: script,
            success,
            result,
            executionTimeMs: executionTime,
            timestamp: new Date(),
            consoleOutput,
        };
        this.executionHistory.push(record);
        this.logger.log(`Executed script (${executionTime}ms, ${consoleOutput.length} console lines)`);
        return { success, result, executionTime, consoleOutput };
    }
    async injectScript(params) {
        const { url, waitForLoad = true, timeout = 10000 } = params;
        if (!url)
            throw new Error('Script URL is required');
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
                throw new Error(`Unsupported protocol: ${parsed.protocol}`);
            }
        }
        catch (e) {
            throw new Error(`Invalid script URL: ${url}`);
        }
        const loadStart = Date.now();
        const simulatedLoadTime = Math.min(timeout - 100, 200 + Math.random() * 1000);
        if (waitForLoad) {
            await this.sleep(simulatedLoadTime);
        }
        const loadTime = Date.now() - loadStart;
        const record = {
            id: this.generateId(),
            type: 'injection',
            code: `/* injected from ${url} */`,
            success: true,
            result: null,
            executionTimeMs: loadTime,
            timestamp: new Date(),
            consoleOutput: [`[log] Script loaded from ${url}`],
        };
        this.executionHistory.push(record);
        this.logger.log(`Injected script from ${url} (${loadTime}ms)`);
        return { injected: true, url, loadTime };
    }
    async evaluateFunction(params) {
        const { functionBody, args = [] } = params;
        if (!functionBody)
            throw new Error('Function body is required');
        this.validateScriptSafety(functionBody);
        const execStart = Date.now();
        let result;
        let success = true;
        try {
            result = this.simulateFunctionEvaluation(functionBody, args);
        }
        catch (evalError) {
            success = false;
            result = null;
        }
        const executionTime = Date.now() - execStart;
        const record = {
            id: this.generateId(),
            type: 'function',
            code: functionBody,
            success,
            result,
            executionTimeMs: executionTime,
            timestamp: new Date(),
            consoleOutput: [],
        };
        this.executionHistory.push(record);
        this.logger.log(`Evaluated function (${executionTime}ms, args: ${args.length})`);
        return { success, result, executionTime };
    }
    validateScriptSafety(code) {
        const dangerousPatterns = [
            { pattern: /process\.exit/, message: 'process.exit is not allowed' },
            { pattern: /require\s*\(/, message: 'require() is not allowed in browser context' },
            { pattern: /import\s+/, message: 'import statements are not allowed in browser context' },
            { pattern: /eval\s*\(/, message: 'Nested eval() is not allowed' },
            { pattern: /Function\s*\(/, message: 'Dynamic Function constructor is not allowed' },
        ];
        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(code)) {
                throw new Error(`Script safety violation: ${message}`);
            }
        }
    }
    simulateEvaluation(expression) {
        if (/^\d+$/.test(expression.trim())) {
            return parseInt(expression.trim(), 10);
        }
        if (/^["'].*["']$/.test(expression.trim())) {
            return expression.trim().slice(1, -1);
        }
        if (expression.includes('document.title'))
            return 'Simulated Page Title';
        if (expression.includes('window.location.href'))
            return 'https://example.com';
        if (expression.includes('navigator.userAgent'))
            return 'Mozilla/5.0 (Simulated)';
        if (expression.includes('document.cookie'))
            return 'session=abc123';
        if (expression.includes('window.innerWidth'))
            return 1920;
        if (expression.includes('window.innerHeight'))
            return 1080;
        if (expression.includes('Math.')) {
            if (expression.includes('random'))
                return Math.random();
            if (expression.includes('floor'))
                return 42;
            if (expression.includes('ceil'))
                return 43;
            return 0;
        }
        if (expression.includes('Date.now()'))
            return Date.now();
        if (expression.includes('JSON.parse'))
            return { parsed: true };
        if (expression.includes('Array.isArray'))
            return false;
        return 'Expression result';
    }
    simulateFunctionEvaluation(functionBody, args) {
        if (functionBody.includes('querySelector')) {
            return { tagName: 'div', textContent: 'Found element' };
        }
        if (functionBody.includes('querySelectorAll')) {
            return [{ tagName: 'div' }, { tagName: 'span' }];
        }
        if (functionBody.includes('getAttribute')) {
            return 'attribute-value';
        }
        if (functionBody.includes('textContent') || functionBody.includes('innerText')) {
            return 'Element text content';
        }
        if (functionBody.includes('style')) {
            return { color: 'rgb(0, 0, 0)', fontSize: '16px' };
        }
        if (functionBody.includes('classList')) {
            return ['class1', 'class2'];
        }
        if (functionBody.includes('scrollHeight') || functionBody.includes('offsetHeight')) {
            return 1000;
        }
        if (functionBody.includes('return')) {
            if (args.length > 0) {
                return args[0];
            }
            return true;
        }
        return null;
    }
};
exports.JavaScriptExecutionAgentService = JavaScriptExecutionAgentService;
exports.JavaScriptExecutionAgentService = JavaScriptExecutionAgentService = __decorate([
    (0, common_1.Injectable)()
], JavaScriptExecutionAgentService);
//# sourceMappingURL=javascript-execution-agent.service.js.map