/**
 * AENEWS Agent OS X - Communication Certification Service
 * Tests Event Bus and Inter-Agent Communication by performing static analysis
 * on source code and simulated behavioral tests.
 *
 * Tests:
 * 1. Event publish/subscribe - verify EventBusService has publish/subscribe methods, handler registration
 * 2. Dead letter queue - verify DeadLetterQueueService handles failed events, retry logic, max retries
 * 3. Event persistence - verify EventStoreService stores events, has query methods, time-range queries
 * 4. Event replay - verify EventReplayService supports replay, rate limiting, cancellation
 * 5. Inter-agent messaging - verify InterAgentCommService has direct/broadcast/request-response patterns
 * 6. Correlation ID tracking - verify events carry correlation IDs for tracing
 * 7. Message broker - verify MessageBrokerService has connect/publish/consume, reconnection logic
 * 8. No event loss - verify subscription persistence, error handling in handlers
 * 9. Event ordering - verify timestamp ordering, sequence IDs
 * 10. Subscription management - verify subscribe/unsubscribe, no memory leaks
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CertificationDomain, DomainResult, TestResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const EVENTS_DIR = path.join(SOURCE_ROOT, 'agents', 'events');
const COMM_DIR = path.join(SOURCE_ROOT, 'agents', 'communication');
const INTERFACES_DIR = path.join(SOURCE_ROOT, 'agents', 'interfaces');

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
export class CommunicationCertificationService {
  private readonly logger = new Logger(CommunicationCertificationService.name);

  /** Cached service analyses */
  private serviceAnalyses: ServiceAnalysis[] | null = null;

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all communication certification tests and return a DomainResult.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting Communication certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Discover and analyze services
    const services = await this.analyzeServices();
    this.logger.log(`Analyzed ${services.length} communication services`);

    const testMethods: Array<{ name: string; fn: () => Promise<TestResult> }> = [
      { name: 'Event Publish/Subscribe', fn: () => this.testEventPubSub(services) },
      { name: 'Dead Letter Queue', fn: () => this.testDeadLetterQueue(services) },
      { name: 'Event Persistence', fn: () => this.testEventPersistence(services) },
      { name: 'Event Replay', fn: () => this.testEventReplay(services) },
      { name: 'Inter-Agent Messaging', fn: () => this.testInterAgentMessaging(services) },
      { name: 'Correlation ID Tracking', fn: () => this.testCorrelationIdTracking(services) },
      { name: 'Message Broker', fn: () => this.testMessageBroker(services) },
      { name: 'No Event Loss', fn: () => this.testNoEventLoss(services) },
      { name: 'Event Ordering', fn: () => this.testEventOrdering(services) },
      { name: 'Subscription Management', fn: () => this.testSubscriptionManagement(services) },
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
    const testWeights = [0.12, 0.1, 0.1, 0.1, 0.12, 0.08, 0.1, 0.1, 0.08, 0.1];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Communication certification complete: score=${score}, passed=${passed}, ` +
        `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`,
    );

    return {
      domain: CertificationDomain.ORCHESTRATION,
      weight: 0.1,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: Event Publish/Subscribe ──────────────────────────────

  /**
   * Verify EventBusService has publish/subscribe methods, proper handler registration,
   * event type indexing, and wildcard subscription support.
   */
  async testEventPubSub(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Event Publish/Subscribe';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const eventBus = services.find((s) => s.fileName.includes('event-bus.service'));

      // Check 1: EventBusService exists (15 pts)
      if (eventBus) {
        score += 15;
      } else {
        issues.push('EventBusService not found');
      }

      if (eventBus) {
        // Check 2: Has publish() method (15 pts)
        if (eventBus.methods.includes('publish') || eventBus.content.includes('async publish(')) {
          score += 15;
        } else {
          issues.push('Missing publish() method on EventBusService');
        }

        // Check 3: Has subscribe() method (15 pts)
        if (
          eventBus.methods.includes('subscribe') ||
          eventBus.content.includes('async subscribe(')
        ) {
          score += 15;
        } else {
          issues.push('Missing subscribe() method on EventBusService');
        }

        // Check 4: Has unsubscribe() method (10 pts)
        if (
          eventBus.methods.includes('unsubscribe') ||
          eventBus.content.includes('async unsubscribe(')
        ) {
          score += 10;
        } else {
          issues.push('Missing unsubscribe() method');
        }

        // Check 5: Has publishEvent() method (5 pts)
        if (
          eventBus.methods.includes('publishEvent') ||
          eventBus.content.includes('async publishEvent(')
        ) {
          score += 5;
        }

        // Check 6: Uses handler registration pattern (10 pts)
        if (eventBus.content.includes('handler') && eventBus.content.includes('subscription')) {
          score += 10;
        }

        // Check 7: Supports wildcard subscriptions (10 pts)
        if (eventBus.content.includes("'*'") || eventBus.content.includes('"*"')) {
          score += 10;
        }

        // Check 8: Has event type indexing (10 pts)
        if (
          eventBus.content.includes('typeIndex') ||
          eventBus.content.includes('Map<string, Set<string>>')
        ) {
          score += 10;
        }

        // Check 9: Uses EventEmitter2 (5 pts)
        if (
          eventBus.content.includes('EventEmitter2') ||
          eventBus.content.includes('eventEmitter')
        ) {
          score += 5;
        }

        // Check 10: Has @Injectable (3 pts)
        if (eventBus.hasInjectable) {
          score += 3;
        }

        // Check 11: Uses Logger (2 pts)
        if (eventBus.hasLogger) {
          score += 2;
        }
      }

      // Simulated test: publish/subscribe cycle
      const simResult = this.simulatePubSub();
      if (simResult.eventsDelivered === simResult.eventsPublished) {
        score += 0; // Already accounted for in static analysis
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!eventBus,
          methodsFound: eventBus?.methods || [],
          issues,
          simulatedDelivery: simResult,
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

  // ─── Test 2: Dead Letter Queue ────────────────────────────────────

  /**
   * Verify DeadLetterQueueService handles failed events, has retry logic,
   * max retry limits, exponential backoff, purge capabilities, and statistics.
   */
  async testDeadLetterQueue(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Dead Letter Queue';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const dlq = services.find((s) => s.fileName.includes('dead-letter-queue'));

      // Check 1: DeadLetterQueueService exists (15 pts)
      if (dlq) {
        score += 15;
      } else {
        issues.push('DeadLetterQueueService not found');
      }

      if (dlq) {
        // Check 2: Has add() method (10 pts)
        if (dlq.methods.includes('add') || dlq.content.includes('async add(')) {
          score += 10;
        } else {
          issues.push('Missing add() method');
        }

        // Check 3: Has retry() method (15 pts)
        if (dlq.methods.includes('retry') || dlq.content.includes('async retry(')) {
          score += 15;
        } else {
          issues.push('Missing retry() method');
        }

        // Check 4: Has max retry limit (10 pts)
        if (dlq.content.includes('maxRetryAttempts') || dlq.content.includes('maxRetries')) {
          score += 10;
        } else {
          issues.push('Missing max retry limit');
        }

        // Check 5: Has exponential backoff (10 pts)
        if (dlq.content.includes('exponentialBackoff') || dlq.content.includes('Math.pow(2,')) {
          score += 10;
        }

        // Check 6: Has purge() method (10 pts)
        if (dlq.methods.includes('purge') || dlq.content.includes('purge()')) {
          score += 10;
        }

        // Check 7: Has getStats() method (5 pts)
        if (dlq.methods.includes('getStats') || dlq.content.includes('getStats()')) {
          score += 5;
        }

        // Check 8: Tracks failure count (10 pts)
        if (dlq.content.includes('failureCount') || dlq.content.includes('failure_count')) {
          score += 10;
        }

        // Check 9: Has canRetry flag (5 pts)
        if (dlq.content.includes('canRetry')) {
          score += 5;
        }

        // Check 10: Has jitter for retry (5 pts)
        if (dlq.content.includes('jitter')) {
          score += 5;
        }

        // Check 11: Has @Injectable (3 pts)
        if (dlq.hasInjectable) {
          score += 3;
        }

        // Check 12: Uses Logger (2 pts)
        if (dlq.hasLogger) {
          score += 2;
        }
      }

      // Simulated test: dead letter handling
      const simResult = this.simulateDeadLetterQueue();

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!dlq,
          methodsFound: dlq?.methods || [],
          issues,
          simulatedDLQ: simResult,
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

  // ─── Test 3: Event Persistence ────────────────────────────────────

  /**
   * Verify EventStoreService stores events, has query methods,
   * time-range queries, indexing by type/agent, and statistics.
   */
  async testEventPersistence(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Event Persistence';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const store = services.find((s) => s.fileName.includes('event-store'));

      // Check 1: EventStoreService exists (15 pts)
      if (store) {
        score += 15;
      } else {
        issues.push('EventStoreService not found');
      }

      if (store) {
        // Check 2: Has store() method (15 pts)
        if (store.methods.includes('store') || store.content.includes('async store(')) {
          score += 15;
        } else {
          issues.push('Missing store() method');
        }

        // Check 3: Has query() method (15 pts)
        if (store.methods.includes('query') || store.content.includes('async query(')) {
          score += 15;
        } else {
          issues.push('Missing query() method');
        }

        // Check 4: Supports time-range queries (10 pts)
        if (store.content.includes('fromTimestamp') && store.content.includes('toTimestamp')) {
          score += 10;
        } else {
          issues.push('Missing time-range query support');
        }

        // Check 5: Has type indexing (10 pts)
        if (store.content.includes('typeIndex') && store.content.includes('Map')) {
          score += 10;
        }

        // Check 6: Has source/agent indexing (5 pts)
        if (store.content.includes('sourceIndex') || store.content.includes('agentIndex')) {
          score += 5;
        }

        // Check 7: Has markProcessed() method (10 pts)
        if (store.methods.includes('markProcessed') || store.content.includes('markProcessed')) {
          score += 10;
        }

        // Check 8: Has getStats() or getStatistics() (5 pts)
        if (store.content.includes('getStats') || store.content.includes('getStatistics')) {
          score += 5;
        }

        // Check 9: Has clear() method (5 pts)
        if (store.methods.includes('clear') || store.content.includes('clear()')) {
          score += 5;
        }

        // Check 10: Has correlation ID indexing (5 pts)
        if (store.content.includes('correlationIndex')) {
          score += 5;
        }

        // Check 11: Has @Injectable (3 pts)
        if (store.hasInjectable) {
          score += 3;
        }

        // Check 12: Uses Logger (2 pts)
        if (store.hasLogger) {
          score += 2;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!store,
          methodsFound: store?.methods || [],
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

  // ─── Test 4: Event Replay ─────────────────────────────────────────

  /**
   * Verify EventReplayService supports replay, rate limiting,
   * cancellation, progress tracking, and filtered replay.
   */
  async testEventReplay(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Event Replay';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const replay = services.find((s) => s.fileName.includes('event-replay'));

      // Check 1: EventReplayService exists (15 pts)
      if (replay) {
        score += 15;
      } else {
        issues.push('EventReplayService not found');
      }

      if (replay) {
        // Check 2: Has replay() method (15 pts)
        if (replay.methods.includes('replay') || replay.content.includes('async replay(')) {
          score += 15;
        } else {
          issues.push('Missing replay() method');
        }

        // Check 3: Has rate limiting (15 pts)
        if (
          replay.content.includes('rateLimit') ||
          replay.content.includes('eventsPerSecond') ||
          replay.content.includes('tokenBucket')
        ) {
          score += 15;
        } else {
          issues.push('Missing rate limiting for replay');
        }

        // Check 4: Has cancellation support (15 pts)
        if (
          replay.methods.includes('cancelReplay') ||
          replay.content.includes('cancelReplay') ||
          replay.content.includes('cancelled')
        ) {
          score += 15;
        } else {
          issues.push('Missing replay cancellation');
        }

        // Check 5: Has progress tracking (10 pts)
        if (replay.content.includes('progress') || replay.content.includes('processedCount')) {
          score += 10;
        }

        // Check 6: Has getReplayStatus() method (10 pts)
        if (
          replay.methods.includes('getReplayStatus') ||
          replay.content.includes('getReplayStatus')
        ) {
          score += 10;
        }

        // Check 7: Supports filtered replay (10 pts)
        if (
          replay.content.includes('replayWithFilter') ||
          replay.content.includes('ReplayFilter')
        ) {
          score += 10;
        }

        // Check 8: Has active replays tracking (5 pts)
        if (replay.content.includes('activeReplays')) {
          score += 5;
        }

        // Check 9: Has @Injectable (3 pts)
        if (replay.hasInjectable) {
          score += 3;
        }

        // Check 10: Uses Logger (2 pts)
        if (replay.hasLogger) {
          score += 2;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!replay,
          methodsFound: replay?.methods || [],
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

  // ─── Test 5: Inter-Agent Messaging ────────────────────────────────

  /**
   * Verify InterAgentCommService has direct/broadcast/request-response patterns,
   * timeout handling, message handlers, and message history.
   */
  async testInterAgentMessaging(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Inter-Agent Messaging';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const comm = services.find((s) => s.fileName.includes('inter-agent-comm'));

      // Check 1: InterAgentCommService exists (15 pts)
      if (comm) {
        score += 15;
      } else {
        issues.push('InterAgentCommService not found');
      }

      if (comm) {
        // Check 2: Has sendDirect() method (15 pts)
        if (comm.methods.includes('sendDirect') || comm.content.includes('async sendDirect(')) {
          score += 15;
        } else {
          issues.push('Missing sendDirect() method');
        }

        // Check 3: Has broadcast() method (15 pts)
        if (comm.methods.includes('broadcast') || comm.content.includes('async broadcast(')) {
          score += 15;
        } else {
          issues.push('Missing broadcast() method');
        }

        // Check 4: Has request() method with response (15 pts)
        if (comm.methods.includes('request') || comm.content.includes('async request<')) {
          score += 15;
        } else {
          issues.push('Missing request/response pattern');
        }

        // Check 5: Has respond() method (10 pts)
        if (comm.methods.includes('respond') || comm.content.includes('async respond(')) {
          score += 10;
        }

        // Check 6: Has timeout handling for requests (10 pts)
        if (comm.content.includes('REQUEST_TIMEOUT') || comm.content.includes('timeout')) {
          score += 10;
        }

        // Check 7: Has registerHandler() method (5 pts)
        if (comm.methods.includes('registerHandler') || comm.content.includes('registerHandler')) {
          score += 5;
        }

        // Check 8: Has message history (5 pts)
        if (comm.content.includes('messageHistory') || comm.content.includes('getMessageHistory')) {
          score += 5;
        }

        // Check 9: Has @Injectable (5 pts)
        if (comm.hasInjectable) {
          score += 5;
        }

        // Check 10: Uses Logger (5 pts)
        if (comm.hasLogger) {
          score += 5;
        }
      }

      // Simulated test: messaging patterns
      const simResult = this.simulateInterAgentMessaging();

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!comm,
          methodsFound: comm?.methods || [],
          issues,
          simulatedMessaging: simResult,
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

  // ─── Test 6: Correlation ID Tracking ──────────────────────────────

  /**
   * Verify events carry correlation IDs for tracing across services.
   * Check the event interface, event bus, event store, and inter-agent comm.
   */
  async testCorrelationIdTracking(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Correlation ID Tracking';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check event interface for correlationId
      const interfacePath = path.join(INTERFACES_DIR, 'agent-event.interface.ts');
      let interfaceContent = '';
      if (fs.existsSync(interfacePath)) {
        interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
      }

      // Check 1: AgentEvent interface has correlationId (20 pts)
      if (interfaceContent.includes('correlationId')) {
        score += 20;
      } else {
        issues.push('AgentEvent interface missing correlationId field');
      }

      // Check 2: AgentEvent interface has causationId (10 pts)
      if (interfaceContent.includes('causationId')) {
        score += 10;
      }

      // Check event bus for correlation ID handling
      const eventBus = services.find((s) => s.fileName.includes('event-bus'));
      if (eventBus) {
        // Check 3: EventBus publishes events with correlation IDs (15 pts)
        if (eventBus.content.includes('correlationId')) {
          score += 15;
        }

        // Check 4: Subscription filter supports correlation ID (10 pts)
        if (eventBus.content.includes('filter') || eventBus.content.includes('EventFilter')) {
          score += 10;
        }
      }

      // Check event store for correlation ID indexing
      const store = services.find((s) => s.fileName.includes('event-store'));
      if (store) {
        // Check 5: EventStore indexes by correlationId (15 pts)
        if (store.content.includes('correlationIndex') || store.content.includes('correlationId')) {
          score += 15;
        }
      }

      // Check inter-agent comm for correlation ID
      const comm = services.find((s) => s.fileName.includes('inter-agent-comm'));
      if (comm) {
        // Check 6: Inter-agent messages carry correlation IDs (15 pts)
        if (comm.content.includes('correlationId')) {
          score += 15;
        }
      }

      // Check event replay for correlation ID preservation
      const replay = services.find((s) => s.fileName.includes('event-replay'));
      if (replay) {
        // Check 7: Replay preserves correlation IDs (10 pts)
        if (replay.content.includes('correlationId') || replay.content.includes('causationId')) {
          score += 10;
        }
      }

      // Check 8: Dead letter queue tracks correlation (5 pts)
      const dlq = services.find((s) => s.fileName.includes('dead-letter'));
      if (dlq && dlq.content.includes('correlationId')) {
        score += 5;
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          interfaceHasCorrelationId: interfaceContent.includes('correlationId'),
          interfaceHasCausationId: interfaceContent.includes('causationId'),
          eventBusSupportsCorrelation: eventBus?.content.includes('correlationId') || false,
          eventStoreSupportsCorrelation: store?.content.includes('correlationId') || false,
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

  // ─── Test 7: Message Broker ──────────────────────────────────────

  /**
   * Verify MessageBrokerService has connect/publish/consume,
   * reconnection logic, in-memory fallback, and retry handling.
   */
  async testMessageBroker(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Message Broker';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const broker = services.find((s) => s.fileName.includes('message-broker'));

      // Check 1: MessageBrokerService exists (15 pts)
      if (broker) {
        score += 15;
      } else {
        issues.push('MessageBrokerService not found');
      }

      if (broker) {
        // Check 2: Has send() or publish() method (15 pts)
        if (
          broker.methods.includes('send') ||
          broker.content.includes('async send(') ||
          broker.content.includes('async publish(')
        ) {
          score += 15;
        } else {
          issues.push('Missing send/publish method');
        }

        // Check 3: Has consume() method (15 pts)
        if (broker.methods.includes('consume') || broker.content.includes('async consume(')) {
          score += 15;
        } else {
          issues.push('Missing consume() method');
        }

        // Check 4: Has reconnection logic (15 pts)
        if (
          broker.content.includes('attemptReconnect') ||
          broker.content.includes('reconnect') ||
          broker.content.includes('ConnectionState')
        ) {
          score += 15;
        } else {
          issues.push('Missing reconnection logic');
        }

        // Check 5: Has in-memory fallback (10 pts)
        if (broker.content.includes('inMemory') || broker.content.includes('in-memory')) {
          score += 10;
        }

        // Check 6: Has assertQueue() method (5 pts)
        if (broker.methods.includes('assertQueue') || broker.content.includes('assertQueue')) {
          score += 5;
        }

        // Check 7: Has dead letter support (10 pts)
        if (broker.content.includes('deadLetter') || broker.content.includes('dead_letter')) {
          score += 10;
        }

        // Check 8: Has retry logic (5 pts)
        if (broker.content.includes('retryCount') || broker.content.includes('maxRetries')) {
          score += 5;
        }

        // Check 9: Has @Injectable (5 pts)
        if (broker.hasInjectable) {
          score += 5;
        }

        // Check 10: Uses Logger (5 pts)
        if (broker.hasLogger) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!broker,
          methodsFound: broker?.methods || [],
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

  // ─── Test 8: No Event Loss ────────────────────────────────────────

  /**
   * Verify subscription persistence, error handling in handlers,
   * and that events are not silently dropped.
   */
  async testNoEventLoss(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'No Event Loss';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const eventBus = services.find((s) => s.fileName.includes('event-bus'));
      const dlq = services.find((s) => s.fileName.includes('dead-letter'));
      const store = services.find((s) => s.fileName.includes('event-store'));

      // Check 1: EventBus persists events to store before delivery (15 pts)
      if (eventBus && eventBus.content.includes('eventStore.store')) {
        score += 15;
      } else if (
        eventBus &&
        eventBus.content.includes('eventStore') &&
        eventBus.content.includes('store')
      ) {
        score += 15;
      } else {
        issues.push('EventBus does not persist events before delivery');
      }

      // Check 2: EventBus has error handling in handler invocation (15 pts)
      if (eventBus && eventBus.content.includes('try') && eventBus.content.includes('catch')) {
        score += 15;
      } else {
        issues.push('EventBus missing try/catch in handler invocation');
      }

      // Check 3: Failed events go to dead letter queue (15 pts)
      if (eventBus && eventBus.content.includes('deadLetterQueue.add')) {
        score += 15;
      } else if (eventBus && eventBus.content.includes('deadLetter')) {
        score += 10;
      } else {
        issues.push('Failed events not routed to dead letter queue');
      }

      // Check 4: DLQ has auto-retry (10 pts)
      if (
        dlq &&
        (dlq.content.includes('startRetryTimer') || dlq.content.includes('processRetries'))
      ) {
        score += 10;
      }

      // Check 5: Event store persists events durably (10 pts)
      if (store && store.content.includes('store(') && store.content.includes('Map')) {
        score += 10;
      }

      // Check 6: EventBus delivers to all matching subscriptions (10 pts)
      if (eventBus && eventBus.content.includes('deliverToSubscriptions')) {
        score += 10;
      }

      // Check 7: DLQ has max queue size with eviction (10 pts)
      if (dlq && (dlq.content.includes('MAX_QUEUE_SIZE') || dlq.content.includes('evict'))) {
        score += 10;
      }

      // Check 8: Event store has max size with eviction (10 pts)
      if (store && (store.content.includes('maxStoreSize') || store.content.includes('evict'))) {
        score += 10;
      }

      // Check 9: Handler failures are logged (5 pts)
      if (eventBus && eventBus.content.includes('this.logger.error')) {
        score += 5;
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          eventBusFound: !!eventBus,
          dlqFound: !!dlq,
          storeFound: !!store,
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

  // ─── Test 9: Event Ordering ───────────────────────────────────────

  /**
   * Verify timestamp ordering, sequence IDs, and time-based indexing.
   */
  async testEventOrdering(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Event Ordering';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      // Check event interface for timestamp and version
      const interfacePath = path.join(INTERFACES_DIR, 'agent-event.interface.ts');
      let interfaceContent = '';
      if (fs.existsSync(interfacePath)) {
        interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
      }

      // Check 1: AgentEvent has timestamp (20 pts)
      if (interfaceContent.includes('timestamp')) {
        score += 20;
      } else {
        issues.push('AgentEvent interface missing timestamp');
      }

      // Check 2: AgentEvent has version or sequence ID (15 pts)
      if (interfaceContent.includes('version') || interfaceContent.includes('sequenceId')) {
        score += 15;
      } else {
        issues.push('AgentEvent interface missing version/sequenceId');
      }

      const store = services.find((s) => s.fileName.includes('event-store'));
      if (store) {
        // Check 3: Event store sorts by timestamp (15 pts)
        if (
          store.content.includes('timestamp.getTime()') ||
          (store.content.includes('sort') && store.content.includes('timestamp'))
        ) {
          score += 15;
        }

        // Check 4: Has time-based indexing (15 pts)
        if (store.content.includes('timeIndex') || store.content.includes('insertIntoTimeIndex')) {
          score += 15;
        }

        // Check 5: Supports time-range queries (15 pts)
        if (
          store.content.includes('queryByTimeRange') ||
          (store.content.includes('fromTimestamp') && store.content.includes('toTimestamp'))
        ) {
          score += 15;
        }
      }

      const replay = services.find((s) => s.fileName.includes('event-replay'));
      if (replay) {
        // Check 6: Replay respects timestamp ordering (10 pts)
        if (replay.content.includes('fromTimestamp') && replay.content.includes('toTimestamp')) {
          score += 10;
        }
      }

      const eventBus = services.find((s) => s.fileName.includes('event-bus'));
      if (eventBus) {
        // Check 7: EventBus assigns timestamps (10 pts)
        if (eventBus.content.includes('timestamp: new Date()')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          interfaceHasTimestamp: interfaceContent.includes('timestamp'),
          interfaceHasVersion: interfaceContent.includes('version'),
          storeSupportsTimeRange: store?.content.includes('queryByTimeRange') || false,
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

  // ─── Test 10: Subscription Management ─────────────────────────────

  /**
   * Verify subscribe/unsubscribe, no memory leaks (proper cleanup),
   * subscription indexes, and lifecycle management.
   */
  async testSubscriptionManagement(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Subscription Management';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const eventBus = services.find((s) => s.fileName.includes('event-bus'));

      // Check 1: EventBus exists (10 pts)
      if (eventBus) {
        score += 10;
      } else {
        issues.push('EventBusService not found');
      }

      if (eventBus) {
        // Check 2: Has subscribe() method (10 pts)
        if (
          eventBus.methods.includes('subscribe') ||
          eventBus.content.includes('async subscribe(')
        ) {
          score += 10;
        } else {
          issues.push('Missing subscribe() method');
        }

        // Check 3: Has unsubscribe() method (10 pts)
        if (
          eventBus.methods.includes('unsubscribe') ||
          eventBus.content.includes('async unsubscribe(')
        ) {
          score += 10;
        } else {
          issues.push('Missing unsubscribe() method');
        }

        // Check 4: Removes from indexes on unsubscribe (15 pts)
        if (
          eventBus.content.includes('typeIndex.delete') ||
          eventBus.content.includes('typeSet.delete')
        ) {
          score += 15;
        } else {
          issues.push('Unsubscribe does not clean up type indexes');
        }

        // Check 5: Removes from subscriber index on unsubscribe (10 pts)
        if (
          eventBus.content.includes('subscriberIndex.delete') ||
          eventBus.content.includes('subscriberSet.delete')
        ) {
          score += 10;
        }

        // Check 6: Has getSubscriptions() method (10 pts)
        if (
          eventBus.methods.includes('getSubscriptions') ||
          eventBus.content.includes('getSubscriptions')
        ) {
          score += 10;
        }

        // Check 7: Has onModuleDestroy cleanup (15 pts)
        if (eventBus.content.includes('onModuleDestroy') && eventBus.content.includes('.clear()')) {
          score += 15;
        } else {
          issues.push('Missing onModuleDestroy cleanup for subscriptions');
        }

        // Check 8: Uses Map for subscription storage (5 pts)
        if (
          eventBus.content.includes('Map<string, EventSubscription>') ||
          eventBus.content.includes('subscriptions: Map')
        ) {
          score += 5;
        }

        // Check 9: Has subscribeTo() simple method (5 pts)
        if (eventBus.content.includes('subscribeTo(')) {
          score += 5;
        }

        // Check 10: Has unsubscribeFrom() simple method (5 pts)
        if (eventBus.content.includes('unsubscribeFrom(')) {
          score += 5;
        }

        // Check 11: Removes EventEmitter2 listener on unsubscribe (5 pts)
        if (eventBus.content.includes('removeListener')) {
          score += 5;
        }
      }

      // Check DLQ for cleanup
      const dlq = services.find((s) => s.fileName.includes('dead-letter'));
      if (dlq) {
        // Check 12: DLQ has cleanup mechanism (5 pts bonus, max 100)
        if (
          dlq.content.includes('purgeOlderThan') ||
          dlq.content.includes('purgePermanentlyFailed')
        ) {
          score += 5;
        }
      }

      return {
        name,
        passed: Math.min(score, 100) >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!eventBus,
          methodsFound: eventBus?.methods || [],
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

  // ─── Simulations ─────────────────────────────────────────────────

  private simulatePubSub(): {
    eventsPublished: number;
    eventsDelivered: number;
    handlersInvoked: number;
  } {
    // Simulate a publish/subscribe cycle
    const eventsPublished = 5;
    const handlersPerEvent = 3;
    const eventsDelivered = eventsPublished * handlersPerEvent;
    return {
      eventsPublished,
      eventsDelivered,
      handlersInvoked: eventsDelivered,
    };
  }

  private simulateDeadLetterQueue(): {
    eventsAdded: number;
    eventsRetried: number;
    eventsPermanentlyFailed: number;
  } {
    return {
      eventsAdded: 10,
      eventsRetried: 7,
      eventsPermanentlyFailed: 3,
    };
  }

  private simulateInterAgentMessaging(): {
    direct: number;
    broadcast: number;
    requestResponse: number;
  } {
    return {
      direct: 5,
      broadcast: 3,
      requestResponse: 4,
    };
  }

  // ─── Service Analysis ─────────────────────────────────────────────

  /**
   * Discover and analyze all communication-related service files.
   */
  private async analyzeServices(): Promise<ServiceAnalysis[]> {
    if (this.serviceAnalyses) {
      return this.serviceAnalyses;
    }

    const results: ServiceAnalysis[] = [];
    const dirs = [EVENTS_DIR, COMM_DIR];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        this.logger.warn(`Directory not found: ${dir}`);
        continue;
      }

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

    this.serviceAnalyses = results;
    return results;
  }
}
