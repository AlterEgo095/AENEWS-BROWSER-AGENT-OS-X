"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggingAgentService = exports.DEBUGGING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.DEBUGGING_AGENT_CONFIG = {
    id: 'coding-debugging',
    name: 'Debugging',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Debug code issues, trace errors through execution paths, suggest and apply fixes, and validate that fixes resolve the issue. Provides systematic error analysis and resolution.',
    capabilities: [
        {
            name: 'analyzeError',
            description: 'Analyze an error to determine root cause, severity, and affected code paths',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'Error object with message, stack, and type' },
                    code: { type: 'string', description: 'Source code where error occurred' },
                    language: { type: 'string', description: 'Programming language' },
                    context: { type: 'object', description: 'Additional runtime context' },
                },
                required: ['error'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rootCause: { type: 'string' },
                    severity: { type: 'string' },
                    affectedPaths: { type: 'array', items: { type: 'string' } },
                    analysis: { type: 'string' },
                    relatedErrors: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'traceExecution',
            description: 'Trace the execution path leading to an error',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to trace' },
                    entryPoint: { type: 'string', description: 'Function or entry point to start tracing' },
                    language: { type: 'string', description: 'Programming language' },
                    inputs: { type: 'object', description: 'Input values for the trace' },
                    maxDepth: { type: 'number', description: 'Maximum trace depth' },
                },
                required: ['code', 'entryPoint', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    traceSteps: { type: 'array', items: { type: 'object' } },
                    errorPoint: { type: 'object' },
                    variablesAtError: { type: 'object' },
                    executionFlow: { type: 'string' },
                },
            },
        },
        {
            name: 'suggestFix',
            description: 'Suggest potential fixes for a given error or code issue',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'Error description or object' },
                    code: { type: 'string', description: 'Source code' },
                    language: { type: 'string', description: 'Programming language' },
                    maxSuggestions: { type: 'number', default: 3 },
                },
                required: ['error', 'code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    suggestions: { type: 'array', items: { type: 'object' } },
                    confidence: { type: 'number' },
                    autoFixable: { type: 'boolean' },
                },
            },
        },
        {
            name: 'applyFix',
            description: 'Apply a suggested fix to the source code',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to fix' },
                    fix: { type: 'object', description: 'Fix object from suggestFix' },
                    language: { type: 'string', description: 'Programming language' },
                    dryRun: { type: 'boolean', default: true },
                },
                required: ['code', 'fix', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    fixedCode: { type: 'string' },
                    applied: { type: 'boolean' },
                    changes: { type: 'array', items: { type: 'object' } },
                    dryRun: { type: 'boolean' },
                },
            },
        },
        {
            name: 'validateFix',
            description: 'Validate that an applied fix resolves the original error',
            inputSchema: {
                type: 'object',
                properties: {
                    originalCode: { type: 'string', description: 'Original code before fix' },
                    fixedCode: { type: 'string', description: 'Code after fix was applied' },
                    error: { type: 'object', description: 'Original error to validate against' },
                    language: { type: 'string', description: 'Programming language' },
                },
                required: ['originalCode', 'fixedCode', 'error', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    valid: { type: 'boolean' },
                    residualIssues: { type: 'array', items: { type: 'object' } },
                    regressionRisk: { type: 'string' },
                    verificationSteps: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:code',
        'write:code',
        'read:logs',
        'execute:debug',
    ],
    maxConcurrentTasks: 3,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 3,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let DebuggingAgentService = class DebuggingAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.debugSessions = new Map();
    }
    defineConfig() {
        return exports.DEBUGGING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'analyzeError',
            description: 'Analyze an error to determine root cause and severity',
            execute: async (params) => this.analyzeError(params),
        });
        this.registerTool({
            name: 'traceExecution',
            description: 'Trace execution path leading to an error',
            execute: async (params) => this.traceExecution(params),
        });
        this.registerTool({
            name: 'suggestFix',
            description: 'Suggest potential fixes for an error',
            execute: async (params) => this.suggestFix(params),
        });
        this.registerTool({
            name: 'applyFix',
            description: 'Apply a suggested fix to source code',
            execute: async (params) => this.applyFix(params),
        });
        this.registerTool({
            name: 'validateFix',
            description: 'Validate that a fix resolves the original error',
            execute: async (params) => this.validateFix(params),
        });
        await this.storeInWorkingMemory('debugging:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Debugging agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'analyzeError',
            'traceExecution',
            'suggestFix',
            'applyFix',
            'validateFix',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown debugging action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            const sessionId = input.context?.sessionId || input.taskId;
            if (!this.debugSessions.has(sessionId)) {
                this.debugSessions.set(sessionId, { error: params.error, appliedFixes: [], validated: false });
            }
            const session = this.debugSessions.get(sessionId);
            switch (action) {
                case 'analyzeError':
                    session.analysis = result;
                    break;
                case 'suggestFix':
                    session.suggestions = result.suggestions;
                    break;
                case 'applyFix':
                    session.appliedFixes.push(...(result.changes || []));
                    break;
                case 'validateFix':
                    session.validated = result.valid;
                    break;
            }
            await this.storeInWorkingMemory(`debugging:session:${sessionId}`, { action, result, timestamp: new Date() }, 600000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Debugging execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.debugSessions.clear();
        this.logger.log('Debugging agent destroyed, sessions cleared');
    }
    async analyzeError(params) {
        const { error, code, language = 'typescript', context } = params;
        if (!error) {
            throw new Error('Error object is required for analysis');
        }
        const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
        const errorStack = error.stack || '';
        const errorType = error.name || error.type || this.classifyError(errorMessage);
        const rootCause = this.determineRootCause(errorMessage, errorStack, code, language);
        const severity = this.determineSeverity(errorType, errorMessage, code);
        const affectedPaths = this.extractAffectedPaths(errorStack, code);
        const analysis = this.generateAnalysisText(errorType, errorMessage, rootCause, severity, affectedPaths, language);
        const relatedErrors = this.findRelatedErrors(errorType, errorMessage, code, language);
        this.logger.log(`Error analyzed: type=${errorType}, severity=${severity}, rootCause=${rootCause.substring(0, 80)}`);
        return {
            errorType,
            message: errorMessage,
            rootCause,
            severity,
            affectedPaths,
            analysis,
            relatedErrors,
        };
    }
    async traceExecution(params) {
        const { code, entryPoint, language, inputs = {}, maxDepth = 50 } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required for tracing');
        }
        if (!entryPoint || typeof entryPoint !== 'string') {
            throw new Error('Entry point is required for tracing');
        }
        const lines = code.split('\n');
        const traceSteps = [];
        let stepCounter = 0;
        const entryLine = this.findFunctionStartLine(lines, entryPoint, language);
        if (entryLine === -1) {
            throw new Error(`Entry point "${entryPoint}" not found in code`);
        }
        let currentLine = entryLine;
        let currentFunction = entryPoint;
        const variables = { ...inputs };
        let errorPoint = null;
        while (currentLine < lines.length && stepCounter < maxDepth) {
            const line = lines[currentLine].trim();
            if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                currentLine++;
                continue;
            }
            stepCounter++;
            const traceStep = {
                step: stepCounter,
                location: `line ${currentLine + 1}`,
                line: currentLine + 1,
                function: currentFunction,
                action: this.describeLineAction(line, language),
                variables: { ...variables },
                timestamp: Date.now(),
            };
            this.trackVariableAssignment(line, variables, language);
            const funcCall = this.extractFunctionCall(line, language);
            if (funcCall) {
                const funcStart = this.findFunctionStartLine(lines, funcCall, language);
                if (funcStart !== -1) {
                    currentFunction = funcCall;
                }
            }
            if (this.isErrorPoint(line, language)) {
                errorPoint = {
                    line: currentLine + 1,
                    function: currentFunction,
                    reason: this.identifyErrorReason(line, language),
                };
            }
            if (line === '}' && currentFunction !== entryPoint) {
                currentFunction = entryPoint;
            }
            traceSteps.push(traceStep);
            currentLine++;
        }
        const executionFlow = this.buildExecutionFlowDescription(traceSteps, entryPoint, errorPoint);
        this.logger.log(`Execution trace complete: ${traceSteps.length} step(s), error at ${errorPoint ? `line ${errorPoint.line}` : 'none'}`);
        return {
            traceSteps,
            errorPoint,
            variablesAtError: variables,
            executionFlow,
        };
    }
    async suggestFix(params) {
        const { error, code, language, maxSuggestions = 3 } = params;
        if (!error) {
            throw new Error('Error description is required');
        }
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
        const errorType = error.name || error.type || this.classifyError(errorMessage);
        const suggestions = [];
        const lines = code.split('\n');
        if (errorType.toLowerCase().includes('type') || errorMessage.toLowerCase().includes('type')) {
            suggestions.push(...this.suggestTypeErrorFixes(errorMessage, lines, language));
        }
        if (errorType.toLowerCase().includes('reference') || errorMessage.toLowerCase().includes('is not defined')) {
            suggestions.push(...this.suggestReferenceErrorFixes(errorMessage, lines, language));
        }
        if (errorMessage.toLowerCase().includes('null') || errorMessage.toLowerCase().includes('undefined') ||
            errorMessage.toLowerCase().includes('cannot read propert')) {
            suggestions.push(...this.suggestNullErrorFixes(errorMessage, lines, language));
        }
        if (errorType.toLowerCase().includes('syntax') || errorMessage.toLowerCase().includes('unexpected')) {
            suggestions.push(...this.suggestSyntaxErrorFixes(errorMessage, lines, language));
        }
        if (errorType.toLowerCase().includes('range') || errorMessage.toLowerCase().includes('out of range')) {
            suggestions.push(...this.suggestRangeErrorFixes(errorMessage, lines, language));
        }
        if (suggestions.length === 0) {
            suggestions.push(...this.suggestGenericFixes(errorMessage, lines, language));
        }
        const limitedSuggestions = suggestions.slice(0, maxSuggestions);
        const avgConfidence = limitedSuggestions.length > 0
            ? limitedSuggestions.reduce((sum, s) => sum + s.confidence, 0) / limitedSuggestions.length
            : 0;
        const autoFixable = limitedSuggestions.some((s) => s.autoFixable);
        this.logger.log(`Suggested ${limitedSuggestions.length} fix(es), confidence=${avgConfidence.toFixed(2)}, autoFixable=${autoFixable}`);
        return { suggestions: limitedSuggestions, confidence: avgConfidence, autoFixable };
    }
    async applyFix(params) {
        const { code, fix, language, dryRun = true } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!fix || typeof fix !== 'object') {
            throw new Error('Fix object is required');
        }
        const lines = code.split('\n');
        const changes = [];
        let fixedCode = code;
        const fixType = fix.type || fix.fixType || 'replacement';
        const targetLine = fix.line ? fix.line - 1 : this.findTargetLine(lines, fix, language);
        if (targetLine >= 0 && targetLine < lines.length) {
            switch (fixType) {
                case 'replacement': {
                    const before = lines[targetLine];
                    let after = before;
                    if (fix.search && fix.replace) {
                        after = before.replace(new RegExp(this.escapeRegex(fix.search), 'g'), fix.replace);
                    }
                    else if (fix.newLine) {
                        after = fix.newLine;
                    }
                    if (before !== after) {
                        lines[targetLine] = after;
                        changes.push({
                            type: 'replacement',
                            lineStart: targetLine + 1,
                            lineEnd: targetLine + 1,
                            before,
                            after,
                            description: fix.description || `Replaced line ${targetLine + 1}`,
                        });
                    }
                    break;
                }
                case 'insertion': {
                    const insertLine = fix.insertBefore ? targetLine : targetLine + 1;
                    const newLine = fix.newLine || fix.code || '';
                    lines.splice(insertLine, 0, newLine);
                    changes.push({
                        type: 'insertion',
                        lineStart: insertLine + 1,
                        lineEnd: insertLine + 1,
                        before: '',
                        after: newLine,
                        description: fix.description || `Inserted line after ${targetLine + 1}`,
                    });
                    break;
                }
                case 'deletion': {
                    const deleteCount = fix.deleteCount || 1;
                    const deleted = lines.splice(targetLine, deleteCount);
                    changes.push({
                        type: 'deletion',
                        lineStart: targetLine + 1,
                        lineEnd: targetLine + deleteCount,
                        before: deleted.join('\n'),
                        after: '',
                        description: fix.description || `Deleted line(s) ${targetLine + 1}-${targetLine + deleteCount}`,
                    });
                    break;
                }
            }
        }
        fixedCode = lines.join('\n');
        if (!dryRun) {
            await this.storeInWorkingMemory('debugging:lastFix', {
                fix,
                changes,
                timestamp: new Date(),
                applied: true,
            }, 300000);
        }
        this.logger.log(`${dryRun ? 'Dry run: ' : ''}Applied fix: ${changes.length} change(s), type=${fixType}`);
        return { fixedCode, applied: !dryRun && changes.length > 0, changes, dryRun };
    }
    async validateFix(params) {
        const { originalCode, fixedCode, error, language } = params;
        if (!originalCode || typeof originalCode !== 'string') {
            throw new Error('Original code is required');
        }
        if (!fixedCode || typeof fixedCode !== 'string') {
            throw new Error('Fixed code is required');
        }
        if (!error) {
            throw new Error('Error object is required for validation');
        }
        const errorMessage = error.message || error.msg || error.toString?.() || 'Unknown error';
        const errorType = error.name || error.type || '';
        const residualIssues = [];
        const verificationSteps = [];
        if (originalCode === fixedCode) {
            residualIssues.push({
                type: 'no-change',
                message: 'Fixed code is identical to original code — no fix was applied',
                severity: 'high',
            });
        }
        verificationSteps.push('Verify that the fixed code differs from the original');
        const syntaxCheck = this.performBasicSyntaxCheck(fixedCode, language);
        if (!syntaxCheck.valid) {
            residualIssues.push({
                type: 'syntax',
                message: `Syntax issue after fix: ${syntaxCheck.message}`,
                severity: 'high',
            });
        }
        verificationSteps.push('Verify syntax correctness of fixed code');
        const errorPatternPresent = this.checkErrorPatternExists(fixedCode, errorMessage, errorType, language);
        if (errorPatternPresent) {
            residualIssues.push({
                type: 'error-pattern',
                message: 'The original error pattern may still exist in the fixed code',
                severity: 'medium',
            });
        }
        verificationSteps.push('Verify that the original error pattern is resolved');
        const newIssues = this.detectNewIssues(originalCode, fixedCode, language);
        residualIssues.push(...newIssues);
        verificationSteps.push('Check for regressions or new issues introduced by the fix');
        const balanceCheck = this.checkBalancedDelimiters(fixedCode);
        if (!balanceCheck.balanced) {
            residualIssues.push({
                type: 'structure',
                message: `Unbalanced delimiters: ${balanceCheck.message}`,
                severity: 'high',
            });
        }
        verificationSteps.push('Verify balanced delimiters (braces, brackets, parentheses)');
        const importCheck = this.checkImportConsistency(originalCode, fixedCode, language);
        if (!importCheck.consistent) {
            residualIssues.push({
                type: 'imports',
                message: `Import inconsistency: ${importCheck.message}`,
                severity: 'medium',
            });
        }
        verificationSteps.push('Verify import statements are still valid after fix');
        const highSeverityIssues = residualIssues.filter((i) => i.severity === 'high');
        const valid = highSeverityIssues.length === 0 && !errorPatternPresent;
        const totalIssues = residualIssues.length;
        let regressionRisk = 'low';
        if (highSeverityIssues.length > 0)
            regressionRisk = 'high';
        else if (totalIssues > 2)
            regressionRisk = 'medium';
        this.logger.log(`Fix validation: valid=${valid}, ${residualIssues.length} residual issue(s), risk=${regressionRisk}`);
        return { valid, residualIssues, regressionRisk, verificationSteps };
    }
    classifyError(message) {
        const lower = message.toLowerCase();
        if (lower.includes('typeerror') || lower.includes('type error'))
            return 'TypeError';
        if (lower.includes('referenceerror') || lower.includes('is not defined'))
            return 'ReferenceError';
        if (lower.includes('syntaxerror') || lower.includes('unexpected'))
            return 'SyntaxError';
        if (lower.includes('rangeerror') || lower.includes('out of range'))
            return 'RangeError';
        if (lower.includes('null') || lower.includes('undefined'))
            return 'NullReferenceError';
        if (lower.includes('timeout') || lower.includes('timed out'))
            return 'TimeoutError';
        if (lower.includes('permission') || lower.includes('access denied'))
            return 'PermissionError';
        if (lower.includes('not found') || lower.includes('enoent'))
            return 'NotFoundError';
        if (lower.includes('connection') || lower.includes('econnrefused'))
            return 'ConnectionError';
        if (lower.includes('memory') || lower.includes('heap'))
            return 'MemoryError';
        return 'UnknownError';
    }
    determineRootCause(errorMessage, stack, code, language) {
        const lower = errorMessage.toLowerCase();
        if (lower.includes('cannot read propert') || lower.includes('cannot read properties')) {
            const match = errorMessage.match(/cannot read (?:properties of|propert[yies])\s+(\w+)/i);
            const prop = match ? match[1] : 'property';
            return `Attempting to access "${prop}" on a null or undefined value. The object is likely not initialized or the access path contains a null/undefined intermediate.`;
        }
        if (lower.includes('is not defined')) {
            const match = errorMessage.match(/(\w+)\s+is not defined/i);
            const name = match ? match[1] : 'variable';
            return `"${name}" is referenced but not declared or imported. Check for typos, missing imports, or scope issues.`;
        }
        if (lower.includes('is not a function')) {
            const match = errorMessage.match(/(\w+)\s+is not a function/i);
            const name = match ? match[1] : 'value';
            return `"${name}" is being called as a function but is not of callable type. Verify the variable type and method availability.`;
        }
        if (lower.includes('is not iterable')) {
            return 'Attempting to iterate over a non-iterable value. Ensure the target is an array, string, or other iterable object.';
        }
        if (lower.includes('unexpected token') || lower.includes('unexpected end')) {
            return 'Syntax error in the code. Check for missing brackets, parentheses, semicolons, or string delimiters.';
        }
        if (lower.includes('timeout') || lower.includes('timed out')) {
            return 'An operation exceeded its time limit. This may be caused by an infinite loop, unresponsive external service, or insufficient timeout configuration.';
        }
        return `Error: ${errorMessage}. Analyze the stack trace and code context to identify the specific cause.`;
    }
    determineSeverity(errorType, errorMessage, code) {
        if (errorType.includes('Security') || errorType.includes('Permission') || errorMessage.toLowerCase().includes('fatal')) {
            return 'critical';
        }
        if (errorType.includes('TypeError') || errorType.includes('ReferenceError') || errorType.includes('NullReference')) {
            return 'high';
        }
        if (errorType.includes('RangeError') || errorType.includes('ConnectionError') || errorType.includes('Timeout')) {
            return 'medium';
        }
        if (errorType.includes('SyntaxError')) {
            return 'low';
        }
        return 'medium';
    }
    extractAffectedPaths(stack, code) {
        const paths = [];
        if (stack) {
            const stackLines = stack.split('\n');
            for (const line of stackLines) {
                const match = line.match(/at\s+.*?\(([^)]+)\)/);
                if (match) {
                    paths.push(match[1]);
                }
            }
        }
        if (paths.length === 0 && code) {
            paths.push('source code (no stack trace available)');
        }
        return paths.slice(0, 10);
    }
    generateAnalysisText(errorType, errorMessage, rootCause, severity, affectedPaths, language) {
        let analysis = `Error Analysis Report\n`;
        analysis += `=====================\n`;
        analysis += `Type: ${errorType}\n`;
        analysis += `Message: ${errorMessage}\n`;
        analysis += `Severity: ${severity}\n`;
        analysis += `Language: ${language}\n\n`;
        analysis += `Root Cause: ${rootCause}\n\n`;
        if (affectedPaths.length > 0) {
            analysis += `Affected Code Paths:\n`;
            for (const path of affectedPaths) {
                analysis += `  - ${path}\n`;
            }
            analysis += '\n';
        }
        analysis += `Recommended Next Steps:\n`;
        analysis += `  1. Use traceExecution to follow the execution path\n`;
        analysis += `  2. Use suggestFix to get potential fixes\n`;
        analysis += `  3. Use applyFix to apply a fix\n`;
        analysis += `  4. Use validateFix to verify the fix\n`;
        return analysis;
    }
    findRelatedErrors(errorType, errorMessage, code, language) {
        const related = [];
        const lower = errorMessage.toLowerCase();
        if (lower.includes('null') || lower.includes('undefined')) {
            related.push({
                type: 'TypeError',
                message: 'Related null/undefined access may exist in the same code path',
                likelihood: 0.7,
            });
        }
        if (lower.includes('is not defined')) {
            related.push({
                type: 'ImportError',
                message: 'Missing or incorrect import statement',
                likelihood: 0.8,
            });
        }
        if (lower.includes('is not a function')) {
            related.push({
                type: 'TypeError',
                message: 'Other method calls on the same object may also fail',
                likelihood: 0.5,
            });
        }
        return related;
    }
    findFunctionStartLine(lines, functionName, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (language === 'typescript' || language === 'javascript') {
                if (line.includes(`function ${functionName}`) || line.includes(`${functionName} =`) ||
                    line.includes(`${functionName}(`) || line.match(new RegExp(`\\b${functionName}\\s*\\(`))) {
                    return i;
                }
            }
            if (language === 'python') {
                if (line.includes(`def ${functionName}`)) {
                    return i;
                }
            }
        }
        return -1;
    }
    describeLineAction(line, language) {
        if (line.match(/\bif\s*\(/))
            return 'Conditional check';
        if (line.match(/\bfor\s*\(/) || line.match(/\bwhile\s*\(/))
            return 'Loop iteration';
        if (line.match(/\breturn\b/))
            return 'Return value';
        if (line.match(/\bthrow\b/) || line.match(/\braise\b/))
            return 'Throw exception';
        if (line.match(/\btry\b/) || line.match(/\bcatch\b/))
            return 'Exception handling';
        if (line.match(/\bawait\b/))
            return 'Await async operation';
        if (line.match(/\bnew\b/))
            return 'Create new instance';
        if (line.match(/=\s*(?:async\s+)?function/))
            return 'Define function';
        if (line.includes('console.log') || line.includes('print('))
            return 'Log output';
        if (line.match(/\w+\.\w+\(/))
            return 'Method call';
        return 'Execute statement';
    }
    trackVariableAssignment(line, variables, language) {
        const assignMatch = line.match(/(?:const|let|var)?\s*(\w+)\s*=\s*(.+?)[;,\)]?$/);
        if (assignMatch) {
            const name = assignMatch[1];
            const value = assignMatch[2].trim();
            variables[name] = value.startsWith("'") || value.startsWith('"') ? 'string' :
                /^\d+$/.test(value) ? 'number' :
                    value === 'true' || value === 'false' ? 'boolean' :
                        value === 'null' ? null :
                            value === 'undefined' ? undefined : 'expression';
        }
    }
    extractFunctionCall(line, language) {
        const match = line.match(/(\w+)\s*\(/);
        return match ? match[1] : null;
    }
    isErrorPoint(line, language) {
        if (language === 'typescript' || language === 'javascript') {
            return line.includes('.null') || line.includes('undefined') ||
                line.includes('throw ') || line.includes('catch (') ||
                (line.includes('[') && !line.includes(']')) ||
                line.includes('.length') && line.includes('undefined');
        }
        return line.includes('raise ') || line.includes('except ') || line.includes('None');
    }
    identifyErrorReason(line, language) {
        if (line.includes('undefined'))
            return 'Potential undefined access';
        if (line.includes('null'))
            return 'Potential null reference';
        if (line.includes('throw'))
            return 'Explicit exception thrown';
        if (line.includes('raise'))
            return 'Explicit exception raised';
        if (line.includes('None'))
            return 'Potential None reference';
        return 'Potential error point detected';
    }
    buildExecutionFlowDescription(steps, entryPoint, errorPoint) {
        let flow = `Execution flow for ${entryPoint}:\n`;
        for (const step of steps) {
            flow += `  Step ${step.step}: [Line ${step.line}] ${step.action} in ${step.function}\n`;
        }
        if (errorPoint) {
            flow += `\nError detected at line ${errorPoint.line} in ${errorPoint.function}: ${errorPoint.reason}`;
        }
        else {
            flow += '\nNo obvious error point detected in the trace.';
        }
        return flow;
    }
    suggestTypeErrorFixes(errorMessage, lines, language) {
        const suggestions = [];
        if (errorMessage.includes('cannot read properties of') || errorMessage.includes('cannot read propert')) {
            suggestions.push({
                id: 'fix-null-guard',
                title: 'Add null/undefined guard',
                description: 'Add optional chaining or null check before accessing properties',
                codeChange: 'Replace obj.prop with obj?.prop or add if (obj) check',
                confidence: 0.85,
                autoFixable: true,
                sideEffects: ['May silently return undefined instead of throwing'],
            });
            suggestions.push({
                id: 'fix-default-value',
                title: 'Provide default value',
                description: 'Use nullish coalescing to provide a default value',
                codeChange: 'Replace obj.prop with (obj?.prop) ?? defaultValue',
                confidence: 0.7,
                autoFixable: true,
                sideEffects: ['Behavior changes if the property was intentionally undefined'],
            });
        }
        if (errorMessage.includes('is not a function')) {
            suggestions.push({
                id: 'fix-method-check',
                title: 'Add method existence check',
                description: 'Check if the method exists before calling it',
                codeChange: 'Replace obj.method() with typeof obj.method === "function" && obj.method()',
                confidence: 0.6,
                autoFixable: false,
                sideEffects: ['Condition may silently skip the method call'],
            });
        }
        return suggestions;
    }
    suggestReferenceErrorFixes(errorMessage, lines, language) {
        const suggestions = [];
        const match = errorMessage.match(/(\w+)\s+is not defined/i);
        const varName = match ? match[1] : '';
        if (varName) {
            const hasImportSection = lines.some((l) => l.startsWith('import ') || l.startsWith('require('));
            if (hasImportSection) {
                suggestions.push({
                    id: 'fix-missing-import',
                    title: `Add missing import for "${varName}"`,
                    description: `The variable "${varName}" is referenced but not imported. Add an import statement.`,
                    codeChange: `import { ${varName} } from 'module';`,
                    confidence: 0.75,
                    autoFixable: false,
                    sideEffects: ['Need to determine the correct module path'],
                });
            }
            suggestions.push({
                id: 'fix-typo',
                title: `Check for typo: "${varName}"`,
                description: `"${varName}" may be a typo. Check similar variable names in scope.`,
                codeChange: `Search for similar names in the codebase`,
                confidence: 0.4,
                autoFixable: false,
                sideEffects: [],
            });
            suggestions.push({
                id: 'fix-declare',
                title: `Declare "${varName}"`,
                description: `Add a declaration for "${varName}" if it was intended to be used.`,
                codeChange: `const ${varName} = /* provide value */;`,
                confidence: 0.3,
                autoFixable: false,
                sideEffects: ['Must provide the correct initial value'],
            });
        }
        return suggestions;
    }
    suggestNullErrorFixes(errorMessage, lines, language) {
        const suggestions = [];
        suggestions.push({
            id: 'fix-optional-chaining',
            title: 'Use optional chaining',
            description: 'Replace property access with optional chaining operator to safely handle null/undefined',
            codeChange: 'Replace obj.prop with obj?.prop',
            confidence: 0.9,
            autoFixable: true,
            sideEffects: ['Changes behavior: returns undefined instead of throwing'],
        });
        suggestions.push({
            id: 'fix-null-check',
            title: 'Add explicit null check',
            description: 'Add an if-statement to check for null/undefined before access',
            codeChange: 'Add: if (obj != null) { ... } around the access',
            confidence: 0.85,
            autoFixable: false,
            sideEffects: ['Must handle the null case appropriately'],
        });
        suggestions.push({
            id: 'fix-initialize',
            title: 'Initialize with default value',
            description: 'Ensure the variable is initialized before use',
            codeChange: 'Initialize: const obj = existingObj || {}',
            confidence: 0.7,
            autoFixable: false,
            sideEffects: ['Default value may not match expected type'],
        });
        return suggestions;
    }
    suggestSyntaxErrorFixes(errorMessage, lines, language) {
        const suggestions = [];
        if (errorMessage.includes('unexpected end') || errorMessage.includes('EOF')) {
            suggestions.push({
                id: 'fix-missing-bracket',
                title: 'Add missing closing bracket',
                description: 'The code may be missing a closing bracket, brace, or parenthesis',
                codeChange: 'Review and add missing closing delimiters',
                confidence: 0.7,
                autoFixable: false,
                sideEffects: [],
            });
        }
        if (errorMessage.includes('unexpected token')) {
            const tokenMatch = errorMessage.match(/unexpected token\s+['"]?(\S+)['"]?/i);
            const token = tokenMatch ? tokenMatch[1] : '';
            suggestions.push({
                id: 'fix-unexpected-token',
                title: `Fix unexpected token "${token}"`,
                description: `The token "${token}" was not expected. Check for missing operators, delimiters, or typos.`,
                codeChange: 'Review syntax around the error location',
                confidence: 0.5,
                autoFixable: false,
                sideEffects: [],
            });
        }
        return suggestions;
    }
    suggestRangeErrorFixes(errorMessage, lines, language) {
        const suggestions = [];
        suggestions.push({
            id: 'fix-bound-check',
            title: 'Add boundary check',
            description: 'Add range validation before array access or numeric operations',
            codeChange: 'Add: if (index >= 0 && index < array.length) before access',
            confidence: 0.7,
            autoFixable: false,
            sideEffects: ['Must handle out-of-range case'],
        });
        suggestions.push({
            id: 'fix-recursive-base',
            title: 'Fix recursion base case',
            description: 'If this is a RangeError from recursion, check the base case',
            codeChange: 'Ensure recursive function has a proper termination condition',
            confidence: 0.6,
            autoFixable: false,
            sideEffects: [],
        });
        return suggestions;
    }
    suggestGenericFixes(errorMessage, lines, language) {
        return [
            {
                id: 'fix-add-error-handling',
                title: 'Add error handling',
                description: 'Wrap the error-prone code in a try-catch block',
                codeChange: 'Add try-catch around the failing code section',
                confidence: 0.5,
                autoFixable: false,
                sideEffects: ['Error may be silently caught; ensure proper handling'],
            },
            {
                id: 'fix-log-debug',
                title: 'Add debug logging',
                description: 'Add logging to trace the values leading to the error',
                codeChange: 'Add console.log/debug statements before the error point',
                confidence: 0.4,
                autoFixable: true,
                sideEffects: ['Adds temporary debug output that should be removed'],
            },
        ];
    }
    findTargetLine(lines, fix, language) {
        if (fix.search) {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(fix.search))
                    return i;
            }
        }
        if (fix.pattern) {
            const regex = new RegExp(fix.pattern);
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i]))
                    return i;
            }
        }
        return -1;
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    performBasicSyntaxCheck(code, language) {
        const openBraces = (code.match(/{/g) || []).length;
        const closeBraces = (code.match(/}/g) || []).length;
        if (Math.abs(openBraces - closeBraces) > 1) {
            return { valid: false, message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
        }
        const openParens = (code.match(/\(/g) || []).length;
        const closeParens = (code.match(/\)/g) || []).length;
        if (Math.abs(openParens - closeParens) > 1) {
            return { valid: false, message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close` };
        }
        return { valid: true, message: 'No obvious syntax issues detected' };
    }
    checkErrorPatternExists(code, errorMessage, errorType, language) {
        const lower = errorMessage.toLowerCase();
        if (lower.includes('null') || lower.includes('undefined')) {
            const propAccessWithoutChaining = code.match(/\w+\.\w+/g);
            const chainedAccess = code.match(/\w+\?\.\w+/g);
            const unchainedCount = (propAccessWithoutChaining?.length || 0) - (chainedAccess?.length || 0);
            return unchainedCount > 5;
        }
        return false;
    }
    detectNewIssues(originalCode, fixedCode, language) {
        const issues = [];
        const originalLines = originalCode.split('\n').filter((l) => l.trim().length > 0);
        const fixedLines = fixedCode.split('\n').filter((l) => l.trim().length > 0);
        if (originalLines.length - fixedLines.length > 5) {
            issues.push({
                type: 'deletion',
                message: 'Significant code was removed — verify this was intentional',
                severity: 'medium',
            });
        }
        const lineCounts = new Map();
        for (const line of fixedLines) {
            if (line.trim().length > 10) {
                lineCounts.set(line.trim(), (lineCounts.get(line.trim()) || 0) + 1);
            }
        }
        const duplicates = Array.from(lineCounts.entries()).filter(([, count]) => count > 1);
        if (duplicates.length > 2) {
            issues.push({
                type: 'duplication',
                message: 'Duplicate lines detected in fixed code',
                severity: 'low',
            });
        }
        return issues;
    }
    checkBalancedDelimiters(code) {
        const stack = [];
        const pairs = { '{': '}', '(': ')', '[': ']' };
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (char in pairs) {
                stack.push(char);
            }
            else if (Object.values(pairs).includes(char)) {
                if (stack.length === 0) {
                    return { balanced: false, message: `Unmatched closing delimiter '${char}' at position ${i}` };
                }
                const last = stack.pop();
                if (pairs[last] !== char) {
                    return { balanced: false, message: `Mismatched delimiters: '${last}' and '${char}' at position ${i}` };
                }
            }
        }
        if (stack.length > 0) {
            return { balanced: false, message: `Unclosed delimiter(s): ${stack.join(', ')}` };
        }
        return { balanced: true, message: 'All delimiters are balanced' };
    }
    checkImportConsistency(originalCode, fixedCode, language) {
        const originalImports = this.extractImports(originalCode);
        const fixedImports = this.extractImports(fixedCode);
        const removedImports = originalImports.filter((imp) => !fixedImports.includes(imp));
        if (removedImports.length > 0) {
            return {
                consistent: false,
                message: `Imports removed: ${removedImports.join(', ')}`,
            };
        }
        return { consistent: true, message: 'Import statements are consistent' };
    }
    extractImports(code) {
        const imports = [];
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            imports.push(match[1]);
        }
        return imports;
    }
};
exports.DebuggingAgentService = DebuggingAgentService;
exports.DebuggingAgentService = DebuggingAgentService = __decorate([
    (0, common_1.Injectable)()
], DebuggingAgentService);
//# sourceMappingURL=debugging-agent.service.js.map