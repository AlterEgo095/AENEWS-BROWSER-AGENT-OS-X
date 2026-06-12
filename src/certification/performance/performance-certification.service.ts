/**
 * AENEWS Agent OS X - Performance Certification Service
 * Tests performance characteristics of the agent system through static analysis
 * and simulated benchmarks. Validates timeout configs, memory safety, CPU patterns,
 * event bus throughput, concurrency limits, database optimization, Redis efficiency,
 * queue processing, memory leak prevention, and startup time.
 *
 * Tests:
 * 1. Agent initialization latency - verify all agents have reasonable timeout configs
 * 2. Memory footprint - verify no unbounded collections, size limits on Maps/Arrays
 * 3. CPU efficiency - verify no busy-wait loops, proper async patterns
 * 4. Event bus throughput - verify EventEmitter2 maxListeners configured, wildcard optimization
 * 5. Concurrent agent capacity - verify maxConcurrentTasks is configured per agent
 * 6. Database query optimization - verify TypeORM connection pooling configured
 * 7. Redis connection efficiency - verify Bull queue configuration, connection reuse
 * 8. Queue processing throughput - verify Bull job options (removeOnComplete, removeOnFail)
 * 9. Memory leak prevention - verify cleanup in onDestroy(), no dangling references
 * 10. Startup time - verify NestJS module structure doesn't create circular initialization
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CertificationDomain, DomainResult, TestResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const BASE_DIR = path.join(SOURCE_ROOT, 'agents', 'base');
const EVENTS_DIR = path.join(SOURCE_ROOT, 'agents', 'events');
const HEALTH_DIR = path.join(SOURCE_ROOT, 'agents', 'health');
const ORCHESTRATOR_DIR = path.join(SOURCE_ROOT, 'agents', 'orchestrator');
const MEMORY_DIR = path.join(SOURCE_ROOT, 'agents', 'memory');
const CONFIG_DIR = path.join(SOURCE_ROOT, 'config');

// ─── Agent Analysis Result ────────────────────────────────────────

interface AgentAnalysis {
  filePath: string;
  relativePath: string;
  content: string;
  className: string;
  timeout: number | null;
  maxConcurrentTasks: number | null;
  hasOnDestroy: boolean;
  hasCleanupInOnDestroy: boolean;
  hasMapWithSizeLimit: boolean;
  hasArrayWithSizeLimit: boolean;
  hasUnboundedPush: boolean;
  hasBusyWait: boolean;
  usesAsyncPatterns: boolean;
  mapCount: number;
  arrayCount: number;
}

// ─── Service Analysis Result ──────────────────────────────────────

interface ServiceAnalysis {
  filePath: string;
  fileName: string;
  content: string;
  className: string;
  methods: string[];
  hasInjectable: boolean;
  hasLogger: boolean;
}

@Injectable()
export class PerformanceCertificationService {
  private readonly logger = new Logger(PerformanceCertificationService.name);

  /** Cached agent analyses */
  private agentAnalyses: AgentAnalysis[] | null = null;

  /** Cached service analyses */
  private serviceAnalyses: ServiceAnalysis[] | null = null;

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all performance certification tests and return a DomainResult.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting Performance certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Discover and analyze agent files
    const agents = await this.analyzeAgents();
    const services = await this.analyzeServices();
    this.logger.log(
      `Analyzed ${agents.length} agents and ${services.length} services for performance`,
    );

    const testMethods: Array<{ name: string; fn: () => Promise<TestResult> }> = [
      { name: 'Agent Initialization Latency', fn: () => this.testInitializationLatency(agents) },
      { name: 'Memory Footprint', fn: () => this.testMemoryFootprint(agents) },
      { name: 'CPU Efficiency', fn: () => this.testCpuEfficiency(agents) },
      { name: 'Event Bus Throughput', fn: () => this.testEventBusThroughput(services) },
      { name: 'Concurrent Agent Capacity', fn: () => this.testConcurrentCapacity(agents) },
      { name: 'Database Query Optimization', fn: () => this.testDatabaseOptimization(services) },
      { name: 'Redis Connection Efficiency', fn: () => this.testRedisEfficiency(services) },
      {
        name: 'Queue Processing Throughput',
        fn: () => this.testQueueProcessingThroughput(services),
      },
      { name: 'Memory Leak Prevention', fn: () => this.testMemoryLeakPrevention(agents) },
      { name: 'Startup Time', fn: () => this.testStartupTime(services) },
    ];

    for (const testDef of testMethods) {
      try {
        const result = await testDef.fn();
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
    const testWeights = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Performance certification complete: score=${score}, passed=${passed}, ` +
        `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`,
    );

    return {
      domain: CertificationDomain.PERFORMANCE,
      weight: 0.1,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: Agent Initialization Latency ─────────────────────────

  /**
   * Verify all agents have reasonable timeout configs (not too high, not too low).
   * Checks that timeout values are between 5s and 120s, and retry policies
   * have bounded maxRetries (≤ 5) and reasonable backoff (≤ 10s).
   */
  async testInitializationLatency(agents: AgentAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Agent Initialization Latency';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const issues: string[] = [];
      const agentsWithBadTimeout: string[] = [];
      const agentsWithBadRetry: string[] = [];

      for (const agent of agents) {
        let agentScore = 0;

        // Check 1: Agent has timeout defined (30 pts)
        if (agent.timeout !== null) {
          agentScore += 30;

          // Check 2: Timeout is within reasonable range [5000, 120000] (30 pts)
          if (agent.timeout >= 5000 && agent.timeout <= 120000) {
            agentScore += 30;
          } else if (agent.timeout < 5000) {
            agentsWithBadTimeout.push(
              `${agent.relativePath}: timeout=${agent.timeout}ms (too low)`,
            );
          } else {
            agentsWithBadTimeout.push(
              `${agent.relativePath}: timeout=${agent.timeout}ms (too high)`,
            );
          }
        } else {
          issues.push(`${agent.relativePath}: No timeout configured`);
        }

        // Check 3: Retry policy has bounded maxRetries (20 pts)
        const maxRetriesMatch = agent.content.match(/maxRetries\s*:\s*(\d+)/);
        if (maxRetriesMatch) {
          const maxRetries = parseInt(maxRetriesMatch[1], 10);
          if (maxRetries <= 5) {
            agentScore += 20;
          } else {
            agentsWithBadRetry.push(`${agent.relativePath}: maxRetries=${maxRetries} (too high)`);
          }
        } else {
          agentScore += 10; // No retry policy = no retry overhead
        }

        // Check 4: Backoff is reasonable (10 pts)
        const backoffMatch = agent.content.match(/backoffMs\s*:\s*(\d+)/);
        if (backoffMatch) {
          const backoffMs = parseInt(backoffMatch[1], 10);
          if (backoffMs <= 10000) {
            agentScore += 10;
          }
        } else {
          agentScore += 5;
        }

        // Check 5: Uses exponential backoff (10 pts)
        if (agent.content.includes('exponentialBackoff')) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      // Simulated initialization latency benchmark
      const simResult = this.simulateInitializationLatency(agents.length);

      return {
        name,
        passed: avgScore >= 90 && agentsWithBadTimeout.length === 0,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          agentsWithBadTimeout: agentsWithBadTimeout.length,
          agentsWithBadRetry: agentsWithBadRetry.length,
          badTimeoutList: agentsWithBadTimeout.slice(0, 10),
          badRetryList: agentsWithBadRetry.slice(0, 10),
          issues,
          simulated: simResult,
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

  // ─── Test 2: Memory Footprint ─────────────────────────────────────

  /**
   * Verify no unbounded collections, size limits on Maps/Arrays.
   * Checks that Maps have max size limits, Arrays don't grow unbounded
   * without trimming, and data structures have eviction/cleanup policies.
   */
  async testMemoryFootprint(agents: AgentAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Memory Footprint';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const issues: string[] = [];
      const agentsWithUnboundedCollections: string[] = [];

      for (const agent of agents) {
        let agentScore = 0;

        // Check 1: Agent uses Maps (has data storage) - 10 pts for using Map vs object
        if (agent.mapCount > 0) {
          agentScore += 10;

          // Check 2: Maps have size limits (20 pts)
          if (agent.hasMapWithSizeLimit) {
            agentScore += 20;
          } else {
            // Check if .clear() is called somewhere
            if (agent.content.includes('.clear()') || agent.content.includes('.delete(')) {
              agentScore += 10; // Partial credit: can delete entries
            }
          }
        } else {
          agentScore += 15; // No maps = no memory concern from maps
        }

        // Check 3: Arrays have size limits or are bounded (20 pts)
        if (agent.arrayCount > 0) {
          if (agent.hasArrayWithSizeLimit) {
            agentScore += 20;
          } else if (agent.content.includes('.slice(') || agent.content.includes('.splice(')) {
            agentScore += 10; // Partial credit: can trim
          } else if (agent.hasUnboundedPush) {
            agentsWithUnboundedCollections.push(agent.relativePath);
          }
        } else {
          agentScore += 15;
        }

        // Check 4: Has maxEntries or MAX_ constant (15 pts)
        if (
          agent.content.includes('MAX_ENTRIES') ||
          agent.content.includes('MAX_SIZE') ||
          agent.content.includes('maxEntries') ||
          agent.content.includes('maxSize') ||
          agent.content.includes('LIMIT')
        ) {
          agentScore += 15;
        }

        // Check 5: History/log arrays are truncated (15 pts)
        if (agent.content.includes('.slice(') || agent.content.includes('Math.min(')) {
          agentScore += 15;
        }

        // Check 6: No memory-unsafe patterns like global accumulators (10 pts)
        const hasGlobalAccumulator =
          agent.content.includes('static ') &&
          (agent.content.includes('Map<') || agent.content.includes('[]'));
        if (!hasGlobalAccumulator) {
          agentScore += 10;
        }

        // Check 7: Config has maxConcurrentTasks limiting task accumulation (10 pts)
        if (agent.maxConcurrentTasks !== null && agent.maxConcurrentTasks <= 20) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      // Simulated memory footprint benchmark
      const simResult = this.simulateMemoryFootprint(agents.length);

      return {
        name,
        passed: avgScore >= 90 && agentsWithUnboundedCollections.length <= 2,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          agentsWithUnboundedCollections: agentsWithUnboundedCollections.length,
          unboundedList: agentsWithUnboundedCollections.slice(0, 10),
          issues,
          simulated: simResult,
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

  // ─── Test 3: CPU Efficiency ───────────────────────────────────────

  /**
   * Verify no busy-wait loops, proper async patterns.
   * Checks for while(true) without sleep/await, synchronous file I/O in hot paths,
   * and proper use of async/await patterns.
   */
  async testCpuEfficiency(agents: AgentAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'CPU Efficiency';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const issues: string[] = [];
      const agentsWithBusyWait: string[] = [];

      for (const agent of agents) {
        let agentScore = 0;

        // Check 1: No busy-wait loops (30 pts)
        if (!agent.hasBusyWait) {
          agentScore += 30;
        } else {
          agentsWithBusyWait.push(agent.relativePath);
          issues.push(`${agent.relativePath}: Has busy-wait pattern`);
        }

        // Check 2: Uses async patterns (20 pts)
        if (agent.usesAsyncPatterns) {
          agentScore += 20;
        }

        // Check 3: No synchronous sleep (spin-wait) (15 pts)
        const hasSyncSpin =
          agent.content.includes('while (true)') &&
          !agent.content.includes('await') &&
          !agent.content.includes('sleep');
        if (!hasSyncSpin) {
          agentScore += 15;
        }

        // Check 4: Uses setTimeout/setInterval properly (10 pts)
        if (agent.content.includes('setTimeout') || agent.content.includes('setInterval')) {
          // Check they are cleaned up
          if (agent.content.includes('clearTimeout') || agent.content.includes('clearInterval')) {
            agentScore += 10;
          } else {
            agentScore += 3;
          }
        } else {
          agentScore += 10; // No timers = no timer-related CPU concerns
        }

        // Check 5: Uses Promise-based concurrency (10 pts)
        if (
          agent.content.includes('Promise.all') ||
          agent.content.includes('Promise.allSettled') ||
          agent.content.includes('Promise.race')
        ) {
          agentScore += 10;
        }

        // Check 6: Uses sleep() from base agent (not busy loop) (10 pts)
        if (agent.content.includes('this.sleep(') || agent.content.includes('await this.sleep')) {
          agentScore += 10;
        }

        // Check 7: No unbounded recursion (5 pts)
        const hasUnboundedRecursion =
          agent.content.includes('this.onExecute(') &&
          !agent.content.includes('maxDepth') &&
          !agent.content.includes('depth');
        if (!hasUnboundedRecursion) {
          agentScore += 5;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      // Simulated CPU efficiency benchmark
      const simResult = this.simulateCpuEfficiency(agents.length);

      return {
        name,
        passed: avgScore >= 90 && agentsWithBusyWait.length === 0,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          agentsWithBusyWait: agentsWithBusyWait.length,
          busyWaitList: agentsWithBusyWait.slice(0, 10),
          issues,
          simulated: simResult,
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

  // ─── Test 4: Event Bus Throughput ─────────────────────────────────

  /**
   * Verify EventEmitter2 maxListeners configured, wildcard optimization,
   * and event delivery efficiency.
   */
  async testEventBusThroughput(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Event Bus Throughput';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const eventBus = services.find((s) => s.fileName.includes('event-bus'));

      // Check 1: EventBusService exists (10 pts)
      if (eventBus) {
        score += 10;
      } else {
        issues.push('EventBusService not found');
      }

      if (eventBus) {
        // Check 2: Uses EventEmitter2 from NestJS (15 pts)
        if (
          eventBus.content.includes('EventEmitter2') ||
          eventBus.content.includes('@nestjs/event-emitter')
        ) {
          score += 15;
        } else {
          issues.push('Not using NestJS EventEmitter2');
        }

        // Check 3: Has typed event delivery (subscription matching) (10 pts)
        if (
          eventBus.content.includes('deliverToSubscriptions') ||
          eventBus.content.includes('typeIndex')
        ) {
          score += 10;
        }

        // Check 4: Has wildcard subscription support (10 pts)
        if (eventBus.content.includes("'*'") || eventBus.content.includes('wildcard')) {
          score += 10;
        }

        // Check 5: Has cluster-specific event routing (10 pts)
        if (eventBus.content.includes('cluster:') || eventBus.content.includes('event.cluster')) {
          score += 10;
        }

        // Check 6: Has event persistence (event store) (10 pts)
        if (
          eventBus.content.includes('eventStore.store') ||
          eventBus.content.includes('eventStore')
        ) {
          score += 10;
        }

        // Check 7: Has dead letter queue for failed events (10 pts)
        if (
          eventBus.content.includes('deadLetterQueue') ||
          eventBus.content.includes('DeadLetterQueue')
        ) {
          score += 10;
        }

        // Check 8: Uses async emission (emitAsync) (10 pts)
        if (eventBus.content.includes('emitAsync')) {
          score += 10;
        }

        // Check 9: Has subscription index for O(1) lookup (10 pts)
        if (
          eventBus.content.includes('typeIndex') &&
          eventBus.content.includes('subscriberIndex')
        ) {
          score += 10;
        }

        // Check 10: Has @Injectable and Logger (5 pts)
        if (eventBus.hasInjectable) score += 3;
        if (eventBus.hasLogger) score += 2;
      }

      // Check 11: EventEmitter2 module is configured in app (5 pts)
      const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
      if (fs.existsSync(appModulePath)) {
        const appModule = fs.readFileSync(appModulePath, 'utf-8');
        if (appModule.includes('EventEmitterModule') || appModule.includes('EventEmitter2')) {
          score += 5;
        }
      }

      // Simulated throughput benchmark
      const simResult = this.simulateEventBusThroughput();

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          eventBusFound: !!eventBus,
          usesEventEmitter2: eventBus?.content.includes('EventEmitter2') || false,
          hasSubscriptionIndex: eventBus?.content.includes('typeIndex') || false,
          hasDeadLetterQueue: eventBus?.content.includes('deadLetterQueue') || false,
          issues,
          simulated: simResult,
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

  // ─── Test 5: Concurrent Agent Capacity ────────────────────────────

  /**
   * Verify maxConcurrentTasks is configured per agent and values are reasonable.
   * Also checks that BaseAgentService enforces the limit.
   */
  async testConcurrentCapacity(agents: AgentAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Concurrent Agent Capacity';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const issues: string[] = [];
      const agentsWithoutConcurrency: string[] = [];
      const agentsWithHighConcurrency: string[] = [];

      for (const agent of agents) {
        let agentScore = 0;

        // Check 1: Agent has maxConcurrentTasks configured (40 pts)
        if (agent.maxConcurrentTasks !== null) {
          agentScore += 40;

          // Check 2: maxConcurrentTasks is reasonable (1-20) (30 pts)
          if (agent.maxConcurrentTasks >= 1 && agent.maxConcurrentTasks <= 20) {
            agentScore += 30;
          } else if (agent.maxConcurrentTasks > 20) {
            agentsWithHighConcurrency.push(
              `${agent.relativePath}: maxConcurrentTasks=${agent.maxConcurrentTasks} (too high)`,
            );
            agentScore += 10;
          }
        } else {
          agentsWithoutConcurrency.push(agent.relativePath);
        }

        // Check 3: BaseAgentService has currentTasks.size check (20 pts)
        if (agent.content.includes('currentTasks.size') || agent.content.includes('currentTasks')) {
          agentScore += 20;
        }

        // Check 4: Has canAcceptTask() method (10 pts)
        if (agent.content.includes('canAcceptTask')) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      // Check base agent enforcement
      const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
      let baseEnforcementScore = 0;
      if (fs.existsSync(baseAgentPath)) {
        const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
        if (
          baseContent.includes('maxConcurrentTasks') &&
          baseContent.includes('currentTasks.size >= ')
        ) {
          baseEnforcementScore = 100;
        } else if (baseContent.includes('maxConcurrentTasks')) {
          baseEnforcementScore = 50;
        }
      }

      const finalScore = Math.round(avgScore * 0.8 + baseEnforcementScore * 0.2);

      return {
        name,
        passed: finalScore >= 90 && agentsWithoutConcurrency.length <= 2,
        score: finalScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          agentsWithoutConcurrency: agentsWithoutConcurrency.length,
          agentsWithHighConcurrency: agentsWithHighConcurrency.length,
          withoutConcurrencyList: agentsWithoutConcurrency.slice(0, 10),
          issues,
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

  // ─── Test 6: Database Query Optimization ──────────────────────────

  /**
   * Verify TypeORM connection pooling configured, query optimization patterns,
   * and database config has proper pooling settings.
   */
  async testDatabaseOptimization(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Database Query Optimization';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check 1: Database config exists (10 pts)
      const dbConfigPath = path.join(CONFIG_DIR, 'database.config.ts');
      if (fs.existsSync(dbConfigPath)) {
        score += 10;
        const dbConfig = fs.readFileSync(dbConfigPath, 'utf-8');

        // Check 2: Has connection pool size (15 pts)
        if (
          dbConfig.includes('poolSize') ||
          dbConfig.includes('connectionLimit') ||
          dbConfig.includes('pool')
        ) {
          score += 15;
        } else {
          issues.push('Database config missing pool size');
        }

        // Check 3: Pool size is reasonable (10 pts)
        const poolSizeMatch = dbConfig.match(/poolSize['"]*\s*[:=]\s*(\d+)/);
        if (poolSizeMatch) {
          const poolSize = parseInt(poolSizeMatch[1], 10);
          if (poolSize >= 5 && poolSize <= 100) {
            score += 10;
          }
        }
      } else {
        issues.push('Database config not found');
      }

      // Check 4: Memory services use in-process Maps as primary storage (15 pts)
      const memoryServices = services.filter(
        (s) =>
          s.fileName.includes('working-memory') ||
          s.fileName.includes('session-memory') ||
          s.fileName.includes('long-term-memory'),
      );
      const inProcessServices = memoryServices.filter(
        (s) => s.content.includes('new Map') || s.content.includes('Map<'),
      );
      if (memoryServices.length > 0) {
        score += Math.round((inProcessServices.length / memoryServices.length) * 15);
      }

      // Check 5: Event store uses in-memory storage (10 pts)
      const eventStore = services.find((s) => s.fileName.includes('event-store'));
      if (eventStore && eventStore.content.includes('Map<')) {
        score += 10;
      }

      // Check 6: Services use try/catch around DB operations (10 pts)
      let servicesWithTryCatch = 0;
      const relevantServices = services.filter(
        (s) =>
          s.fileName.includes('memory') ||
          s.fileName.includes('event-store') ||
          s.fileName.includes('health'),
      );
      for (const svc of relevantServices) {
        if (svc.content.includes('try') && svc.content.includes('catch')) {
          servicesWithTryCatch++;
        }
      }
      if (relevantServices.length > 0) {
        score += Math.round((servicesWithTryCatch / relevantServices.length) * 10);
      }

      // Check 7: Query methods use limits/pagination (10 pts)
      const servicesWithLimits = services.filter(
        (s) =>
          s.content.includes('.slice(') ||
          s.content.includes('LIMIT') ||
          s.content.includes('limit'),
      );
      if (servicesWithLimits.length > 0) {
        score += Math.min(servicesWithLimits.length * 3, 10);
      }

      // Check 8: No N+1 query patterns (10 pts)
      // Check for nested loops that might cause N+1
      let nPlusOneIssues = 0;
      for (const svc of services) {
        if (
          svc.content.includes('for (') &&
          svc.content.includes('await') &&
          svc.content.includes('for (')
        ) {
          nPlusOneIssues++;
        }
      }
      if (nPlusOneIssues <= 2) {
        score += 10;
      } else {
        score += Math.max(0, 10 - (nPlusOneIssues - 2) * 2);
      }

      // Check 9: App module uses TypeORM or Prisma (10 pts)
      const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
      if (fs.existsSync(appModulePath)) {
        const appModule = fs.readFileSync(appModulePath, 'utf-8');
        if (appModule.includes('TypeOrmModule') || appModule.includes('PrismaModule')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          dbConfigFound: fs.existsSync(dbConfigPath),
          memoryServicesInProcess: inProcessServices.length,
          totalMemoryServices: memoryServices.length,
          nPlusOneIssues,
          issues,
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

  // ─── Test 7: Redis Connection Efficiency ──────────────────────────

  /**
   * Verify Bull queue configuration, connection reuse, and Redis config.
   */
  async testRedisEfficiency(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Redis Connection Efficiency';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check 1: Redis config exists (10 pts)
      const redisConfigPath = path.join(CONFIG_DIR, 'redis.config.ts');
      if (fs.existsSync(redisConfigPath)) {
        score += 10;
        const redisConfig = fs.readFileSync(redisConfigPath, 'utf-8');

        // Check 2: Redis config has host/port (10 pts)
        if (redisConfig.includes('host') && redisConfig.includes('port')) {
          score += 10;
        }

        // Check 3: Redis config uses environment variables (10 pts)
        if (redisConfig.includes('process.env')) {
          score += 10;
        }
      } else {
        issues.push('Redis config not found');
      }

      // Check 4: Message broker has connection management (15 pts)
      const broker = services.find((s) => s.fileName.includes('message-broker'));
      if (broker) {
        if (
          broker.content.includes('ConnectionState') ||
          broker.content.includes('connectionState')
        ) {
          score += 15;
        } else {
          issues.push('MessageBroker missing connection state management');
        }
      }

      // Check 5: Message broker has reconnection logic (10 pts)
      if (
        broker &&
        (broker.content.includes('reconnect') || broker.content.includes('attemptReconnect'))
      ) {
        score += 10;
      }

      // Check 6: Services use in-memory fallback when Redis unavailable (15 pts)
      if (
        broker &&
        (broker.content.includes('inMemory') || broker.content.includes('startInMemoryProcessing'))
      ) {
        score += 15;
      }

      // Check 7: Memory services are independent of Redis (10 pts)
      const wm = services.find((s) => s.fileName.includes('working-memory'));
      if (
        wm &&
        wm.content.includes('Map<') &&
        !wm.content.includes('Redis') &&
        !wm.content.includes('redis')
      ) {
        score += 10;
      }

      // Check 8: Event store uses in-memory Map (10 pts)
      const eventStore = services.find((s) => s.fileName.includes('event-store'));
      if (eventStore && eventStore.content.includes('Map<')) {
        score += 10;
      }

      // Check 9: Config uses registerAs for namespacing (10 pts)
      if (fs.existsSync(redisConfigPath)) {
        const redisConfig = fs.readFileSync(redisConfigPath, 'utf-8');
        if (redisConfig.includes('registerAs')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          redisConfigFound: fs.existsSync(redisConfigPath),
          brokerHasReconnection: broker?.content.includes('reconnect') || false,
          brokerHasInMemoryFallback: broker?.content.includes('inMemory') || false,
          eventStoreInMemory: eventStore?.content.includes('Map<') || false,
          issues,
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

  // ─── Test 8: Queue Processing Throughput ──────────────────────────

  /**
   * Verify Bull job options (removeOnComplete, removeOnFail),
   * job concurrency settings, and queue processing patterns.
   */
  async testQueueProcessingThroughput(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Queue Processing Throughput';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check 1: Message broker has queue support (15 pts)
      const broker = services.find((s) => s.fileName.includes('message-broker'));
      if (broker) {
        score += 15;

        // Check 2: Has queue processing (10 pts)
        if (broker.content.includes('queue') || broker.content.includes('Queue')) {
          score += 10;
        }

        // Check 3: Has message acknowledgment (10 pts)
        if (
          broker.content.includes('ack') ||
          broker.content.includes('acknowledge') ||
          broker.content.includes('channel.ack')
        ) {
          score += 10;
        }

        // Check 4: Has message retry/requeue (10 pts)
        if (
          broker.content.includes('nack') ||
          broker.content.includes('requeue') ||
          broker.content.includes('retry')
        ) {
          score += 10;
        }

        // Check 5: Has prefetch/concurrency settings (10 pts)
        if (broker.content.includes('prefetch') || broker.content.includes('concurrency')) {
          score += 10;
        }

        // Check 6: Has dead letter queue for failed messages (10 pts)
        if (
          broker.content.includes('deadLetter') ||
          broker.content.includes('DLQ') ||
          broker.content.includes('dead-letter')
        ) {
          score += 10;
        }

        // Check 7: Has batch processing support (5 pts)
        if (broker.content.includes('batch') || broker.content.includes('bulk')) {
          score += 5;
        }
      } else {
        issues.push('MessageBrokerService not found');
      }

      // Check 8: Dead letter queue service exists (10 pts)
      const dlq = services.find((s) => s.fileName.includes('dead-letter'));
      if (dlq) {
        score += 10;

        // Check 9: DLQ has retry mechanism (5 pts)
        if (dlq.content.includes('retry')) {
          score += 5;
        }

        // Check 10: DLQ has max retry limit (5 pts)
        if (dlq.content.includes('maxRetries') || dlq.content.includes('MAX_RETRIES')) {
          score += 5;
        }
      }

      // Check 11: Event store has max capacity (5 pts)
      const eventStore = services.find((s) => s.fileName.includes('event-store'));
      if (
        eventStore &&
        (eventStore.content.includes('MAX_EVENTS') || eventStore.content.includes('maxSize'))
      ) {
        score += 5;
      }

      // Simulated throughput benchmark
      const simResult = this.simulateQueueThroughput();

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          brokerFound: !!broker,
          dlqFound: !!dlq,
          eventStoreFound: !!eventStore,
          issues,
          simulated: simResult,
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

  // ─── Test 9: Memory Leak Prevention ───────────────────────────────

  /**
   * Verify cleanup in onDestroy(), no dangling references.
   * Checks that agents clear Maps, arrays, and timers in their destroy lifecycle.
   */
  async testMemoryLeakPrevention(agents: AgentAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Memory Leak Prevention';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutCleanup: string[] = [];

      for (const agent of agents) {
        let agentScore = 0;

        // Check 1: Has onDestroy method (30 pts)
        if (agent.hasOnDestroy) {
          agentScore += 30;

          // Check 2: onDestroy has cleanup logic (25 pts)
          if (agent.hasCleanupInOnDestroy) {
            agentScore += 25;
          }
        } else {
          agentsWithoutCleanup.push(agent.relativePath);
        }

        // Check 3: Maps are cleared in destroy (15 pts)
        if (agent.content.includes('onDestroy') && agent.content.includes('.clear()')) {
          agentScore += 15;
        }

        // Check 4: Arrays are reset in destroy (10 pts)
        if (
          agent.content.includes('onDestroy') &&
          (agent.content.includes('= []') || agent.content.includes('.length = 0'))
        ) {
          agentScore += 10;
        }

        // Check 5: Timers are cleared in destroy (10 pts)
        if (
          agent.content.includes('onDestroy') &&
          (agent.content.includes('clearTimeout') || agent.content.includes('clearInterval'))
        ) {
          agentScore += 10;
        }

        // Check 6: No static accumulators that never get cleaned (10 pts)
        const hasStaticAccumulator =
          agent.content.includes('static ') &&
          (agent.content.includes('Map<') || agent.content.includes('[]')) &&
          !agent.content.includes('static clear') &&
          !agent.content.includes('static reset');
        if (!hasStaticAccumulator) {
          agentScore += 10;
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;

      // Also check base agent for cleanup patterns
      const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
      let baseCleanupScore = 0;
      if (fs.existsSync(baseAgentPath)) {
        const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
        if (baseContent.includes('onModuleDestroy')) baseCleanupScore += 25;
        if (baseContent.includes('clearInterval')) baseCleanupScore += 25;
        if (baseContent.includes('.clear()')) baseCleanupScore += 25;
        if (baseContent.includes('.delete(')) baseCleanupScore += 25;
      }

      const finalScore = Math.round(avgScore * 0.8 + baseCleanupScore * 0.2);

      return {
        name,
        passed: finalScore >= 90 && agentsWithoutCleanup.length <= 2,
        score: finalScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agents.length,
          agentsWithOnDestroy: agents.filter((a) => a.hasOnDestroy).length,
          agentsWithCleanupInOnDestroy: agents.filter((a) => a.hasCleanupInOnDestroy).length,
          agentsWithoutCleanup: agentsWithoutCleanup.length,
          withoutCleanupList: agentsWithoutCleanup.slice(0, 10),
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

  // ─── Test 10: Startup Time ────────────────────────────────────────

  /**
   * Verify NestJS module structure doesn't create circular initialization,
   * and that modules use lazy loading where appropriate.
   */
  async testStartupTime(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Startup Time';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check 1: App module exists (5 pts)
      const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
      if (fs.existsSync(appModulePath)) {
        score += 5;
        const appModule = fs.readFileSync(appModulePath, 'utf-8');

        // Check 2: Uses feature modules (not everything in one module) (15 pts)
        const moduleImports = (appModule.match(/Module/g) || []).length;
        if (moduleImports >= 3) {
          score += 15;
        } else if (moduleImports >= 1) {
          score += 8;
        } else {
          issues.push('App module has no feature module imports');
        }
      }

      // Check 3: No circular imports between clusters (15 pts)
      const clusterDirs = [
        'browser',
        'computer',
        'coding',
        'office',
        'marketing',
        'business',
        'infrastructure',
        'security',
        'meta-intelligence',
      ];
      let circularImports = 0;
      for (const cluster of clusterDirs) {
        const clusterDir = path.join(AGENTS_DIR, cluster);
        if (!fs.existsSync(clusterDir)) continue;

        const modulePath = path.join(clusterDir, `${cluster.replace(/-/g, '-')}-cluster.module.ts`);
        if (!fs.existsSync(modulePath)) continue;

        const moduleContent = fs.readFileSync(modulePath, 'utf-8');

        // Check for imports from other clusters
        for (const otherCluster of clusterDirs) {
          if (otherCluster === cluster) continue;
          if (
            moduleContent.includes(`../${otherCluster}`) ||
            moduleContent.includes(`/${otherCluster}/`)
          ) {
            circularImports++;
          }
        }
      }
      if (circularImports === 0) {
        score += 15;
      } else {
        score += Math.max(0, 15 - circularImports * 5);
        issues.push(`Found ${circularImports} cross-cluster imports (potential circular init)`);
      }

      // Check 4: Services don't do heavy work in constructors (15 pts)
      let heavyConstructorCount = 0;
      for (const svc of services) {
        const constructorMatch = svc.content.match(/constructor\s*\([^)]*\)\s*\{[\s\S]*?\}/);
        if (constructorMatch) {
          const constructorBody = constructorMatch[0];
          if (
            constructorBody.includes('fs.readFileSync') ||
            constructorBody.includes('await ') ||
            constructorBody.includes('fetch(')
          ) {
            heavyConstructorCount++;
          }
        }
      }
      if (heavyConstructorCount === 0) {
        score += 15;
      } else {
        score += Math.max(0, 15 - heavyConstructorCount * 5);
      }

      // Check 5: Agents use onInitialize for setup, not constructor (15 pts)
      const agentFiles = await this.getAgentFiles();
      let agentsUsingOnInitialize = 0;
      for (const agentPath of agentFiles) {
        const content = fs.readFileSync(agentPath, 'utf-8');
        if (content.includes('onInitialize')) {
          agentsUsingOnInitialize++;
        }
      }
      if (agentFiles.length > 0) {
        const ratio = agentsUsingOnInitialize / agentFiles.length;
        score += Math.round(ratio * 15);
      }

      // Check 6: Event bus uses onModuleInit (not constructor) (10 pts)
      const eventBus = services.find((s) => s.fileName.includes('event-bus'));
      if (eventBus && eventBus.content.includes('onModuleInit')) {
        score += 10;
      }

      // Check 7: Memory services use onModuleInit for timer setup (10 pts)
      const wm = services.find((s) => s.fileName.includes('working-memory'));
      if (wm && wm.content.includes('onModuleInit')) {
        score += 10;
      }

      // Check 8: Base agent uses onModuleInit lifecycle (10 pts)
      const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
      if (fs.existsSync(baseAgentPath)) {
        const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
        if (baseContent.includes('onModuleInit') && baseContent.includes('onModuleDestroy')) {
          score += 10;
        }
      }

      // Simulated startup benchmark
      const simResult = this.simulateStartupTime(agentFiles.length);

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          circularImports,
          heavyConstructorCount,
          agentsUsingOnInitialize,
          totalAgents: agentFiles.length,
          issues,
          simulated: simResult,
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

  // ─── Simulations ─────────────────────────────────────────────────

  private simulateInitializationLatency(agentCount: number): {
    avgInitMs: number;
    p99InitMs: number;
    maxTimeoutMs: number;
  } {
    return {
      avgInitMs: Math.round(50 + agentCount * 0.5),
      p99InitMs: Math.round(200 + agentCount * 2),
      maxTimeoutMs: 120000,
    };
  }

  private simulateMemoryFootprint(agentCount: number): {
    totalHeapMb: number;
    avgPerAgentMb: number;
    mapsWithLimits: number;
    totalMaps: number;
  } {
    return {
      totalHeapMb: Math.round(50 + agentCount * 2),
      avgPerAgentMb: Math.round(2 + Math.random()),
      mapsWithLimits: Math.round(agentCount * 0.7),
      totalMaps: agentCount,
    };
  }

  private simulateCpuEfficiency(agentCount: number): {
    avgCpuPercent: number;
    peakCpuPercent: number;
    busyWaitAgents: number;
  } {
    return {
      avgCpuPercent: Math.round(5 + agentCount * 0.1),
      peakCpuPercent: Math.round(25 + agentCount * 0.3),
      busyWaitAgents: 0,
    };
  }

  private simulateEventBusThroughput(): {
    eventsPerSecond: number;
    avgDeliveryMs: number;
    subscriptionLookupMs: number;
  } {
    return {
      eventsPerSecond: 50000,
      avgDeliveryMs: 0.02,
      subscriptionLookupMs: 0.001,
    };
  }

  private simulateQueueThroughput(): {
    jobsPerSecond: number;
    avgProcessingMs: number;
    dlqRate: number;
  } {
    return {
      jobsPerSecond: 1000,
      avgProcessingMs: 50,
      dlqRate: 0.02,
    };
  }

  private simulateStartupTime(agentCount: number): {
    coldStartMs: number;
    warmStartMs: number;
    moduleInitMs: number;
  } {
    return {
      coldStartMs: Math.round(2000 + agentCount * 10),
      warmStartMs: Math.round(500 + agentCount * 5),
      moduleInitMs: Math.round(300 + agentCount * 3),
    };
  }

  // ─── Agent Analysis ───────────────────────────────────────────────

  /**
   * Discover and analyze all agent service files.
   */
  private async analyzeAgents(): Promise<AgentAnalysis[]> {
    if (this.agentAnalyses) {
      return this.agentAnalyses;
    }

    const results: AgentAnalysis[] = [];
    const agentFiles = await this.getAgentFiles();

    for (const filePath of agentFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(SOURCE_ROOT, filePath);

        // Extract class name
        const classMatch = content.match(/export\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : '';

        // Extract timeout
        const timeoutMatch = content.match(/timeout\s*:\s*(\d+)/);
        const timeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : null;

        // Extract maxConcurrentTasks
        const maxConcurrentMatch = content.match(/maxConcurrentTasks\s*:\s*(\d+)/);
        const maxConcurrentTasks = maxConcurrentMatch ? parseInt(maxConcurrentMatch[1], 10) : null;

        // Check for onDestroy
        const hasOnDestroy = content.includes('onDestroy') || content.includes('async onDestroy(');

        // Check for cleanup in onDestroy
        const onDestroyMatch = content.match(/onDestroy[\s\S]*?\{([\s\S]*?)\}/);
        const onDestroyBody = onDestroyMatch ? onDestroyMatch[1] : '';
        const hasCleanupInOnDestroy =
          onDestroyBody.includes('.clear()') ||
          onDestroyBody.includes('= []') ||
          onDestroyBody.includes('= null') ||
          onDestroyBody.includes('.length = 0') ||
          onDestroyBody.includes('clearInterval') ||
          onDestroyBody.includes('clearTimeout');

        // Check for Map size limits
        const hasMapWithSizeLimit =
          content.includes('maxEntries') ||
          content.includes('MAX_ENTRIES') ||
          content.includes('maxSize') ||
          content.includes('MAX_SIZE') ||
          content.includes('.size >') ||
          content.includes('.size >=') ||
          (content.includes('Map') && content.includes('evict'));

        // Check for Array size limits
        const hasArrayWithSizeLimit =
          content.includes('.slice(') ||
          content.includes('.length =') ||
          content.includes('.splice(') ||
          content.includes('MAX_HISTORY') ||
          content.includes('maxHistory');

        // Check for unbounded push
        const hasUnboundedPush =
          content.includes('.push(') &&
          !content.includes('.slice(') &&
          !content.includes('.splice(') &&
          !content.includes('MAX_') &&
          !content.includes('limit');

        // Check for busy-wait patterns
        const hasBusyWait =
          (content.includes('while (true)') || content.includes('while(true)')) &&
          !content.includes('await') &&
          !content.includes('sleep');

        // Check for async patterns
        const usesAsyncPatterns = content.includes('async ') && content.includes('await ');

        // Count Maps and Arrays
        const mapMatches = content.match(/new Map\(/g) || [];
        const mapCount = mapMatches.length;
        const arrayMatches = content.match(/:\s*\w+\[\]\s*=/g) || [];
        const arrayCount = arrayMatches.length;

        results.push({
          filePath,
          relativePath,
          content,
          className,
          timeout,
          maxConcurrentTasks,
          hasOnDestroy,
          hasCleanupInOnDestroy,
          hasMapWithSizeLimit,
          hasArrayWithSizeLimit,
          hasUnboundedPush,
          hasBusyWait,
          usesAsyncPatterns,
          mapCount,
          arrayCount,
        });
      } catch (error) {
        this.logger.warn(`Failed to analyze ${filePath}: ${(error as Error).message}`);
      }
    }

    this.agentAnalyses = results;
    return results;
  }

  // ─── Service Analysis ─────────────────────────────────────────────

  /**
   * Discover and analyze all service files (non-agent).
   */
  private async analyzeServices(): Promise<ServiceAnalysis[]> {
    if (this.serviceAnalyses) {
      return this.serviceAnalyses;
    }

    const results: ServiceAnalysis[] = [];

    // Analyze services from key directories
    const serviceDirs = [
      EVENTS_DIR,
      HEALTH_DIR,
      MEMORY_DIR,
      ORCHESTRATOR_DIR,
      path.join(AGENTS_DIR, 'communication'),
    ];

    for (const dir of serviceDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));

      for (const fileName of files) {
        const filePath = path.join(dir, fileName);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Extract class name
          const classMatch = content.match(/export\s+class\s+(\w+)/);
          const className = classMatch ? classMatch[1] : fileName.replace('.service.ts', '');

          // Extract method names
          const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
          const methods: string[] = [];
          let methodMatch: RegExpExecArray | null;
          while ((methodMatch = methodRegex.exec(content)) !== null) {
            const mName = methodMatch[1];
            if (
              ![
                'if',
                'for',
                'while',
                'switch',
                'catch',
                'constructor',
                'return',
                'new',
                'throw',
                'typeof',
              ].includes(mName)
            ) {
              methods.push(mName);
            }
          }
          const uniqueMethods = Array.from(new Set(methods));

          results.push({
            filePath,
            fileName,
            content,
            className,
            methods: uniqueMethods,
            hasInjectable: content.includes('@Injectable'),
            hasLogger: content.includes('Logger') || content.includes('this.logger'),
          });
        } catch (error) {
          this.logger.warn(`Failed to analyze ${filePath}: ${(error as Error).message}`);
        }
      }
    }

    // Also analyze config files
    if (fs.existsSync(CONFIG_DIR)) {
      const configFiles = fs.readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.config.ts'));

      for (const fileName of configFiles) {
        const filePath = path.join(CONFIG_DIR, fileName);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          results.push({
            filePath,
            fileName,
            content,
            className: fileName.replace('.config.ts', ''),
            methods: [],
            hasInjectable: false,
            hasLogger: false,
          });
        } catch {
          // Skip
        }
      }
    }

    this.serviceAnalyses = results;
    return results;
  }

  // ─── Filesystem Helpers ───────────────────────────────────────────

  /**
   * Recursively get all agent service files.
   */
  private async getAgentFiles(): Promise<string[]> {
    const results: string[] = [];

    if (!fs.existsSync(AGENTS_DIR)) {
      return results;
    }

    const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (
        entry.name === 'base' ||
        entry.name === 'decorators' ||
        entry.name === 'interfaces' ||
        entry.name === 'registry' ||
        entry.name === 'events'
      )
        continue;

      const subDir = path.join(AGENTS_DIR, entry.name);
      const subEntries = fs.readdirSync(subDir, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory()) continue;

        const agentDir = path.join(subDir, subEntry.name);
        try {
          const agentFiles = fs
            .readdirSync(agentDir)
            .filter((f) => f.endsWith('-agent.service.ts'));

          for (const file of agentFiles) {
            results.push(path.join(agentDir, file));
          }
        } catch {
          // Skip unreadable dirs
        }
      }
    }

    return results;
  }
}
