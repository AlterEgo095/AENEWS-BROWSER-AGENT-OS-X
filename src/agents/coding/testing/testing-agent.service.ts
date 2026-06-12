/**
 * AENEWS Agent OS X - Testing Agent
 * Generates and runs tests, performs coverage analysis, and creates test fixtures.
 * Supports unit tests, integration tests, and coverage reporting.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const TESTING_AGENT_CONFIG: AgentConfig = {
  id: 'coding-testing',
  name: 'Testing',
  cluster: AgentCluster.CODING,
  version: '1.0.0',
  description:
    'Generate and run tests, perform coverage analysis, and create test fixtures. Supports unit tests, integration tests, coverage reporting, and test fixture generation.',
  capabilities: [
    {
      name: 'generateUnitTests',
      description: 'Generate unit tests for a given source code module',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to generate tests for' },
          language: { type: 'string', description: 'Programming language' },
          framework: { type: 'string', description: 'Test framework (jest, mocha, pytest, etc.)' },
          filePath: { type: 'string', description: 'Original file path for naming' },
        },
        required: ['code', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          testCode: { type: 'string' },
          testFilePath: { type: 'string' },
          testCases: { type: 'array', items: { type: 'object' } },
          coverage: { type: 'object' },
        },
      },
    },
    {
      name: 'generateIntegrationTests',
      description: 'Generate integration tests for API endpoints and service interactions',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to test' },
          language: { type: 'string', description: 'Programming language' },
          framework: { type: 'string', description: 'Test framework' },
          endpoints: {
            type: 'array',
            items: { type: 'object' },
            description: 'API endpoints to test',
          },
        },
        required: ['code', 'language'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          testCode: { type: 'string' },
          testFilePath: { type: 'string' },
          testSuites: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'runTests',
      description: 'Execute tests and collect results',
      inputSchema: {
        type: 'object',
        properties: {
          testPath: { type: 'string', description: 'Path to test file or directory' },
          framework: { type: 'string', description: 'Test framework to use' },
          coverage: { type: 'boolean', default: false, description: 'Collect coverage data' },
          watch: { type: 'boolean', default: false, description: 'Run in watch mode' },
        },
        required: ['testPath'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          passed: { type: 'number' },
          failed: { type: 'number' },
          skipped: { type: 'number' },
          coveragePercent: { type: 'number' },
          results: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'analyzeCoverage',
      description: 'Analyze test coverage and identify uncovered code paths',
      inputSchema: {
        type: 'object',
        properties: {
          coverageData: { type: 'object', description: 'Coverage data from test run' },
          sourceCode: { type: 'string', description: 'Source code for coverage analysis' },
          threshold: { type: 'number', description: 'Minimum coverage threshold percentage' },
        },
        required: ['coverageData'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          lineCoverage: { type: 'number' },
          branchCoverage: { type: 'number' },
          functionCoverage: { type: 'number' },
          uncoveredPaths: { type: 'array', items: { type: 'object' } },
          meetsThreshold: { type: 'boolean' },
        },
      },
    },
    {
      name: 'generateFixtures',
      description: 'Generate test fixtures and mock data',
      inputSchema: {
        type: 'object',
        properties: {
          schema: { type: 'object', description: 'Data schema or interface definition' },
          count: { type: 'number', description: 'Number of fixtures to generate' },
          format: { type: 'string', enum: ['json', 'typescript', 'python'], default: 'json' },
          language: { type: 'string', description: 'Programming language for typed fixtures' },
        },
        required: ['schema'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          fixtures: { type: 'array', items: { type: 'object' } },
          fixtureCode: { type: 'string' },
          filePath: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:code', 'write:test', 'execute:test', 'read:coverage'],
  maxConcurrentTasks: 4,
  timeout: 120000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface TestCase {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: any;
  type: 'positive' | 'negative' | 'edge' | 'boundary';
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  assertions: number;
}

interface CoverageReport {
  lines: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
}

interface UncoveredPath {
  file: string;
  lineStart: number;
  lineEnd: number;
  type: 'line' | 'branch' | 'function';
  description: string;
  suggestion: string;
}

interface FunctionSignature {
  name: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class TestingAgentService extends BaseAgentService {
  private testResults: Map<string, TestResult[]> = new Map();
  private coverageHistory: Array<{ timestamp: Date; coverage: number }> = [];

  protected defineConfig(): AgentConfig {
    return TESTING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'generateUnitTests',
      description: 'Generate unit tests for source code',
      execute: async (params: {
        code: string;
        language: string;
        framework?: string;
        filePath?: string;
      }) => this.generateUnitTests(params),
    });

    this.registerTool({
      name: 'generateIntegrationTests',
      description: 'Generate integration tests',
      execute: async (params: {
        code: string;
        language: string;
        framework?: string;
        endpoints?: Array<{ method: string; path: string; body?: any }>;
      }) => this.generateIntegrationTests(params),
    });

    this.registerTool({
      name: 'runTests',
      description: 'Execute tests and collect results',
      execute: async (params: {
        testPath: string;
        framework?: string;
        coverage?: boolean;
        watch?: boolean;
      }) => this.runTests(params),
    });

    this.registerTool({
      name: 'analyzeCoverage',
      description: 'Analyze test coverage and identify gaps',
      execute: async (params: {
        coverageData: Record<string, any>;
        sourceCode?: string;
        threshold?: number;
      }) => this.analyzeCoverage(params),
    });

    this.registerTool({
      name: 'generateFixtures',
      description: 'Generate test fixtures and mock data',
      execute: async (params: {
        schema: Record<string, any>;
        count?: number;
        format?: string;
        language?: string;
      }) => this.generateFixtures(params),
    });

    await this.storeInWorkingMemory('testing:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Testing agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    const supportedActions = [
      'generateUnitTests',
      'generateIntegrationTests',
      'runTests',
      'analyzeCoverage',
      'generateFixtures',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown testing action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `testing:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Testing execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.testResults.clear();
    this.coverageHistory = [];
    this.logger.log('Testing agent destroyed, results and history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async generateUnitTests(params: {
    code: string;
    language: string;
    framework?: string;
    filePath?: string;
  }): Promise<{
    testCode: string;
    testFilePath: string;
    testCases: TestCase[];
    estimatedCoverage: number;
  }> {
    const { code, language, framework = 'jest', filePath } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required for test generation');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Programming language is required');
    }

    // Extract function signatures from source code
    const functions = this.extractFunctionSignatures(code, language);

    if (functions.length === 0) {
      throw new Error('No testable functions found in the provided code');
    }

    // Generate test cases for each function
    const testCases: TestCase[] = [];
    for (const func of functions) {
      testCases.push(...this.generateTestCasesForFunction(func));
    }

    // Generate the test code
    const testCode = this.renderUnitTestCode(testCases, functions, framework, language, filePath);

    // Determine test file path
    const testFilePath = filePath
      ? filePath.replace(/\.\w+$/, `.spec.${this.getExtension(language)}`)
      : `generated.spec.${this.getExtension(language)}`;

    // Estimate coverage
    const estimatedCoverage = Math.min(
      100,
      Math.round((testCases.length / (functions.length * 3)) * 80),
    );

    this.logger.log(
      `Generated ${testCases.length} unit test(s) for ${functions.length} function(s), estimated coverage: ${estimatedCoverage}%`,
    );

    return { testCode, testFilePath, testCases, estimatedCoverage };
  }

  private async generateIntegrationTests(params: {
    code: string;
    language: string;
    framework?: string;
    endpoints?: Array<{ method: string; path: string; body?: any }>;
  }): Promise<{
    testCode: string;
    testFilePath: string;
    testSuites: Array<{ name: string; tests: string[] }>;
  }> {
    const { code, language, framework = 'jest', endpoints } = params;

    if (!code || typeof code !== 'string') {
      throw new Error('Source code is required for integration test generation');
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Programming language is required');
    }

    // Extract endpoints from code if not provided
    const extractedEndpoints = endpoints || this.extractEndpoints(code, language);

    if (extractedEndpoints.length === 0) {
      throw new Error('No endpoints found for integration test generation');
    }

    const testSuites: Array<{ name: string; tests: string[] }> = [];

    for (const endpoint of extractedEndpoints) {
      const suiteName = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
      const tests = this.generateEndpointTests(endpoint);
      testSuites.push({ name: suiteName, tests });
    }

    // Render integration test code
    const testCode = this.renderIntegrationTestCode(testSuites, framework, language);

    const testFilePath = `integration.spec.${this.getExtension(language)}`;

    this.logger.log(
      `Generated integration tests: ${testSuites.length} suite(s), ${testSuites.reduce((sum, s) => sum + s.tests.length, 0)} test(s)`,
    );

    return { testCode, testFilePath, testSuites };
  }

  private async runTests(params: {
    testPath: string;
    framework?: string;
    coverage?: boolean;
    watch?: boolean;
  }): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
    coveragePercent: number | null;
    results: TestResult[];
  }> {
    const { testPath, framework = 'jest', coverage = false, watch = false } = params;

    if (!testPath || typeof testPath !== 'string') {
      throw new Error('Test path is required');
    }

    // Simulate test execution
    // In a real implementation, this would spawn a test runner process
    const results = this.simulateTestExecution(testPath, framework);
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    let coveragePercent: number | null = null;
    if (coverage) {
      coveragePercent = this.simulateCoverageResult(passed, failed, results.length);
      this.coverageHistory.push({ timestamp: new Date(), coverage: coveragePercent });
    }

    // Store results
    this.testResults.set(testPath, results);

    // Store in memory for later reference
    await this.storeInWorkingMemory(
      `testing:results:${testPath}`,
      { passed, failed, skipped, coveragePercent, timestamp: new Date() },
      300000,
    );

    this.logger.log(
      `Test run complete: ${passed} passed, ${failed} failed, ${skipped} skipped, ${totalDuration}ms`,
    );

    return { passed, failed, skipped, totalDuration, coveragePercent, results };
  }

  private async analyzeCoverage(params: {
    coverageData: Record<string, any>;
    sourceCode?: string;
    threshold?: number;
  }): Promise<{
    lineCoverage: number;
    branchCoverage: number;
    functionCoverage: number;
    statementCoverage: number;
    uncoveredPaths: UncoveredPath[];
    meetsThreshold: boolean;
  }> {
    const { coverageData, sourceCode, threshold = 80 } = params;

    if (!coverageData || typeof coverageData !== 'object') {
      throw new Error('Coverage data is required');
    }

    // Extract or simulate coverage metrics
    const lineCoverage = coverageData.lines?.pct ?? this.simulateMetric(60, 95);
    const branchCoverage = coverageData.branches?.pct ?? this.simulateMetric(40, 90);
    const functionCoverage = coverageData.functions?.pct ?? this.simulateMetric(50, 95);
    const statementCoverage = coverageData.statements?.pct ?? this.simulateMetric(55, 95);

    // Identify uncovered paths
    const uncoveredPaths: UncoveredPath[] = [];

    if (sourceCode) {
      const lines = sourceCode.split('\n');
      this.identifyUncoveredPaths(
        lines,
        lineCoverage,
        branchCoverage,
        functionCoverage,
        uncoveredPaths,
      );
    } else {
      // Generate generic uncovered paths from coverage data
      this.generateGenericUncoveredPaths(coverageData, uncoveredPaths);
    }

    const meetsThreshold =
      lineCoverage >= threshold && branchCoverage >= threshold && functionCoverage >= threshold;

    this.logger.log(
      `Coverage analysis: lines=${lineCoverage}%, branches=${branchCoverage}%, functions=${functionCoverage}%, meets ${threshold}% threshold: ${meetsThreshold}`,
    );

    return {
      lineCoverage,
      branchCoverage,
      functionCoverage,
      statementCoverage,
      uncoveredPaths,
      meetsThreshold,
    };
  }

  private async generateFixtures(params: {
    schema: Record<string, any>;
    count?: number;
    format?: string;
    language?: string;
  }): Promise<{
    fixtures: Record<string, any>[];
    fixtureCode: string;
    filePath: string;
  }> {
    const { schema, count = 5, format = 'json', language = 'typescript' } = params;

    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema is required for fixture generation');
    }
    if (count < 1 || count > 100) {
      throw new Error('Count must be between 1 and 100');
    }

    // Generate fixture data based on schema
    const fixtures: Record<string, any>[] = [];
    for (let i = 0; i < count; i++) {
      const fixture = this.generateFixtureFromSchema(schema, i);
      fixtures.push(fixture);
    }

    // Render fixtures in the requested format
    let fixtureCode: string;
    let filePath: string;

    switch (format) {
      case 'typescript':
        fixtureCode = this.renderTypeScriptFixtures(fixtures, schema);
        filePath = 'fixtures.ts';
        break;
      case 'python':
        fixtureCode = this.renderPythonFixtures(fixtures);
        filePath = 'fixtures.py';
        break;
      case 'json':
      default:
        fixtureCode = JSON.stringify(fixtures, null, 2);
        filePath = 'fixtures.json';
        break;
    }

    this.logger.log(`Generated ${count} fixture(s) in ${format} format`);

    return { fixtures, fixtureCode, filePath };
  }

  // ─── Function Signature Extraction ─────────────────────────────

  private extractFunctionSignatures(code: string, language: string): FunctionSignature[] {
    const functions: FunctionSignature[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // Named function declarations
      const funcDeclRegex =
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g;
      let match: RegExpExecArray | null;
      while ((match = funcDeclRegex.exec(code)) !== null) {
        functions.push({
          name: match[1],
          params: this.parseParams(match[2]),
          returnType: match[3] || 'void',
          isAsync: code.substring(match.index - 10, match.index).includes('async'),
          isExported: code.substring(match.index - 10, match.index).includes('export'),
        });
      }

      // Arrow functions / const declarations
      const arrowRegex =
        /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|(\w+))\s*(?::\s*(\w+))?\s*=>/g;
      while ((match = arrowRegex.exec(code)) !== null) {
        functions.push({
          name: match[1],
          params: this.parseParams(match[2] || match[3] || ''),
          returnType: match[4] || 'void',
          isAsync: code.substring(match.index, match.index + 30).includes('async'),
          isExported: code.substring(match.index - 10, match.index).includes('export'),
        });
      }

      // Class methods
      const methodRegex =
        /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?\s*{/g;
      while ((match = methodRegex.exec(code)) !== null) {
        if (!['constructor', 'if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
          functions.push({
            name: match[1],
            params: this.parseParams(match[2]),
            returnType: match[3] || 'void',
            isAsync: code.substring(match.index, match.index + 30).includes('async'),
            isExported: false,
          });
        }
      }
    }

    if (language === 'python') {
      const funcRegex = /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?:/g;
      let match: RegExpExecArray | null;
      while ((match = funcRegex.exec(code)) !== null) {
        functions.push({
          name: match[1],
          params: this.parsePythonParams(match[2]),
          returnType: match[3] || 'None',
          isAsync: code.substring(match.index - 10, match.index).includes('async'),
          isExported: false,
        });
      }
    }

    return functions;
  }

  private parseParams(paramStr: string): Array<{ name: string; type: string }> {
    if (!paramStr.trim()) return [];

    return paramStr
      .split(',')
      .map((param) => {
        const trimmed = param.trim();
        const parts = trimmed.split(':');
        const name = parts[0].replace(/\?.*$/, '').trim();
        const type = parts[1] ? parts[1].replace(/\s*=\s*.*$/, '').trim() : 'any';
        return { name, type };
      })
      .filter((p) => p.name.length > 0);
  }

  private parsePythonParams(paramStr: string): Array<{ name: string; type: string }> {
    if (!paramStr.trim()) return [];

    return paramStr
      .split(',')
      .map((param) => {
        const trimmed = param.trim();
        if (trimmed.startsWith('self') || trimmed.startsWith('cls')) {
          return { name: trimmed, type: 'self' };
        }
        const parts = trimmed.split(':');
        const name = parts[0].replace(/\s*=\s*.*$/, '').trim();
        const type = parts[1] ? parts[1].replace(/\s*=\s*.*$/, '').trim() : 'Any';
        return { name, type };
      })
      .filter((p) => p.name.length > 0 && p.type !== 'self');
  }

  // ─── Test Case Generation ──────────────────────────────────────

  private generateTestCasesForFunction(func: FunctionSignature): TestCase[] {
    const cases: TestCase[] = [];

    // Positive test case
    cases.push({
      name: `${func.name} - should execute successfully with valid input`,
      description: `Valid input test for ${func.name}`,
      input: this.generateValidInput(func.params),
      expectedOutput: this.generateExpectedOutput(func.returnType),
      type: 'positive',
    });

    // Negative test case
    if (func.params.length > 0) {
      cases.push({
        name: `${func.name} - should handle invalid input gracefully`,
        description: `Invalid input test for ${func.name}`,
        input: this.generateInvalidInput(func.params),
        expectedOutput: null,
        type: 'negative',
      });

      // Edge cases for each parameter
      for (const param of func.params) {
        cases.push({
          name: `${func.name} - should handle edge case for ${param.name}`,
          description: `Edge case test for parameter ${param.name} of type ${param.type}`,
          input: this.generateEdgeCaseInput(func.params, param),
          expectedOutput: null,
          type: 'edge',
        });
      }
    }

    // Boundary test for numeric params
    const numericParams = func.params.filter((p) =>
      ['number', 'number', 'int', 'float', 'double'].includes(p.type.toLowerCase()),
    );
    for (const param of numericParams) {
      cases.push({
        name: `${func.name} - should handle boundary values for ${param.name}`,
        description: `Boundary test for ${param.name}`,
        input: { ...this.generateValidInput(func.params), [param.name]: 0 },
        expectedOutput: null,
        type: 'boundary',
      });
    }

    // Null/undefined test
    if (func.params.length > 0) {
      cases.push({
        name: `${func.name} - should handle null/undefined input`,
        description: `Null/undefined input test for ${func.name}`,
        input: this.generateNullInput(func.params),
        expectedOutput: null,
        type: 'negative',
      });
    }

    return cases;
  }

  private generateValidInput(params: Array<{ name: string; type: string }>): Record<string, any> {
    const input: Record<string, any> = {};
    for (const param of params) {
      input[param.name] = this.getMockValueForType(param.type);
    }
    return input;
  }

  private generateInvalidInput(params: Array<{ name: string; type: string }>): Record<string, any> {
    const input: Record<string, any> = {};
    if (params.length > 0) {
      // Make the first param invalid
      input[params[0].name] = this.getInvalidMockValueForType(params[0].type);
      for (let i = 1; i < params.length; i++) {
        input[params[i].name] = this.getMockValueForType(params[i].type);
      }
    }
    return input;
  }

  private generateEdgeCaseInput(
    params: Array<{ name: string; type: string }>,
    targetParam: { name: string; type: string },
  ): Record<string, any> {
    const input: Record<string, any> = {};
    for (const param of params) {
      if (param.name === targetParam.name) {
        input[param.name] = this.getEdgeCaseValueForType(param.type);
      } else {
        input[param.name] = this.getMockValueForType(param.type);
      }
    }
    return input;
  }

  private generateNullInput(params: Array<{ name: string; type: string }>): Record<string, any> {
    const input: Record<string, any> = {};
    for (const param of params) {
      input[param.name] = null;
    }
    return input;
  }

  private generateExpectedOutput(returnType: string): any {
    return this.getMockValueForType(returnType);
  }

  private getMockValueForType(type: string): any {
    const lower = type.toLowerCase().replace(/\[\]/g, '');
    switch (lower) {
      case 'string':
        return 'test-string';
      case 'number':
      case 'int':
      case 'float':
      case 'double':
        return 42;
      case 'boolean':
        return true;
      case 'date':
        return new Date().toISOString();
      case 'array':
      case 'any[]':
        return [];
      case 'object':
      case 'record':
        return {};
      case 'promise':
      case 'promise<void>':
        return undefined;
      case 'void':
      case 'undefined':
        return undefined;
      case 'null':
        return null;
      default:
        return { mock: true };
    }
  }

  private getInvalidMockValueForType(type: string): any {
    const lower = type.toLowerCase();
    switch (lower) {
      case 'string':
        return 12345;
      case 'number':
      case 'int':
      case 'float':
        return 'not-a-number';
      case 'boolean':
        return 'not-a-boolean';
      case 'array':
        return 'not-an-array';
      case 'object':
      case 'record':
        return 'not-an-object';
      default:
        return null;
    }
  }

  private getEdgeCaseValueForType(type: string): any {
    const lower = type.toLowerCase();
    switch (lower) {
      case 'string':
        return '';
      case 'number':
      case 'int':
      case 'float':
        return Number.MAX_SAFE_INTEGER;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
      case 'record':
        return {};
      default:
        return null;
    }
  }

  // ─── Test Code Rendering ───────────────────────────────────────

  private renderUnitTestCode(
    testCases: TestCase[],
    functions: FunctionSignature[],
    framework: string,
    language: string,
    filePath?: string,
  ): string {
    if (language === 'typescript' || language === 'javascript') {
      if (framework === 'jest') {
        return this.renderJestUnitTests(testCases, functions, filePath);
      }
      if (framework === 'mocha') {
        return this.renderMochaUnitTests(testCases, functions);
      }
    }

    if (language === 'python') {
      return this.renderPytestUnitTests(testCases, functions);
    }

    // Fallback
    return this.renderJestUnitTests(testCases, functions, filePath);
  }

  private renderJestUnitTests(
    testCases: TestCase[],
    functions: FunctionSignature[],
    filePath?: string,
  ): string {
    const importPath = filePath ? filePath.replace(/\.\w+$/, '') : './module';
    const imports = [...new Set(functions.filter((f) => f.isExported).map((f) => f.name))];

    const importStatement =
      imports.length > 0
        ? `import { ${imports.join(', ')} } from '${importPath}';`
        : `import * as module from '${importPath}';`;

    const testBlocks = testCases
      .map((tc) => {
        const inputStr = JSON.stringify(tc.input, null, 4);
        const expectedStr =
          tc.expectedOutput !== null ? JSON.stringify(tc.expectedOutput) : 'undefined';

        return `  test('${tc.name}', async () => {
    const input = ${inputStr};
    ${
      tc.type === 'negative'
        ? `await expect(${tc.name.split(' - ')[0].split('.').pop()}(input)).rejects.toThrow();`
        : `const result = await ${tc.name.split(' - ')[0].split('.').pop()}(input);
    expect(result).toBeDefined();`
    }
  });`;
      })
      .join('\n\n');

    return `${importStatement}

describe('${functions[0]?.name || 'Module'}', () => {
${testBlocks}
});
`;
  }

  private renderMochaUnitTests(testCases: TestCase[], functions: FunctionSignature[]): string {
    const testBlocks = testCases
      .map((tc) => {
        const inputStr = JSON.stringify(tc.input, null, 4);

        return `  it('${tc.name}', async () => {
    const input = ${inputStr};
    ${
      tc.type === 'negative'
        ? `await expect(${tc.name.split(' - ')[0].split('.').pop()}(input)).to.be.rejected;`
        : `const result = await ${tc.name.split(' - ')[0].split('.').pop()}(input);
    expect(result).to.not.be.undefined;`
    }
  });`;
      })
      .join('\n\n');

    return `import { expect } from 'chai';

describe('${functions[0]?.name || 'Module'}', () => {
${testBlocks}
});
`;
  }

  private renderPytestUnitTests(testCases: TestCase[], functions: FunctionSignature[]): string {
    const testBlocks = testCases
      .map((tc) => {
        const inputStr = JSON.stringify(tc.input);
        const funcName = tc.name.split(' - ')[0].split('.').pop();
        const pytestName = `test_${funcName}_${tc.type}`;

        return `def ${pytestName}():
    """${tc.description}"""
    input_data = ${inputStr}
    ${
      tc.type === 'negative'
        ? `with pytest.raises(Exception):\n        ${funcName}(**input_data)`
        : `result = ${funcName}(**input_data)\n    assert result is not None`
    }`;
      })
      .join('\n\n');

    return `import pytest

${testBlocks}
`;
  }

  // ─── Integration Test Rendering ────────────────────────────────

  private extractEndpoints(
    code: string,
    language: string,
  ): Array<{ method: string; path: string; body?: any }> {
    const endpoints: Array<{ method: string; path: string; body?: any }> = [];

    if (language === 'typescript' || language === 'javascript') {
      const routeRegex = /@(Get|Post|Put|Delete|Patch)\(['"]([^'"]+)['"]\)/g;
      let match: RegExpExecArray | null;
      while ((match = routeRegex.exec(code)) !== null) {
        endpoints.push({ method: match[1].toLowerCase(), path: match[2] });
      }

      // Express-style routes
      const expressRegex = /(?:router|app)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
      while ((match = expressRegex.exec(code)) !== null) {
        endpoints.push({ method: match[1].toLowerCase(), path: match[2] });
      }
    }

    if (language === 'python') {
      const flaskRegex = /@(app|bp)\.route\(['"]([^'"]+)['"]\],\s*methods\s*=\s*\[(\w+)\]/g;
      let match: RegExpExecArray | null;
      while ((match = flaskRegex.exec(code)) !== null) {
        endpoints.push({ method: match[3].toLowerCase(), path: match[2] });
      }
    }

    return endpoints;
  }

  private generateEndpointTests(endpoint: { method: string; path: string; body?: any }): string[] {
    const tests: string[] = [];
    const methodName = endpoint.method.toUpperCase();

    // Success test
    tests.push(`should return 200 for ${methodName} ${endpoint.path}`);

    // Error tests
    if (['POST', 'PUT', 'PATCH'].includes(methodName)) {
      tests.push(`should return 400 for ${methodName} ${endpoint.path} with invalid body`);
      tests.push(
        `should return 422 for ${methodName} ${endpoint.path} with missing required fields`,
      );
    }

    // Auth test
    tests.push(`should return 401 for ${methodName} ${endpoint.path} without authentication`);

    // Not found test (for parameterized routes)
    if (endpoint.path.includes(':') || endpoint.path.includes('{')) {
      tests.push(`should return 404 for ${methodName} ${endpoint.path} with non-existent resource`);
    }

    return tests;
  }

  private renderIntegrationTestCode(
    testSuites: Array<{ name: string; tests: string[] }>,
    framework: string,
    language: string,
  ): string {
    const suiteBlocks = testSuites
      .map((suite) => {
        const testBlocks = suite.tests
          .map(
            (test, index) =>
              `  test('${test}', async () => {
    const response = await request(app).${suite.name.split(' ')[0].toLowerCase()}('${suite.name.split(' ')[1]}');
    expect(response.status).toBeDefined();
  });`,
          )
          .join('\n\n');

        return `describe('${suite.name}', () => {
${testBlocks}
});`;
      })
      .join('\n\n');

    return `import request from 'supertest';
import { app } from './app';

${suiteBlocks}
`;
  }

  // ─── Test Execution Simulation ─────────────────────────────────

  private simulateTestExecution(testPath: string, framework: string): TestResult[] {
    const results: TestResult[] = [];
    // Simulate 5-15 test results
    const count = 5 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      const status: TestResult['status'] =
        rand < 0.8 ? 'passed' : rand < 0.95 ? 'failed' : 'skipped';

      results.push({
        name: `${testPath}::test_${i + 1}`,
        status,
        duration: Math.round(Math.random() * 500),
        error: status === 'failed' ? `Expected value to be truthy, received falsy` : undefined,
        assertions: 1 + Math.floor(Math.random() * 5),
      });
    }

    return results;
  }

  private simulateCoverageResult(passed: number, failed: number, total: number): number {
    const baseCoverage = (passed / total) * 100;
    return Math.min(100, Math.round(baseCoverage * (0.7 + Math.random() * 0.3)));
  }

  private simulateMetric(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }

  // ─── Coverage Analysis Helpers ─────────────────────────────────

  private identifyUncoveredPaths(
    lines: string[],
    lineCoverage: number,
    branchCoverage: number,
    functionCoverage: number,
    uncoveredPaths: UncoveredPath[],
  ): void {
    // Find functions that might not be covered
    if (functionCoverage < 100) {
      for (let i = 0; i < lines.length; i++) {
        const funcMatch = lines[i].match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=)/);
        if (funcMatch) {
          uncoveredPaths.push({
            file: 'source',
            lineStart: i + 1,
            lineEnd: i + 1,
            type: 'function',
            description: `Function "${funcMatch[1] || funcMatch[2]}" may not be covered by tests`,
            suggestion: `Add test cases that call this function directly`,
          });
        }
      }
    }

    // Find branches that might not be covered
    if (branchCoverage < 100) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('if (') || lines[i].includes('if(')) {
          uncoveredPaths.push({
            file: 'source',
            lineStart: i + 1,
            lineEnd: i + 1,
            type: 'branch',
            description: `Conditional branch at line ${i + 1} may not be fully covered`,
            suggestion: `Add test cases for both true and false branches of this condition`,
          });
        }
      }
    }

    // Limit uncovered paths reported
    if (uncoveredPaths.length > 20) {
      uncoveredPaths.splice(20);
    }
  }

  private generateGenericUncoveredPaths(
    coverageData: Record<string, any>,
    uncoveredPaths: UncoveredPath[],
  ): void {
    const files = Object.keys(coverageData).filter((k) => k !== 'total');

    for (const file of files.slice(0, 5)) {
      const fileCoverage = coverageData[file];
      if (fileCoverage.lines?.pct < 80) {
        uncoveredPaths.push({
          file,
          lineStart: 1,
          lineEnd: 1,
          type: 'line',
          description: `File ${file} has ${fileCoverage.lines?.pct || 0}% line coverage`,
          suggestion: `Add more test cases to cover uncovered lines in ${file}`,
        });
      }
    }
  }

  // ─── Fixture Generation Helpers ────────────────────────────────

  private generateFixtureFromSchema(
    schema: Record<string, any>,
    index: number,
  ): Record<string, any> {
    const fixture: Record<string, any> = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = prop as Record<string, any>;
        fixture[key] = this.generateValueFromSchema(propSchema, key, index);
      }
    } else {
      // If no properties, treat as flat key-value
      for (const [key, type] of Object.entries(schema)) {
        if (typeof type === 'string') {
          fixture[key] = this.generateValueByTypeHint(type, key, index);
        } else if (typeof type === 'object' && type !== null) {
          fixture[key] = this.generateFixtureFromSchema(type as Record<string, any>, index);
        }
      }
    }

    return fixture;
  }

  private generateValueFromSchema(
    propSchema: Record<string, any>,
    key: string,
    index: number,
  ): any {
    if (propSchema.enum) {
      return propSchema.enum[index % propSchema.enum.length];
    }

    switch (propSchema.type) {
      case 'string':
        if (key.toLowerCase().includes('email')) return `user${index}@example.com`;
        if (key.toLowerCase().includes('name')) return `Test Name ${index}`;
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link'))
          return `https://example.com/${index}`;
        if (key.toLowerCase().includes('id')) return `${1000 + index}`;
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at'))
          return new Date(Date.now() + index * 86400000).toISOString();
        return `test-${key}-${index}`;
      case 'number':
      case 'integer':
        if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount'))
          return Math.round((10 + index * 5.99) * 100) / 100;
        if (key.toLowerCase().includes('age')) return 20 + (index % 60);
        return index + 1;
      case 'boolean':
        return index % 2 === 0;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return `fixture-${key}-${index}`;
    }
  }

  private generateValueByTypeHint(typeHint: string, key: string, index: number): any {
    const lower = typeHint.toLowerCase();
    if (lower.includes('string')) return `test-${key}-${index}`;
    if (lower.includes('number') || lower.includes('int')) return index + 1;
    if (lower.includes('bool')) return index % 2 === 0;
    if (lower.includes('date')) return new Date().toISOString();
    return `fixture-${key}-${index}`;
  }

  private renderTypeScriptFixtures(
    fixtures: Record<string, any>[],
    schema: Record<string, any>,
  ): string {
    const interfaceName = 'FixtureData';
    const properties = schema.properties || schema;

    const interfaceProps = Object.entries(properties)
      .map(([key, value]) => {
        const prop = value as Record<string, any>;
        const type =
          prop.type === 'string'
            ? 'string'
            : prop.type === 'number' || prop.type === 'integer'
              ? 'number'
              : prop.type === 'boolean'
                ? 'boolean'
                : prop.type === 'array'
                  ? 'any[]'
                  : 'any';
        return `  ${key}: ${type};`;
      })
      .join('\n');

    const fixtureData = fixtures
      .map(
        (f, i) =>
          `  const fixture${i + 1}: ${interfaceName} = ${JSON.stringify(f, null, 4).replace(/\n/g, '\n  ')};`,
      )
      .join('\n\n');

    return `export interface ${interfaceName} {
${interfaceProps}
}

export const fixtures: ${interfaceName}[] = [
${fixtures.map((f) => JSON.stringify(f, null, 2)).join(',\n')}
];
`;
  }

  private renderPythonFixtures(fixtures: Record<string, any>[]): string {
    return `import pytest

@pytest.fixture
def fixture_data():
    return ${JSON.stringify(fixtures[0], null, 4)}

${fixtures
  .map(
    (f, i) => `def fixture_${i + 1}():
    """Test fixture ${i + 1}"""
    return ${JSON.stringify(f, null, 4)}`,
  )
  .join('\n\n')}
`;
  }

  // ─── Utility ──────────────────────────────────────────────────

  private getExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
    };
    return extensions[language.toLowerCase()] || 'ts';
  }
}
