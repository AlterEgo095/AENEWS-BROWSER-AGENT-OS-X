"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeReviewAgentService = exports.CODE_REVIEW_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.CODE_REVIEW_AGENT_CONFIG = {
    id: 'coding-code-review',
    name: 'CodeReview',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Review code for quality, security vulnerabilities, best practices, bugs, and complexity. Provides structured feedback with severity ratings and actionable improvement suggestions.',
    capabilities: [
        {
            name: 'reviewCode',
            description: 'Perform a comprehensive code review covering quality, style, and correctness',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to review' },
                    language: { type: 'string', description: 'Programming language' },
                    filePath: { type: 'string', description: 'File path for context' },
                    severityThreshold: { type: 'string', enum: ['low', 'medium', 'high'], default: 'low' },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    issues: { type: 'array', items: { type: 'object' } },
                    score: { type: 'number' },
                    summary: { type: 'string' },
                },
            },
        },
        {
            name: 'checkBestPractices',
            description: 'Check code against language-specific best practices and design patterns',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to check' },
                    language: { type: 'string', description: 'Programming language' },
                    framework: { type: 'string', description: 'Framework context' },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    practices: { type: 'array', items: { type: 'object' } },
                    adherence: { type: 'number' },
                    suggestions: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'findBugs',
            description: 'Detect potential bugs, logic errors, and runtime issues in code',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to analyze' },
                    language: { type: 'string', description: 'Programming language' },
                    includeWarnings: { type: 'boolean', default: true },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    bugs: { type: 'array', items: { type: 'object' } },
                    warnings: { type: 'array', items: { type: 'object' } },
                    riskLevel: { type: 'string' },
                },
            },
        },
        {
            name: 'checkSecurity',
            description: 'Scan code for security vulnerabilities and compliance issues',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to scan' },
                    language: { type: 'string', description: 'Programming language' },
                    owaspCompliance: { type: 'boolean', default: true },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    vulnerabilities: { type: 'array', items: { type: 'object' } },
                    riskScore: { type: 'number' },
                    complianceIssues: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'analyzeComplexity',
            description: 'Analyze code complexity metrics: cyclomatic, cognitive, and nesting depth',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Source code to analyze' },
                    language: { type: 'string', description: 'Programming language' },
                    thresholds: { type: 'object', description: 'Custom complexity thresholds' },
                },
                required: ['code', 'language'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cyclomaticComplexity: { type: 'number' },
                    cognitiveComplexity: { type: 'number' },
                    nestingDepth: { type: 'number' },
                    maintainabilityIndex: { type: 'number' },
                    hotspots: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:code',
        'read:repository',
        'write:review',
        'read:security',
    ],
    maxConcurrentTasks: 6,
    timeout: 45000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let CodeReviewAgentService = class CodeReviewAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.reviewHistory = [];
    }
    defineConfig() {
        return exports.CODE_REVIEW_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'reviewCode',
            description: 'Perform a comprehensive code review',
            execute: async (params) => this.reviewCode(params),
        });
        this.registerTool({
            name: 'checkBestPractices',
            description: 'Check code against best practices',
            execute: async (params) => this.checkBestPractices(params),
        });
        this.registerTool({
            name: 'findBugs',
            description: 'Detect potential bugs and logic errors',
            execute: async (params) => this.findBugs(params),
        });
        this.registerTool({
            name: 'checkSecurity',
            description: 'Scan code for security vulnerabilities',
            execute: async (params) => this.checkSecurity(params),
        });
        this.registerTool({
            name: 'analyzeComplexity',
            description: 'Analyze code complexity metrics',
            execute: async (params) => this.analyzeComplexity(params),
        });
        await this.storeInWorkingMemory('review:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('CodeReview agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'reviewCode',
            'checkBestPractices',
            'findBugs',
            'checkSecurity',
            'analyzeComplexity',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown code review action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            this.reviewHistory.push({
                action,
                language: params.language || 'unknown',
                timestamp: new Date(),
                issueCount: result.issues?.length || result.bugs?.length || result.vulnerabilities?.length || 0,
            });
            await this.storeInWorkingMemory(`review:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`CodeReview execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.reviewHistory = [];
        this.logger.log('CodeReview agent destroyed, history cleared');
    }
    async reviewCode(params) {
        const { code, language, filePath, severityThreshold = 'low' } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required for review');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const lines = code.split('\n');
        const issues = [];
        this.checkFormatting(lines, issues, language);
        this.checkNamingConventions(lines, issues, language);
        this.checkCodeStructure(lines, issues, language);
        this.checkErrorHandling(lines, issues, language);
        this.checkPerformanceAntiPatterns(lines, issues, language);
        const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        const minSeverity = severityOrder[severityThreshold] || 0;
        const filteredIssues = issues.filter((issue) => (severityOrder[issue.severity] || 0) >= minSeverity);
        const score = this.calculateReviewScore(lines.length, filteredIssues);
        const criticalCount = filteredIssues.filter((i) => i.severity === 'critical').length;
        const highCount = filteredIssues.filter((i) => i.severity === 'high').length;
        const mediumCount = filteredIssues.filter((i) => i.severity === 'medium').length;
        const lowCount = filteredIssues.filter((i) => i.severity === 'low').length;
        const summary = `Code review complete: ${filteredIssues.length} issue(s) found ` +
            `(${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low). ` +
            `Score: ${score}/100.`;
        this.logger.log(`Code review: ${filteredIssues.length} issues, score=${score}`);
        return { issues: filteredIssues, score, summary, filePath };
    }
    async checkBestPractices(params) {
        const { code, language, framework } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const lines = code.split('\n');
        const practices = [];
        const suggestions = [];
        practices.push({
            name: 'Single Responsibility Principle',
            followed: this.checkSingleResponsibility(lines),
            details: 'Each function/class should have one reason to change',
            suggestion: 'Consider splitting large functions into smaller, focused ones',
        });
        practices.push({
            name: 'DRY (Don\'t Repeat Yourself)',
            followed: this.checkDRY(lines),
            details: 'Avoid code duplication',
            suggestion: 'Extract repeated code into reusable functions or utilities',
        });
        practices.push({
            name: 'Proper Error Handling',
            followed: this.checkProperErrorHandling(lines, language),
            details: 'All error-prone operations should have proper error handling',
            suggestion: 'Add try-catch blocks around operations that can fail',
        });
        practices.push({
            name: 'Consistent Naming',
            followed: this.checkConsistentNaming(lines, language),
            details: 'Naming conventions should be consistent throughout the codebase',
            suggestion: 'Follow language-specific naming conventions (camelCase, snake_case, etc.)',
        });
        practices.push({
            name: 'No Magic Numbers',
            followed: this.checkMagicNumbers(lines),
            details: 'Avoid unexplained numeric literals',
            suggestion: 'Extract magic numbers into named constants',
        });
        if (language === 'typescript' || language === 'javascript') {
            practices.push({
                name: 'Use Strict Mode',
                followed: code.includes('"use strict"') || code.includes("'use strict'") || language === 'typescript',
                details: 'Enable strict mode for better error detection',
                suggestion: 'Add "use strict" directive or use TypeScript strict mode',
            });
            practices.push({
                name: 'Prefer Const Over Let',
                followed: this.checkConstOverLet(code),
                details: 'Use const for variables that are not reassigned',
                suggestion: 'Replace let with const where the variable is not reassigned',
            });
            if (framework === 'nestjs') {
                practices.push({
                    name: 'Dependency Injection',
                    followed: code.includes('constructor(') && code.includes('@Injectable'),
                    details: 'Use NestJS dependency injection pattern',
                    suggestion: 'Inject dependencies through constructor parameters',
                });
            }
        }
        if (language === 'python') {
            practices.push({
                name: 'Type Hints',
                followed: code.includes('def ') && code.includes(': ') && code.includes('-> '),
                details: 'Use Python type hints for better code documentation',
                suggestion: 'Add type hints to function signatures',
            });
        }
        const followedCount = practices.filter((p) => p.followed).length;
        const adherence = Math.round((followedCount / practices.length) * 100);
        for (const practice of practices) {
            if (!practice.followed && practice.suggestion) {
                suggestions.push(practice.suggestion);
            }
        }
        this.logger.log(`Best practices check: ${followedCount}/${practices.length} followed, ${adherence}% adherence`);
        return { practices, adherence, suggestions };
    }
    async findBugs(params) {
        const { code, language, includeWarnings = true } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const lines = code.split('\n');
        const bugs = [];
        const warnings = [];
        this.detectOffByOneErrors(lines, bugs, language);
        this.detectNullReferenceRisks(lines, bugs, language);
        this.detectResourceLeaks(lines, bugs, language);
        this.detectRaceConditions(lines, bugs, language);
        this.detectUnhandledPromises(lines, bugs, language);
        this.detectIncorrectComparisons(lines, bugs, language);
        if (includeWarnings) {
            this.detectUnusedVariables(lines, warnings, language);
            this.detectUnreachableCode(lines, warnings, language);
            this.detectImplicitTypeCoercion(lines, warnings, language);
        }
        const criticalBugs = bugs.filter((b) => b.severity === 'critical').length;
        const highBugs = bugs.filter((b) => b.severity === 'high').length;
        let riskLevel = 'low';
        if (criticalBugs > 0)
            riskLevel = 'critical';
        else if (highBugs > 2)
            riskLevel = 'high';
        else if (highBugs > 0 || bugs.length > 5)
            riskLevel = 'medium';
        this.logger.log(`Bug detection: ${bugs.length} bug(s), ${warnings.length} warning(s), risk=${riskLevel}`);
        return { bugs, warnings, riskLevel };
    }
    async checkSecurity(params) {
        const { code, language, owaspCompliance = true } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const lines = code.split('\n');
        const vulnerabilities = [];
        const complianceIssues = [];
        this.detectSQLInjection(lines, vulnerabilities, language);
        this.detectXSSVulnerabilities(lines, vulnerabilities, language);
        this.detectInsecureDependencies(lines, vulnerabilities, language);
        this.detectHardcodedSecrets(lines, vulnerabilities, language);
        this.detectInsecureCrypto(lines, vulnerabilities, language);
        this.detectPathTraversal(lines, vulnerabilities, language);
        this.detectCommandInjection(lines, vulnerabilities, language);
        if (owaspCompliance) {
            this.checkOWASPCompliance(code, vulnerabilities, complianceIssues);
        }
        const riskScore = this.calculateSecurityRiskScore(vulnerabilities);
        this.logger.log(`Security scan: ${vulnerabilities.length} vulnerability(ies), risk score=${riskScore}`);
        return { vulnerabilities, riskScore, complianceIssues };
    }
    async analyzeComplexity(params) {
        const { code, language, thresholds } = params;
        if (!code || typeof code !== 'string') {
            throw new Error('Source code is required');
        }
        if (!language || typeof language !== 'string') {
            throw new Error('Programming language is required');
        }
        const defaultThresholds = {
            maxCyclomatic: 10,
            maxCognitive: 15,
            maxNesting: 4,
            minMaintainability: 20,
        };
        const effectiveThresholds = { ...defaultThresholds, ...thresholds };
        const lines = code.split('\n');
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(lines, language);
        const cognitiveComplexity = this.calculateCognitiveComplexity(lines, language);
        const nestingDepth = this.calculateMaxNesting(lines, language);
        const maintainabilityIndex = this.calculateMaintainabilityIndex(lines.length, cyclomaticComplexity);
        const hotspots = this.findComplexityHotspots(lines, language, effectiveThresholds);
        this.logger.log(`Complexity analysis: cyclomatic=${cyclomaticComplexity}, cognitive=${cognitiveComplexity}, ` +
            `nesting=${nestingDepth}, maintainability=${maintainabilityIndex}`);
        return {
            cyclomaticComplexity,
            cognitiveComplexity,
            nestingDepth,
            maintainabilityIndex,
            hotspots,
        };
    }
    checkFormatting(lines, issues, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 120) {
                issues.push({
                    severity: 'low',
                    category: 'formatting',
                    message: `Line exceeds 120 characters (${line.length})`,
                    line: i + 1,
                    ruleId: 'max-line-length',
                    suggestion: 'Break the line into multiple lines for readability',
                });
            }
            if (line !== line.trimEnd() && line.trimEnd().length > 0) {
                issues.push({
                    severity: 'low',
                    category: 'formatting',
                    message: 'Trailing whitespace detected',
                    line: i + 1,
                    ruleId: 'no-trailing-whitespace',
                    suggestion: 'Remove trailing whitespace',
                });
            }
            if (line.match(/^\t/) && lines.some((l) => l.match(/^ /))) {
                issues.push({
                    severity: 'medium',
                    category: 'formatting',
                    message: 'Mixed tabs and spaces for indentation',
                    line: i + 1,
                    ruleId: 'no-mixed-indent',
                    suggestion: 'Use consistent indentation (prefer spaces or tabs, not both)',
                });
            }
        }
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
            issues.push({
                severity: 'low',
                category: 'formatting',
                message: 'Missing newline at end of file',
                line: lines.length,
                ruleId: 'eol-last',
                suggestion: 'Add a newline at the end of the file',
            });
        }
    }
    checkNamingConventions(lines, issues, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (language === 'typescript' || language === 'javascript') {
                const varMatch = line.match(/(?:const|let|var)\s+([a-z])\s*=/);
                if (varMatch && !['i', 'j', 'k', 'x', 'y', 'z', '_'].includes(varMatch[1])) {
                    issues.push({
                        severity: 'low',
                        category: 'naming',
                        message: `Single-letter variable name "${varMatch[1]}" is not descriptive`,
                        line: i + 1,
                        ruleId: 'descriptive-variable-names',
                        suggestion: 'Use a descriptive variable name that conveys purpose',
                    });
                }
            }
            const longNameMatch = line.match(/(?:function|class|const|let|var|def)\s+(\w{50,})/);
            if (longNameMatch) {
                issues.push({
                    severity: 'low',
                    category: 'naming',
                    message: `Name "${longNameMatch[1].substring(0, 30)}..." is too long`,
                    line: i + 1,
                    ruleId: 'max-name-length',
                    suggestion: 'Use a shorter but still descriptive name',
                });
            }
        }
    }
    checkCodeStructure(lines, issues, language) {
        let functionStart = -1;
        let functionBraceCount = 0;
        let functionName = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const funcMatch = line.match(new RegExp('(?:function\\s+(\\w+)|(?:const|let)\\s+(\\w+)\\s*=\\s*(?:async\\s+)?(?:function|\\()'));
            if (funcMatch && functionStart === -1) {
                functionName = funcMatch[1] || funcMatch[2];
                functionStart = i;
                functionBraceCount = 0;
            }
            if (functionStart !== -1) {
                functionBraceCount += (line.match(/{/g) || []).length;
                functionBraceCount -= (line.match(/}/g) || []).length;
                if (functionBraceCount <= 0 && functionStart !== -1) {
                    const functionLength = i - functionStart + 1;
                    if (functionLength > 50) {
                        issues.push({
                            severity: 'medium',
                            category: 'structure',
                            message: `Function "${functionName}" is too long (${functionLength} lines)`,
                            line: functionStart + 1,
                            ruleId: 'max-function-length',
                            suggestion: 'Break the function into smaller, focused functions',
                        });
                    }
                    functionStart = -1;
                }
            }
        }
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const paramMatch = line.match(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?)\(([^)]*)\)/);
            if (paramMatch) {
                const params = paramMatch[1].split(',').filter((p) => p.trim().length > 0);
                if (params.length > 5) {
                    issues.push({
                        severity: 'medium',
                        category: 'structure',
                        message: `Function has too many parameters (${params.length})`,
                        line: i + 1,
                        ruleId: 'max-params',
                        suggestion: 'Consider using an options object pattern instead of many parameters',
                    });
                }
            }
        }
    }
    checkErrorHandling(lines, issues, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/catch\s*\(/) && i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine === '}' || nextLine === '') {
                    issues.push({
                        severity: 'high',
                        category: 'error-handling',
                        message: 'Empty catch block silently swallows errors',
                        line: i + 1,
                        ruleId: 'no-empty-catch',
                        suggestion: 'Handle the error appropriately or re-throw it',
                    });
                }
            }
            if (line.match(/catch/) && i + 1 < lines.length) {
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    if (lines[j].includes('console.log') && !lines[j].includes('console.error')) {
                        issues.push({
                            severity: 'medium',
                            category: 'error-handling',
                            message: 'Catch block only logs error without proper handling',
                            line: i + 1,
                            ruleId: 'proper-error-handling',
                            suggestion: 'Implement proper error handling or recovery logic',
                        });
                        break;
                    }
                    if (lines[j].includes('}'))
                        break;
                }
            }
            if ((language === 'typescript' || language === 'javascript') && line.includes('.then(') && !line.includes('.catch(')) {
                const remainingCode = lines.slice(i).join('\n');
                if (!remainingCode.substring(0, 200).includes('.catch(')) {
                    issues.push({
                        severity: 'medium',
                        category: 'error-handling',
                        message: 'Promise chain missing .catch() handler',
                        line: i + 1,
                        ruleId: 'no-unhandled-promise',
                        suggestion: 'Add .catch() handler or use async/await with try-catch',
                    });
                }
            }
        }
    }
    checkPerformanceAntiPatterns(lines, issues, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/\.push\(|\.splice\(/) && i > 0) {
                for (let j = Math.max(0, i - 3); j < i; j++) {
                    if (lines[j].match(/for\s*\(|\.forEach\(|\.map\(/)) {
                        issues.push({
                            severity: 'medium',
                            category: 'performance',
                            message: 'Array mutation inside loop can be inefficient',
                            line: i + 1,
                            ruleId: 'no-mutation-in-loop',
                            suggestion: 'Use functional approaches like map/filter/reduce or collect items first',
                        });
                        break;
                    }
                }
            }
            if (line.includes('readFileSync') || line.includes('writeFileSync')) {
                issues.push({
                    severity: 'medium',
                    category: 'performance',
                    message: 'Synchronous file operation blocks the event loop',
                    line: i + 1,
                    ruleId: 'no-sync-file-ops',
                    suggestion: 'Use async file operations (readFile, writeFile) instead',
                });
            }
            let indentLevel = 0;
            const match = line.match(/^(\s*)/);
            if (match)
                indentLevel = match[1].length;
            if (line.match(/for\s*\(|while\s*\(|\.forEach\(/)) {
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const innerMatch = lines[j].match(/^(\s*)/);
                    if (innerMatch && innerMatch[1].length > indentLevel && lines[j].match(/for\s*\(|while\s*\(|\.forEach\(/)) {
                        issues.push({
                            severity: 'medium',
                            category: 'performance',
                            message: 'Nested loop detected — potential O(n²) complexity',
                            line: j + 1,
                            ruleId: 'no-nested-loops',
                            suggestion: 'Consider optimizing with hash maps, sorting, or breaking early',
                        });
                        break;
                    }
                }
            }
        }
    }
    detectOffByOneErrors(lines, bugs, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/i\s*<=\s*\w+\.length/) || line.match(/i\s*<=\s*len\(/)) {
                bugs.push({
                    type: 'bug',
                    severity: 'high',
                    message: 'Potential off-by-one error: using <= with length',
                    line: i + 1,
                    confidence: 0.7,
                    fix: 'Use < instead of <= when iterating array indices',
                });
            }
        }
    }
    detectNullReferenceRisks(lines, bugs, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/\w+\.\w+\.\w+/) && !line.includes('?.') && !line.includes('null') && !line.includes('undefined')) {
                bugs.push({
                    type: 'warning',
                    severity: 'medium',
                    message: 'Deep property access without null checking',
                    line: i + 1,
                    confidence: 0.5,
                    fix: 'Use optional chaining (?.) or add null checks before accessing nested properties',
                });
            }
        }
    }
    detectResourceLeaks(lines, bugs, language) {
        if (language === 'typescript' || language === 'javascript') {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('open(') || line.includes('createConnection(') || line.includes('connect(')) {
                    const remainingCode = lines.slice(i + 1).join('\n');
                    if (!remainingCode.includes('.close(') && !remainingCode.includes('.end(') && !remainingCode.includes('finally')) {
                        bugs.push({
                            type: 'bug',
                            severity: 'high',
                            message: 'Resource opened but may not be properly closed',
                            line: i + 1,
                            confidence: 0.6,
                            fix: 'Ensure resource is closed in a finally block or use with/resource pattern',
                        });
                    }
                }
            }
        }
    }
    detectRaceConditions(lines, bugs, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('await ') && i > 0) {
                for (let j = Math.max(0, i - 3); j < i; j++) {
                    if (lines[j].match(/\w+\[\w+\]\s*=/) && !lines[j].includes('const ') && !lines[j].includes('let ')) {
                        bugs.push({
                            type: 'warning',
                            severity: 'high',
                            message: 'Potential race condition: shared mutable state modified around async boundary',
                            line: i + 1,
                            confidence: 0.4,
                            fix: 'Use proper synchronization or make state immutable',
                        });
                        break;
                    }
                }
            }
        }
    }
    detectUnhandledPromises(lines, bugs, language) {
        if (language === 'typescript' || language === 'javascript') {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const floatingPromise = line.match(/^(\s*)(\w+)\(/);
                if (floatingPromise) {
                    const indent = floatingPromise[1];
                    if (!line.includes('await ') && !line.includes('.then(') && !line.includes('.catch(') && !line.includes('//')) {
                        const surroundingContext = lines.slice(Math.max(0, i - 2), i).join('\n');
                        if (surroundingContext.includes('async ')) {
                            bugs.push({
                                type: 'warning',
                                severity: 'medium',
                                message: 'Possible unhandled promise — missing await',
                                line: i + 1,
                                confidence: 0.3,
                                fix: 'Add await keyword or handle the promise with .then()/.catch()',
                            });
                        }
                    }
                }
            }
        }
    }
    detectIncorrectComparisons(lines, bugs, language) {
        if (language === 'typescript' || language === 'javascript') {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const looseEq = line.match(/[^=!]==[^=]/);
                if (looseEq) {
                    bugs.push({
                        type: 'warning',
                        severity: 'medium',
                        message: 'Loose equality (==) can lead to unexpected type coercion',
                        line: i + 1,
                        confidence: 0.8,
                        fix: 'Use strict equality (===) instead of loose equality (==)',
                    });
                }
                const assignInCond = line.match(/if\s*\(\s*\w+\s*=[^=]/);
                if (assignInCond) {
                    bugs.push({
                        type: 'bug',
                        severity: 'high',
                        message: 'Assignment in conditional — likely intended to be comparison',
                        line: i + 1,
                        confidence: 0.85,
                        fix: 'Use === for comparison or wrap assignment in extra parentheses to indicate intent',
                    });
                }
            }
        }
    }
    detectUnusedVariables(lines, warnings, language) {
        const varDeclarations = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
            if (match) {
                varDeclarations.push({ name: match[1], line: i + 1 });
            }
        }
        const code = lines.join('\n');
        for (const decl of varDeclarations) {
            const regex = new RegExp(`\\b${decl.name}\\b`, 'g');
            const matches = code.match(regex);
            if (matches && matches.length <= 1) {
                warnings.push({
                    type: 'warning',
                    severity: 'low',
                    message: `Variable "${decl.name}" is declared but never used`,
                    line: decl.line,
                    confidence: 0.75,
                    fix: 'Remove the unused variable or prefix with underscore to indicate intentional',
                });
            }
        }
    }
    detectUnreachableCode(lines, warnings, language) {
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.match(/^(return|throw|break|continue)/)) {
                const nextLine = lines[i + 1].trim();
                if (nextLine && !nextLine.startsWith('//') && !nextLine.startsWith('}') && !nextLine.startsWith('case')) {
                    warnings.push({
                        type: 'warning',
                        severity: 'medium',
                        message: 'Unreachable code detected after control flow statement',
                        line: i + 2,
                        confidence: 0.9,
                        fix: 'Remove the unreachable code or fix the control flow',
                    });
                }
            }
        }
    }
    detectImplicitTypeCoercion(lines, warnings, language) {
        if (language === 'typescript' || language === 'javascript') {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.match(/\+\s*['"`]/) || line.match(/['"`]\s*\+/)) {
                    const hasNumberNearby = line.match(/\d/);
                    if (hasNumberNearby) {
                        warnings.push({
                            type: 'warning',
                            severity: 'low',
                            message: 'Potential implicit type coercion in string concatenation',
                            line: i + 1,
                            confidence: 0.4,
                            fix: 'Use template literals or explicit String() conversion',
                        });
                    }
                }
            }
        }
    }
    detectSQLInjection(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/(SELECT|INSERT|UPDATE|DELETE|DROP).*\+/i) ||
                line.match(/(SELECT|INSERT|UPDATE|DELETE|DROP).*\$\{/i)) {
                vulns.push({
                    id: `SQL-${i + 1}`,
                    category: 'Injection',
                    severity: 'critical',
                    title: 'SQL Injection vulnerability',
                    description: 'SQL query constructed with string concatenation or interpolation',
                    line: i + 1,
                    cwe: 'CWE-89',
                    owasp: 'A03:2021-Injection',
                    remediation: 'Use parameterized queries or ORM methods instead of string concatenation',
                });
            }
        }
    }
    detectXSSVulnerabilities(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('innerHTML') && !line.includes('sanitize') && !line.includes('escape')) {
                vulns.push({
                    id: `XSS-${i + 1}`,
                    category: 'XSS',
                    severity: 'high',
                    title: 'Cross-Site Scripting (XSS) vulnerability',
                    description: 'innerHTML used with potentially unsanitized content',
                    line: i + 1,
                    cwe: 'CWE-79',
                    owasp: 'A03:2021-Injection',
                    remediation: 'Sanitize user input before rendering or use textContent instead of innerHTML',
                });
            }
            if (line.includes('dangerouslySetInnerHTML') && !line.includes('sanitize')) {
                vulns.push({
                    id: `XSS-REACT-${i + 1}`,
                    category: 'XSS',
                    severity: 'high',
                    title: 'React XSS via dangerouslySetInnerHTML',
                    description: 'dangerouslySetInnerHTML used without sanitization',
                    line: i + 1,
                    cwe: 'CWE-79',
                    owasp: 'A03:2021-Injection',
                    remediation: 'Use DOMPurify or similar library to sanitize HTML before rendering',
                });
            }
        }
    }
    detectInsecureDependencies(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('eval(')) {
                vulns.push({
                    id: `INSECURE-${i + 1}`,
                    category: 'Code Injection',
                    severity: 'critical',
                    title: 'Use of eval() is insecure',
                    description: 'eval() can execute arbitrary code and should never be used with user input',
                    line: i + 1,
                    cwe: 'CWE-94',
                    owasp: 'A03:2021-Injection',
                    remediation: 'Replace eval() with safer alternatives (JSON.parse, Function constructor, etc.)',
                });
            }
            if (line.includes('http://') && !line.includes('localhost') && !line.includes('127.0.0.1')) {
                vulns.push({
                    id: `INSECURE-HTTP-${i + 1}`,
                    category: 'Data Transmission',
                    severity: 'medium',
                    title: 'Insecure HTTP URL detected',
                    description: 'HTTP URLs transmit data unencrypted; use HTTPS instead',
                    line: i + 1,
                    cwe: 'CWE-319',
                    owasp: 'A02:2021-Cryptographic Failures',
                    remediation: 'Replace http:// with https:// for all external URLs',
                });
            }
        }
    }
    detectHardcodedSecrets(lines, vulns, language) {
        const secretPatterns = [
            { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i, name: 'Password' },
            { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/i, name: 'API Key' },
            { pattern: /(?:secret|token)\s*[:=]\s*['"][^'"]+['"]/i, name: 'Secret/Token' },
            { pattern: /(?:private[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i, name: 'Private Key' },
        ];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const { pattern, name } of secretPatterns) {
                if (pattern.test(line) && !line.includes('process.env') && !line.includes('ENV') && !line.includes('config.')) {
                    vulns.push({
                        id: `SECRET-${i + 1}`,
                        category: 'Sensitive Data Exposure',
                        severity: 'high',
                        title: `Hardcoded ${name} detected`,
                        description: `${name} is hardcoded in source code instead of using environment variables`,
                        line: i + 1,
                        cwe: 'CWE-798',
                        owasp: 'A07:2021-Identification and Authentication Failures',
                        remediation: 'Move secrets to environment variables or a secure vault',
                    });
                }
            }
        }
    }
    detectInsecureCrypto(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('md5') || line.includes('sha1')) {
                vulns.push({
                    id: `CRYPTO-${i + 1}`,
                    category: 'Cryptographic Failure',
                    severity: 'high',
                    title: 'Weak cryptographic algorithm',
                    description: 'MD5/SHA1 are cryptographically broken and should not be used for security purposes',
                    line: i + 1,
                    cwe: 'CWE-328',
                    owasp: 'A02:2021-Cryptographic Failures',
                    remediation: 'Use SHA-256 or stronger algorithms for hashing',
                });
            }
            if (line.includes('Math.random()') && (line.includes('token') || line.includes('key') || line.includes('password') || line.includes('secret'))) {
                vulns.push({
                    id: `CRYPTO-RNG-${i + 1}`,
                    category: 'Cryptographic Failure',
                    severity: 'high',
                    title: 'Insecure random number generation for security context',
                    description: 'Math.random() is not cryptographically secure',
                    line: i + 1,
                    cwe: 'CWE-338',
                    owasp: 'A02:2021-Cryptographic Failures',
                    remediation: 'Use crypto.randomBytes() or window.crypto.getRandomValues() for security-sensitive randomness',
                });
            }
        }
    }
    detectPathTraversal(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if ((line.includes('readFile') || line.includes('readFileSync') || line.includes('writeFile')) &&
                line.includes('req.') && !line.includes('path.normalize') && !line.includes('path.resolve')) {
                vulns.push({
                    id: `PATH-${i + 1}`,
                    category: 'Path Traversal',
                    severity: 'high',
                    title: 'Potential path traversal vulnerability',
                    description: 'File path derived from user input without sanitization',
                    line: i + 1,
                    cwe: 'CWE-22',
                    owasp: 'A01:2021-Broken Access Control',
                    remediation: 'Validate and sanitize file paths, use path.resolve() with a base directory',
                });
            }
        }
    }
    detectCommandInjection(lines, vulns, language) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if ((line.includes('exec(') || line.includes('execSync(') || line.includes('spawn(')) &&
                (line.includes('req.') || line.includes('params.') || line.includes('body.'))) {
                vulns.push({
                    id: `CMD-${i + 1}`,
                    category: 'Command Injection',
                    severity: 'critical',
                    title: 'OS command injection vulnerability',
                    description: 'OS command executed with potentially unsanitized user input',
                    line: i + 1,
                    cwe: 'CWE-78',
                    owasp: 'A03:2021-Injection',
                    remediation: 'Use parameterized command execution or avoid shell commands with user input',
                });
            }
        }
    }
    checkOWASPCompliance(code, vulns, issues) {
        const owaspTop10 = [
            'A01:2021-Broken Access Control',
            'A02:2021-Cryptographic Failures',
            'A03:2021-Injection',
            'A04:2021-Insecure Design',
            'A05:2021-Security Misconfiguration',
            'A06:2021-Vulnerable and Outdated Components',
            'A07:2021-Identification and Authentication Failures',
            'A08:2021-Software and Data Integrity Failures',
            'A09:2021-Security Logging and Monitoring Failures',
            'A10:2021-Server-Side Request Forgery',
        ];
        const foundCategories = new Set(vulns.map((v) => v.owasp).filter(Boolean));
        for (const category of owaspTop10) {
            if (foundCategories.has(category)) {
                issues.push(`OWASP compliance issue: ${category} - vulnerabilities detected`);
            }
        }
        if (!code.includes('helmet') && !code.includes('cors') && (code.includes('express') || code.includes('app.use'))) {
            issues.push('OWASP A05: Security Misconfiguration - Missing security middleware (helmet, cors)');
        }
        if (!code.includes('rate') && !code.includes('throttle') && code.includes('app.post')) {
            issues.push('OWASP A04: Insecure Design - Missing rate limiting on POST endpoints');
        }
    }
    calculateCyclomaticComplexity(lines, language) {
        let complexity = 1;
        const branchKeywords = [
            /\bif\b/, /\belse\s+if\b/, /\bfor\b/, /\bwhile\b/, /\bcase\b/,
            /\bcatch\b/, /\?.*:/, /\&\&/, /\|\|/,
        ];
        for (const line of lines) {
            for (const keyword of branchKeywords) {
                const matches = line.match(new RegExp(keyword.source, 'g'));
                if (matches) {
                    complexity += matches.length;
                }
            }
        }
        return complexity;
    }
    calculateCognitiveComplexity(lines, language) {
        let complexity = 0;
        let nestingLevel = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('{'))
                nestingLevel += (trimmed.match(/{/g) || []).length;
            if (trimmed.match(/\bif\b/) || trimmed.match(/\belse\b/) || trimmed.match(/\bfor\b/) ||
                trimmed.match(/\bwhile\b/) || trimmed.match(/\bcatch\b/) || trimmed.match(/\bswitch\b/)) {
                complexity += 1 + Math.max(0, nestingLevel - 1);
            }
            complexity += (trimmed.match(/&&/g) || []).length;
            complexity += (trimmed.match(/\|\|/g) || []).length;
            if (trimmed.includes('}'))
                nestingLevel -= (trimmed.match(/}/g) || []).length;
            nestingLevel = Math.max(0, nestingLevel);
        }
        return complexity;
    }
    calculateMaxNesting(lines, language) {
        let maxNesting = 0;
        let currentNesting = 0;
        for (const line of lines) {
            currentNesting += (line.match(/{/g) || []).length;
            currentNesting -= (line.match(/}/g) || []).length;
            currentNesting = Math.max(0, currentNesting);
            maxNesting = Math.max(maxNesting, currentNesting);
        }
        return maxNesting;
    }
    calculateMaintainabilityIndex(linesOfCode, cyclomaticComplexity) {
        const avgLineLength = 40;
        const halsteadVolume = linesOfCode * avgLineLength;
        const mi = Math.max(0, 171 - 5.2 * Math.log(halsteadVolume + 1) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode + 1));
        return Math.round(Math.min(100, Math.max(0, mi)));
    }
    findComplexityHotspots(lines, language, thresholds) {
        const hotspots = [];
        let funcStart = -1;
        let funcName = '';
        let braceCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/);
            if (funcMatch && funcStart === -1) {
                funcName = funcMatch[1] || funcMatch[2];
                funcStart = i;
                braceCount = 0;
            }
            if (funcStart !== -1) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                if (braceCount <= 0) {
                    const funcLines = lines.slice(funcStart, i + 1);
                    const cyclomatic = this.calculateCyclomaticComplexity(funcLines, language);
                    const cognitive = this.calculateCognitiveComplexity(funcLines, language);
                    const nesting = this.calculateMaxNesting(funcLines, language);
                    if (cyclomatic > thresholds.maxCyclomatic || cognitive > thresholds.maxCognitive || nesting > thresholds.maxNesting) {
                        hotspots.push({
                            functionName: funcName,
                            startLine: funcStart + 1,
                            endLine: i + 1,
                            cyclomatic,
                            cognitive,
                            nesting,
                            suggestion: `Function "${funcName}" has high complexity (cyclomatic=${cyclomatic}, cognitive=${cognitive}, nesting=${nesting}). Consider refactoring into smaller functions.`,
                        });
                    }
                    funcStart = -1;
                }
            }
        }
        return hotspots;
    }
    checkSingleResponsibility(lines) {
        const declarations = lines.filter((l) => l.match(/^(export\s+)?(class|function|interface)\s/));
        return declarations.length <= 3;
    }
    checkDRY(lines) {
        const lineCounts = new Map();
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 20 && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
            }
        }
        const duplicates = Array.from(lineCounts.entries()).filter(([, count]) => count >= 3);
        return duplicates.length === 0;
    }
    checkProperErrorHandling(lines, language) {
        const asyncOps = lines.filter((l) => l.includes('await ') || l.includes('.then('));
        const tryCatchBlocks = lines.filter((l) => l.includes('try {') || l.includes('catch ('));
        const catches = lines.filter((l) => l.includes('.catch('));
        if (asyncOps.length === 0)
            return true;
        return tryCatchBlocks.length + catches.length > 0;
    }
    checkConsistentNaming(lines, language) {
        const camelCase = lines.filter((l) => l.match(/(?:const|let|function)\s+[a-z][a-zA-Z0-9]*\s*[=(]/));
        const snakeCase = lines.filter((l) => l.match(/(?:const|let|function|def)\s+[a-z][a-z_0-9]*\s*[=(]/));
        const pascalCase = lines.filter((l) => l.match(/(?:class|interface)\s+[A-Z][a-zA-Z0-9]*\s*{/));
        if (language === 'typescript' || language === 'javascript') {
            return snakeCase.length <= camelCase.length;
        }
        if (language === 'python') {
            return camelCase.length <= snakeCase.length;
        }
        return true;
    }
    checkMagicNumbers(lines) {
        const magicNumberPattern = /(?:==|!=|>=|<=|>|<|\+)\s*(?!\d+\.\d+)(\d{2,})\s*[;)\]}/]/;
        const violations = lines.filter((l) => {
            const match = l.match(magicNumberPattern);
            return match && !l.includes('//') && match[1] !== '0' && match[1] !== '1';
        });
        return violations.length <= 2;
    }
    checkConstOverLet(code) {
        const letCount = (code.match(/\blet\s+/g) || []).length;
        const constCount = (code.match(/\bconst\s+/g) || []).length;
        return constCount >= letCount;
    }
    calculateReviewScore(totalLines, issues) {
        let score = 100;
        for (const issue of issues) {
            switch (issue.severity) {
                case 'critical':
                    score -= 15;
                    break;
                case 'high':
                    score -= 8;
                    break;
                case 'medium':
                    score -= 3;
                    break;
                case 'low':
                    score -= 1;
                    break;
            }
        }
        return Math.max(0, Math.min(100, score));
    }
    calculateSecurityRiskScore(vulns) {
        let score = 0;
        for (const vuln of vulns) {
            switch (vuln.severity) {
                case 'critical':
                    score += 25;
                    break;
                case 'high':
                    score += 15;
                    break;
                case 'medium':
                    score += 8;
                    break;
                case 'low':
                    score += 3;
                    break;
            }
        }
        return Math.min(100, score);
    }
};
exports.CodeReviewAgentService = CodeReviewAgentService;
exports.CodeReviewAgentService = CodeReviewAgentService = __decorate([
    (0, common_1.Injectable)()
], CodeReviewAgentService);
//# sourceMappingURL=code-review-agent.service.js.map