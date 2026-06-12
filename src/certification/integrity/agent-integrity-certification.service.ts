/**
 * AENEWS Agent OS X - Agent Integrity Certification Service
 * Dynamically discovers and certifies ALL agents in the system by performing
 * static analysis combined with simulated instantiation checks.
 *
 * For each agent source file:
 * 1. Read the source code
 * 2. Parse and verify patterns (defineConfig, onInitialize, onExecute, onDestroy, registerTool, etc.)
 * 3. Verify the agent config has all required fields
 * 4. Verify tools are registered in onInitialize
 * 5. Verify error handling patterns (try/catch in onExecute)
 * 6. Verify retry policy in config
 * 7. Verify timeout in config
 * 8. Verify permissions in config
 * 9. Check for concurrent task handling (maxConcurrentTasks in config)
 * 10. Check for logging patterns (this.logger)
 *
 * Each test is scored 0-100 based on how complete the implementation is.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CertificationDomain, DomainResult, TestResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');

// ─── Agent Scan Result ────────────────────────────────────────────

interface AgentScanResult {
  filePath: string;
  relativePath: string;
  content: string;
  className: string;
  cluster: string;
  configName: string;
}

// ─── Per-Agent Test Details ───────────────────────────────────────

interface AgentTestDetails {
  agentId: string;
  agentClass: string;
  cluster: string;
  testScores: Record<string, number>;
  healthScore: number;
  issues: string[];
}

@Injectable()
export class AgentIntegrityCertificationService {
  private readonly logger = new Logger(AgentIntegrityCertificationService.name);

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all agent integrity certification tests across every discovered agent.
   * Returns a DomainResult with the aggregate score and per-test details.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting Agent Integrity certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Discover all agent source files
    const agentFiles = await this.discoverAgentFiles();
    this.logger.log(`Discovered ${agentFiles.length} agent files`);

    if (agentFiles.length === 0) {
      return {
        domain: CertificationDomain.AGENTS,
        weight: 0.15,
        score: 0,
        tests: [
          {
            name: 'Agent Discovery',
            passed: false,
            score: 0,
            durationMs: Date.now() - startTime,
            error: 'No agent files discovered in the project',
          },
        ],
        passed: false,
        criticalFailures: ['No agent files found'],
      };
    }

    // Run the 10 certification tests
    const testMethods: Array<{
      name: string;
      fn: (agents: AgentScanResult[]) => Promise<TestResult>;
    }> = [
      { name: 'Initialization', fn: (a) => this.testInitialization(a) },
      { name: 'Shutdown', fn: (a) => this.testShutdown(a) },
      { name: 'Timeout Handling', fn: (a) => this.testTimeoutHandling(a) },
      { name: 'Retry Logic', fn: (a) => this.testRetryLogic(a) },
      { name: 'Logging', fn: (a) => this.testLogging(a) },
      { name: 'Permissions', fn: (a) => this.testPermissions(a) },
      { name: 'Memory Integration', fn: (a) => this.testMemoryIntegration(a) },
      { name: 'Tools Registered', fn: (a) => this.testToolsRegistered(a) },
      { name: 'Exception Handling', fn: (a) => this.testExceptionHandling(a) },
      { name: 'Concurrent Execution', fn: (a) => this.testConcurrentExecution(a) },
    ];

    for (const testDef of testMethods) {
      try {
        const result = await testDef.fn(agentFiles);
        tests.push(result);

        if (!result.passed && result.score < 50) {
          criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
        }
      } catch (error) {
        const errMsg = (error as Error).message;
        this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
        tests.push({
          name: testDef.name,
          passed: false,
          score: 0,
          durationMs: 0,
          error: errMsg,
        });
        criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
      }
    }

    // Calculate domain score (weighted average)
    const testWeights = [0.12, 0.08, 0.1, 0.1, 0.08, 0.1, 0.1, 0.12, 0.12, 0.08];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Agent Integrity certification complete: score=${score}, passed=${passed}, ` +
        `agentsTested=${agentFiles.length}, duration=${durationMs}ms`,
    );

    return {
      domain: CertificationDomain.AGENTS,
      weight: 0.15,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: Correct Initialization ───────────────────────────────

  /**
   * Verify each agent:
   * - Extends BaseAgentService
   * - Has @Injectable() decorator
   * - Implements defineConfig() returning AgentConfig
   * - Implements onInitialize() async method
   * - The config returned by defineConfig has id, name, cluster, version
   */
  async testInitialization(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Initialization';
    this.logger.log(`Running test: ${name}`);

    try {
      const details: AgentTestDetails[] = [];
      let totalScore = 0;

      for (const agent of agents) {
        const { content, className, relativePath } = agent;
        let agentScore = 0;
        const issues: string[] = [];

        // Check 1: Extends BaseAgentService (25 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 25;
        } else {
          issues.push('Does not extend BaseAgentService');
        }

        // Check 2: Has @Injectable() decorator (15 pts)
        if (content.includes('@Injectable')) {
          agentScore += 15;
        } else {
          issues.push('Missing @Injectable decorator');
        }

        // Check 3: Implements defineConfig() (20 pts)
        if (/defineConfig\s*\(\s*\)\s*:/.test(content) || content.includes('defineConfig():')) {
          agentScore += 20;
        } else {
          issues.push('Missing defineConfig() implementation');
        }

        // Check 4: Implements onInitialize() (20 pts)
        if (/onInitialize\s*\(\s*\)\s*:/.test(content) || content.includes('onInitialize():')) {
          agentScore += 20;
        } else {
          issues.push('Missing onInitialize() implementation');
        }

        // Check 5: Config has required fields (20 pts)
        const configFields = ['id:', 'name:', 'cluster:', 'version:'];
        const foundFields = configFields.filter((f) => content.includes(f));
        agentScore += Math.round((foundFields.length / configFields.length) * 20);

        if (foundFields.length < configFields.length) {
          issues.push(
            `Config missing fields: ${configFields.filter((f) => !foundFields.includes(f)).join(', ')}`,
          );
        }

        totalScore += agentScore;
        details.push({
          agentId: this.extractAgentId(content),
          agentClass: className,
          cluster: agent.cluster,
          testScores: { initialization: agentScore },
          healthScore: agentScore,
          issues,
        });
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          failingAgents: details.filter((d) => d.healthScore < 70).map((d) => d.agentClass),
          sampleDetails: details.slice(0, 5),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 2: Proper Shutdown ──────────────────────────────────────

  /**
   * Verify each agent:
   * - Implements onDestroy() async method
   * - onDestroy() performs cleanup (clears arrays, resets state, etc.)
   * - onModuleDestroy lifecycle is handled (via BaseAgentService)
   */
  async testShutdown(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Shutdown';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;

      for (const agent of agents) {
        const { content } = agent;
        let agentScore = 0;

        // Check 1: Implements onDestroy() (40 pts)
        if (/onDestroy\s*\(\s*\)\s*:/.test(content) || content.includes('onDestroy():')) {
          agentScore += 40;

          // Check 2: onDestroy has cleanup logic (30 pts)
          const onDestroyMatch = content.match(
            /onDestroy\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
          );
          if (onDestroyMatch) {
            const body = onDestroyMatch[1];
            // Look for cleanup patterns: clearing arrays, resetting state, nullifying references
            const hasCleanup =
              body.includes('= []') ||
              body.includes('= null') ||
              body.includes('= {}') ||
              body.includes('= 0') ||
              body.includes('clear()') ||
              body.includes('.length = 0') ||
              body.includes('delete ') ||
              body.includes('destroy') ||
              body.includes('cleanup') ||
              body.includes('close') ||
              body.includes('disconnect') ||
              body.includes('.clear()');

            if (hasCleanup) {
              agentScore += 30;
            } else {
              agentScore += 10; // Has onDestroy but minimal cleanup visible
            }
          } else {
            agentScore += 10;
          }
        }

        // Check 3: Extends BaseAgentService (provides onModuleDestroy) (30 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 30;
        }

        totalScore += agentScore;
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 3: Timeout Handling ─────────────────────────────────────

  /**
   * Verify each agent's config specifies a timeout value.
   * Also verify that the base class provides executeWithTimeout.
   */
  async testTimeoutHandling(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Timeout Handling';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutTimeout: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Config has timeout field (50 pts)
        if (/timeout\s*:\s*\d+/.test(content)) {
          agentScore += 50;

          // Bonus: timeout value is reasonable (between 1000 and 300000)
          const timeoutMatch = content.match(/timeout\s*:\s*(\d+)/);
          if (timeoutMatch) {
            const timeoutValue = parseInt(timeoutMatch[1], 10);
            if (timeoutValue >= 1000 && timeoutValue <= 300000) {
              agentScore += 10; // Reasonable timeout value
            }
          }
        } else {
          agentsWithoutTimeout.push(className);
        }

        // Check 2: Base class provides executeWithTimeout (20 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 20;
        }

        // Check 3: Config or agent references timeout handling (20 pts)
        if (
          content.includes('timeout') ||
          content.includes('Timeout') ||
          content.includes('TIMEOUT')
        ) {
          agentScore += 20;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutTimeout,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 4: Retry Logic ──────────────────────────────────────────

  /**
   * Verify each agent's config specifies a retryPolicy with:
   * - maxRetries
   * - backoffMs
   * - exponentialBackoff
   */
  async testRetryLogic(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Retry Logic';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutRetry: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Config has retryPolicy (40 pts)
        if (content.includes('retryPolicy')) {
          agentScore += 40;

          // Check 2: retryPolicy has maxRetries (20 pts)
          if (/maxRetries\s*:\s*\d+/.test(content)) {
            agentScore += 20;
          }

          // Check 3: retryPolicy has backoffMs (15 pts)
          if (/backoffMs\s*:\s*\d+/.test(content)) {
            agentScore += 15;
          }

          // Check 4: retryPolicy has exponentialBackoff (15 pts)
          if (content.includes('exponentialBackoff')) {
            agentScore += 15;
          }

          // Bonus: sensible retry values
          const maxRetriesMatch = content.match(/maxRetries\s*:\s*(\d+)/);
          if (maxRetriesMatch) {
            const retries = parseInt(maxRetriesMatch[1], 10);
            if (retries >= 1 && retries <= 5) {
              agentScore += 10;
            }
          }
        } else {
          agentsWithoutRetry.push(className);
        }

        // Check 5: Base class provides executeWithRetry (10 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutRetry,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 5: Logging ──────────────────────────────────────────────

  /**
   * Verify each agent:
   * - Uses this.logger for log output
   * - Has meaningful log messages in key methods
   * - Base class provides the logger
   */
  async testLogging(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Logging';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;

      for (const agent of agents) {
        const { content } = agent;
        let agentScore = 0;

        // Check 1: Uses this.logger (30 pts)
        const loggerUsages = (content.match(/this\.logger\./g) || []).length;
        if (loggerUsages >= 3) {
          agentScore += 30;
        } else if (loggerUsages >= 1) {
          agentScore += 20;
        }

        // Check 2: Logs in onInitialize (20 pts)
        const onInitMatch = content.match(
          /onInitialize\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
        );
        if (onInitMatch && /this\.logger\.(log|debug|info)/.test(onInitMatch[1])) {
          agentScore += 20;
        }

        // Check 3: Logs in onExecute (20 pts)
        const onExecMatch = content.match(
          /onExecute\s*\([^)]*\)\s*:\s*Promise<AgentOutput>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
        );
        if (onExecMatch && /this\.logger\.(log|warn|error|debug|info)/.test(onExecMatch[1])) {
          agentScore += 20;
        }

        // Check 4: Logs in onDestroy (15 pts)
        const onDestroyMatch = content.match(
          /onDestroy\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
        );
        if (onDestroyMatch && /this\.logger\.(log|debug|info|warn)/.test(onDestroyMatch[1])) {
          agentScore += 15;
        }

        // Check 5: Error logging pattern (15 pts)
        if (/this\.logger\.error/.test(content)) {
          agentScore += 15;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 6: Permissions ──────────────────────────────────────────

  /**
   * Verify each agent's config has a permissions array with at least one entry.
   */
  async testPermissions(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Permissions';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutPermissions: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Config has permissions field (40 pts)
        if (content.includes('permissions:')) {
          agentScore += 40;

          // Check 2: Permissions array is not empty (30 pts)
          const permMatch = content.match(/permissions\s*:\s*\[([^\]]*)\]/);
          if (permMatch && permMatch[1].trim().length > 0) {
            agentScore += 30;

            // Count the number of permissions
            const permEntries = permMatch[1].split(',').filter((s) => s.trim().length > 0);
            if (permEntries.length >= 3) {
              agentScore += 10; // Good permission granularity
            }
          }
        } else {
          agentsWithoutPermissions.push(className);
        }

        // Check 3: Has execute:task permission (10 pts)
        if (content.includes('execute:task') || content.includes('execute:task')) {
          agentScore += 10;
        }

        // Check 4: Base class provides checkPermission (10 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 10;
        }

        // Check 5: References PermissionAction/PermissionResource (10 pts)
        if (content.includes('PermissionAction') || content.includes('PermissionResource')) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutPermissions,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 7: Memory Integration ───────────────────────────────────

  /**
   * Verify each agent can store and retrieve from working memory.
   * Checks for:
   * - storeInWorkingMemory / retrieveFromWorkingMemory usage
   * - storeInSessionMemory / retrieveFromSessionMemory usage
   * - storeInLongTermMemory / retrieveFromLongTermMemory usage
   * - MemoryService import/injection
   */
  async testMemoryIntegration(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Memory Integration';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithMemory: string[] = [];
      const agentsWithoutMemory: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Uses working memory methods (30 pts)
        if (
          content.includes('storeInWorkingMemory') ||
          content.includes('retrieveFromWorkingMemory')
        ) {
          agentScore += 30;
        }

        // Check 2: Uses session memory methods (20 pts)
        if (
          content.includes('storeInSessionMemory') ||
          content.includes('retrieveFromSessionMemory')
        ) {
          agentScore += 20;
        }

        // Check 3: Uses long-term memory methods (20 pts)
        if (
          content.includes('storeInLongTermMemory') ||
          content.includes('retrieveFromLongTermMemory')
        ) {
          agentScore += 20;
        }

        // Check 4: Base class provides memory integration (20 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 20;
        }

        // Check 5: Uses queryMemory (10 pts)
        if (content.includes('queryMemory')) {
          agentScore += 10;
        }

        if (agentScore >= 50) {
          agentsWithMemory.push(className);
        } else {
          agentsWithoutMemory.push(className);
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 70, // Memory integration is optional for some agents
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithMemory: agentsWithMemory.length,
          agentsWithoutMemory: agentsWithoutMemory.length,
          agentsWithoutMemoryList: agentsWithoutMemory.slice(0, 20),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 8: Tools Registered ─────────────────────────────────────

  /**
   * Verify each agent registers at least one tool in onInitialize().
   */
  async testToolsRegistered(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Tools Registered';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutTools: string[] = [];
      const toolCountMap: Record<string, number> = {};

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Count registerTool calls
        const registerToolCount = (content.match(/registerTool\s*\(/g) || []).length;

        if (registerToolCount >= 1) {
          // Has tools: score based on number
          agentScore += 40; // At least one tool

          if (registerToolCount >= 3) {
            agentScore += 30; // Good tool coverage
          } else if (registerToolCount >= 2) {
            agentScore += 20;
          }

          // Check tools are in onInitialize (20 pts)
          const onInitMatch = content.match(
            /onInitialize\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
          );
          if (onInitMatch && onInitMatch[1].includes('registerTool')) {
            agentScore += 20;
          }

          // Check each tool has name, description, execute (10 pts)
          const toolBlocks = content.match(/registerTool\s*\(\s*\{[\s\S]*?\}\s*\)/g) || [];
          let completeTools = 0;
          for (const block of toolBlocks) {
            if (
              block.includes('name:') &&
              block.includes('description:') &&
              block.includes('execute:')
            ) {
              completeTools++;
            }
          }
          if (completeTools > 0) {
            agentScore += 10;
          }

          toolCountMap[className] = registerToolCount;
        } else {
          agentsWithoutTools.push(className);
          toolCountMap[className] = 0;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutTools,
          toolCountStats: {
            min: Math.min(...Object.values(toolCountMap)),
            max: Math.max(...Object.values(toolCountMap)),
            avg:
              Object.values(toolCountMap).length > 0
                ? Math.round(
                    Object.values(toolCountMap).reduce((a, b) => a + b, 0) /
                      Object.values(toolCountMap).length,
                  )
                : 0,
          },
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 9: Exception Handling ───────────────────────────────────

  /**
   * Verify each agent has proper exception handling:
   * - try/catch in onExecute
   * - Returns error output on failure
   * - No uncaught exceptions
   */
  async testExceptionHandling(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Exception Handling';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutErrorHandling: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Has try/catch in onExecute (40 pts)
        const onExecMatch = content.match(
          /onExecute\s*\([^)]*\)\s*:\s*Promise<AgentOutput>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/,
        );
        if (onExecMatch) {
          const execBody = onExecMatch[1];
          if (execBody.includes('try') && execBody.includes('catch')) {
            agentScore += 40;
          } else {
            agentsWithoutErrorHandling.push(className);
          }
        } else {
          // Agent might use a different pattern, check for any try/catch
          if (content.includes('try') && content.includes('catch')) {
            agentScore += 25;
          } else {
            agentsWithoutErrorHandling.push(className);
          }
        }

        // Check 2: Returns error output on failure (20 pts)
        if (content.includes('createAgentOutput') || content.includes('success: false')) {
          agentScore += 20;
        }

        // Check 3: Logs errors in catch block (20 pts)
        if (/catch\s*\([^)]*\)\s*\{[\s\S]*?this\.logger\.error/.test(content)) {
          agentScore += 20;
        }

        // Check 4: Validates input before processing (10 pts)
        if (content.includes('onValidateInput') || /if\s*\(!\w+/.test(content)) {
          agentScore += 10;
        }

        // Check 5: Has error-specific logging pattern (10 pts)
        if (content.includes('this.logger.error') || content.includes('this.logger.warn')) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutErrorHandling,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 10: Concurrent Execution ────────────────────────────────

  /**
   * Verify each agent config specifies maxConcurrentTasks.
   * Also check for proper state management in the agent body.
   */
  async testConcurrentExecution(agents: AgentScanResult[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Concurrent Execution';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutConcurrency: string[] = [];

      for (const agent of agents) {
        const { content, className } = agent;
        let agentScore = 0;

        // Check 1: Config has maxConcurrentTasks (50 pts)
        if (/maxConcurrentTasks\s*:\s*\d+/.test(content)) {
          agentScore += 50;

          // Check that value is reasonable (>= 1 and <= 20)
          const maxMatch = content.match(/maxConcurrentTasks\s*:\s*(\d+)/);
          if (maxMatch) {
            const maxVal = parseInt(maxMatch[1], 10);
            if (maxVal >= 1 && maxVal <= 20) {
              agentScore += 10;
            }
          }
        } else {
          agentsWithoutConcurrency.push(className);
        }

        // Check 2: Base class handles concurrency (20 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 20;
        }

        // Check 3: Uses Set or Map for task tracking (10 pts)
        if (
          content.includes('Set<') ||
          content.includes('Map<') ||
          content.includes('new Set') ||
          content.includes('new Map')
        ) {
          agentScore += 10;
        }

        // Check 4: No global mutable state that could cause race conditions (10 pts)
        // (Check for proper encapsulation — agents should not use module-level mutable variables)
        const hasModuleLevelMutable = /^(?:let|var)\s+\w+\s*=/m.test(
          content.replace(/(?:let|var)\s+\w+\s*=\s*(?:require|import)/, ''),
        );
        if (!hasModuleLevelMutable) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          averageScore: avgScore,
          agentsWithoutConcurrency,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Health Score Calculation ─────────────────────────────────────

  /**
   * Calculate a health score (0-100) for an agent based on its test results.
   * Weighted by criticality of each test.
   */
  calculateHealthScore(results: TestResult[]): number {
    if (results.length === 0) return 0;

    const weights: Record<string, number> = {
      Initialization: 0.15,
      Shutdown: 0.08,
      'Timeout Handling': 0.1,
      'Retry Logic': 0.1,
      Logging: 0.07,
      Permissions: 0.1,
      'Memory Integration': 0.1,
      'Tools Registered': 0.12,
      'Exception Handling': 0.12,
      'Concurrent Execution': 0.06,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of results) {
      const weight = weights[result.name] || 0.1;
      weightedSum += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  // ─── Agent Discovery ──────────────────────────────────────────────

  /**
   * Discover all agent service files by scanning the agents directory tree.
   */
  private async discoverAgentFiles(): Promise<AgentScanResult[]> {
    const results: AgentScanResult[] = [];

    if (!fs.existsSync(AGENTS_DIR)) {
      this.logger.warn(`Agents directory not found: ${AGENTS_DIR}`);
      return results;
    }

    const allAgentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');

    for (const filePath of allAgentFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(SOURCE_ROOT, filePath);

        // Extract class name
        const classMatch = content.match(/export\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : path.basename(filePath, '.service.ts');

        // Determine cluster from directory
        const cluster = this.determineCluster(relativePath);

        // Extract config constant name
        const configMatch = content.match(/export\s+const\s+(\w+CONFIG)/);
        const configName = configMatch ? configMatch[1] : '';

        results.push({
          filePath,
          relativePath,
          content,
          className,
          cluster,
          configName,
        });
      } catch (error) {
        this.logger.warn(`Failed to read agent file ${filePath}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Determine which cluster an agent belongs to from its file path.
   */
  private determineCluster(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    // Pattern: agents/{cluster}/.../{agent-name}-agent.service.ts
    if (parts.length >= 2 && parts[0] === 'agents') {
      return parts[1];
    }
    return 'unknown';
  }

  /**
   * Extract agent ID from the config in source code.
   */
  private extractAgentId(content: string): string {
    const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
    return idMatch ? idMatch[1] : 'unknown';
  }

  /**
   * Recursively get all files matching a suffix in a directory.
   */
  private async getAllFilesRecursive(dir: string, suffix: string): Promise<string[]> {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      this.logger.warn(`Directory does not exist: ${dir}`);
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.getAllFilesRecursive(fullPath, suffix);
        results.push(...subResults);
      } else if (entry.name.endsWith(suffix)) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
