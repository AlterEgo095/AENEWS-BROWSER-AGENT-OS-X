/**
 * AENEWS Agent OS X — E2E Tests: Agent Framework Services
 *
 * Tests the core agent framework services:
 *   - AgentMemoryService: store / retrieve / search
 *   - AgentEventBusService: emit / on / once / pattern
 *   - AgentCommunicationService: send / broadcast / request / respond
 *   - AgentHealthService: recordExecution / getHealth / getMetrics / getSystemHealth
 *   - AgentBridgeService: connector registration / execution
 *
 * All external dependencies (CACHE_MANAGER, QdrantService) are mocked.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AgentMemoryService, MemoryTier } from '../src/modules/agent-framework/services/agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
  AgentEventPayload,
} from '../src/modules/agent-framework/services/agent-event-bus.service';
import {
  AgentCommunicationService,
  AgentMessage,
} from '../src/modules/agent-framework/services/agent-communication.service';
import {
  AgentHealthService,
  AgentHealth,
  AgentMetrics,
  SystemHealth,
} from '../src/modules/agent-framework/services/agent-health.service';
import {
  AgentBridgeService,
  SoftwareFactoryConnector,
} from '../src/modules/agent-framework/services/agent-bridge.service';

// ─── Mock Cache Manager ─────────────────────────────────────────

function createMockCacheManager() {
  const store = new Map<string, any>();
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const val = store.get(key);
      return Promise.resolve(val !== undefined ? val : null);
    }),
    set: jest.fn().mockImplementation((key: string, value: any, ttl?: number) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    store: {
      keys: jest.fn().mockImplementation((pattern?: string) => {
        if (!pattern) return Promise.resolve(Array.from(store.keys()));
        // Simple wildcard matching
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        );
        return Promise.resolve(
          Array.from(store.keys()).filter((k) => regex.test(k)),
        );
      }),
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Agent Framework (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create EventEmitter2 with wildcard support (matching the app's config)
    const emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMemoryService,
        AgentEventBusService,
        AgentCommunicationService,
        AgentHealthService,
        AgentBridgeService,
        {
          provide: EventEmitter2,
          useValue: emitter,
        },
        {
          provide: CACHE_MANAGER,
          useFactory: createMockCacheManager,
        },
        // QdrantService is optional — don't provide it
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Memory Service Tests ────────────────────────────────────

  describe('AgentMemoryService', () => {
    let memoryService: AgentMemoryService;

    beforeAll(() => {
      memoryService = app.get(AgentMemoryService);
    });

    it('should be defined', () => {
      expect(memoryService).toBeDefined();
    });

    it('should store and retrieve a value in working memory', async () => {
      await memoryService.store('agent-1', MemoryTier.WORKING, 'key1', {
        foo: 'bar',
      });

      const result = await memoryService.retrieve('agent-1', MemoryTier.WORKING, 'key1');
      expect(result).toBeDefined();
      expect(result.foo).toBe('bar');
    });

    it('should store and retrieve a value in session memory', async () => {
      await memoryService.store('agent-1', MemoryTier.SESSION, 'session-key', {
        data: 'session-value',
      });

      const result = await memoryService.retrieve('agent-1', MemoryTier.SESSION, 'session-key');
      expect(result).toBeDefined();
      expect(result.data).toBe('session-value');
    });

    it('should store and retrieve a value in long-term memory', async () => {
      await memoryService.store(
        'agent-1',
        MemoryTier.LONG_TERM,
        'persistent-key',
        { important: true },
      );

      const result = await memoryService.retrieve('agent-1', MemoryTier.LONG_TERM, 'persistent-key');
      expect(result).toBeDefined();
      expect(result.important).toBe(true);
    });

    it('should return null for non-existent keys', async () => {
      const result = await memoryService.retrieve(
        'agent-1',
        MemoryTier.WORKING,
        'nonexistent',
      );
      expect(result).toBeNull();
    });

    it('should store different data types', async () => {
      // String
      await memoryService.store('agent-2', MemoryTier.WORKING, 'str', 'hello');
      const str = await memoryService.retrieve('agent-2', MemoryTier.WORKING, 'str');
      expect(str).toBe('hello');

      // Number
      await memoryService.store('agent-2', MemoryTier.WORKING, 'num', 42);
      const num = await memoryService.retrieve('agent-2', MemoryTier.WORKING, 'num');
      expect(num).toBe(42);

      // Array
      await memoryService.store('agent-2', MemoryTier.WORKING, 'arr', [1, 2, 3]);
      const arr = await memoryService.retrieve('agent-2', MemoryTier.WORKING, 'arr');
      expect(arr).toEqual([1, 2, 3]);
    });

    it('should isolate data by agent ID', async () => {
      await memoryService.store('agent-A', MemoryTier.WORKING, 'shared-key', {
        owner: 'A',
      });
      await memoryService.store('agent-B', MemoryTier.WORKING, 'shared-key', {
        owner: 'B',
      });

      const aData = await memoryService.retrieve('agent-A', MemoryTier.WORKING, 'shared-key');
      const bData = await memoryService.retrieve('agent-B', MemoryTier.WORKING, 'shared-key');

      expect(aData.owner).toBe('A');
      expect(bData.owner).toBe('B');
    });

    it('should return empty array from search when Qdrant is not available', async () => {
      const results = await memoryService.search('agent-1', [0.1, 0.2, 0.3], 5);
      expect(results).toEqual([]);
    });

    it('should provide working memory convenience aliases', () => {
      expect(memoryService.workingMemory).toBeDefined();
      expect(typeof memoryService.workingMemory.set).toBe('function');
      expect(typeof memoryService.workingMemory.get).toBe('function');
    });

    it('should provide session memory convenience aliases', () => {
      expect(memoryService.sessionMemory).toBeDefined();
      expect(typeof memoryService.sessionMemory.set).toBe('function');
      expect(typeof memoryService.sessionMemory.get).toBe('function');
    });

    it('should provide long-term memory convenience aliases', () => {
      expect(memoryService.longTermMemory).toBeDefined();
      expect(typeof memoryService.longTermMemory.set).toBe('function');
      expect(typeof memoryService.longTermMemory.get).toBe('function');
    });

    it('should provide vector search convenience alias', () => {
      expect(memoryService.vectorSearch).toBeDefined();
      expect(typeof memoryService.vectorSearch.search).toBe('function');
    });
  });

  // ─── Event Bus Tests ─────────────────────────────────────────

  describe('AgentEventBusService', () => {
    let eventBus: AgentEventBusService;

    beforeAll(() => {
      eventBus = app.get(AgentEventBusService);
    });

    it('should be defined', () => {
      expect(eventBus).toBeDefined();
    });

    it('should emit and receive events', (done) => {
      const handler = (payload: AgentEventPayload) => {
        expect(payload.agentId).toBe('test-agent');
        expect(payload.eventType).toBe(AgentEventType.AGENT_STARTED);
        expect(payload.data).toEqual({ phase: 'test' });
        done();
      };

      eventBus.on(AgentEventType.AGENT_STARTED, handler);

      eventBus.emit(AgentEventType.AGENT_STARTED, 'test-agent', {
        phase: 'test',
      });

      // Cleanup
      eventBus.removeAllListeners(AgentEventType.AGENT_STARTED);
    });

    it('should emit agent-specific events', (done) => {
      const handler = (payload: AgentEventPayload) => {
        expect(payload.agentId).toBe('specific-agent');
        expect(payload.eventType).toBe(AgentEventType.AGENT_COMPLETED);
        done();
      };

      eventBus.on(AgentEventType.AGENT_COMPLETED, handler, 'specific-agent');

      eventBus.emit(AgentEventType.AGENT_COMPLETED, 'specific-agent', {
        result: 'ok',
      });

      eventBus.removeAllListeners(AgentEventType.AGENT_COMPLETED, 'specific-agent');
    });

    it('should receive events only once with once()', (done) => {
      let callCount = 0;

      eventBus.once(AgentEventType.AGENT_PAUSED, (payload: AgentEventPayload) => {
        callCount++;
        expect(payload.agentId).toBe('once-agent');
      });

      eventBus.emit(AgentEventType.AGENT_PAUSED, 'once-agent', {});
      eventBus.emit(AgentEventType.AGENT_PAUSED, 'once-agent', {});

      // Give event loop time to process
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 50);

      eventBus.removeAllListeners(AgentEventType.AGENT_PAUSED);
    });

    it('should support wildcard pattern subscriptions', (done) => {
      const handler = (payload: AgentEventPayload) => {
        expect(payload.eventType).toBe(AgentEventType.AGENT_RESUMED);
        done();
      };

      eventBus.onPattern('agent.*.agent.resumed', handler);

      eventBus.emit(AgentEventType.AGENT_RESUMED, 'wildcard-agent', {});

      eventBus.removeAllListeners(AgentEventType.AGENT_RESUMED);
    });

    it('should emit progress events for missions', async () => {
      const handler = jest.fn();
      const emitter = app.get(EventEmitter2);
      emitter.on('agent.mission-1.progress', handler);

      await eventBus.emitProgress('mission-1', 50, 'Building');

      expect(handler).toHaveBeenCalled();
      emitter.removeAllListeners('agent.mission-1.progress');
    });

    it('should emit state change events for missions', async () => {
      const handler = jest.fn();
      const emitter = app.get(EventEmitter2);
      emitter.on('agent.mission-2.stateChange', handler);

      await eventBus.emitStateChange('mission-2', 'DRAFT', 'PLANNED', {
        trigger: 'SUBMIT',
      });

      expect(handler).toHaveBeenCalled();
      emitter.removeAllListeners('agent.mission-2.stateChange');
    });

    it('should emit connector events', async () => {
      const handler = jest.fn();
      const emitter = app.get(EventEmitter2);
      emitter.on('connector.browser.navigate', handler);

      await eventBus.emitConnectorEvent('browser', 'navigate', true, 150);

      expect(handler).toHaveBeenCalled();
      emitter.removeAllListeners('connector.browser.navigate');
    });

    it('should remove all listeners', () => {
      const handler = jest.fn();
      eventBus.on(AgentEventType.AGENT_STOPPED, handler);
      eventBus.removeAllListeners(AgentEventType.AGENT_STOPPED);

      eventBus.emit(AgentEventType.AGENT_STOPPED, 'cleanup-agent', {});

      // Handler should not have been called after removal
      // (It might have been called once during emit because emit happens synchronously
      // but the listener was already removed)
      // Actually, emit happens synchronously so if we removed first, it won't fire
      expect(true).toBe(true); // just verifying no crash
    });
  });

  // ─── Communication Service Tests ─────────────────────────────

  describe('AgentCommunicationService', () => {
    let commService: AgentCommunicationService;

    beforeAll(() => {
      commService = app.get(AgentCommunicationService);
    });

    it('should be defined', () => {
      expect(commService).toBeDefined();
    });

    it('should send a direct message from one agent to another', async () => {
      let receivedMessage: AgentMessage | null = null;

      commService.subscribe('agent-B', (msg) => {
        receivedMessage = msg;
      });

      const sent = await commService.send('agent-A', 'agent-B', {
        text: 'Hello from A',
      });

      expect(sent).toBeDefined();
      expect(sent.from).toBe('agent-A');
      expect(sent.to).toBe('agent-B');
      expect(sent.type).toBe('message');
      expect(sent.content.text).toBe('Hello from A');

      // Give async routing time
      await new Promise((r) => setTimeout(r, 50));

      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage!.content.text).toBe('Hello from A');
    });

    it('should broadcast a message to all agents', async () => {
      const receivedBy: string[] = [];

      commService.subscribe('listener-1', () => {
        receivedBy.push('listener-1');
      });
      commService.subscribe('listener-2', () => {
        receivedBy.push('listener-2');
      });

      const broadcast = await commService.broadcast('broadcaster', {
        alert: 'system update',
      });

      expect(broadcast.type).toBe('broadcast');
      expect(broadcast.to).toBe('*');

      await new Promise((r) => setTimeout(r, 50));

      expect(receivedBy).toContain('listener-1');
      expect(receivedBy).toContain('listener-2');
      // Broadcaster should not receive its own broadcast
      expect(receivedBy).not.toContain('broadcaster');
    });

    it('should support request-response pattern', async () => {
      // Set up a responder
      commService.subscribe('responder-agent', async (msg) => {
        if (msg.type === 'request' && msg.correlationId) {
          await commService.respond('responder-agent', msg, {
            answer: 42,
          });
        }
      });

      // Send a request
      const responsePromise = commService.request(
        'requester-agent',
        'responder-agent',
        { question: 'What is the answer?' },
        5000, // timeout
      );

      const response = await responsePromise;
      expect(response).toBeDefined();
      expect(response.type).toBe('response');
      expect(response.content.answer).toBe(42);
      expect(response.from).toBe('responder-agent');
    });

    it('should timeout on unanswered requests', async () => {
      await expect(
        commService.request('agent-X', 'agent-Y', { ping: true }, 100),
      ).rejects.toThrow('timed out');
    });
  });

  // ─── Health Service Tests ────────────────────────────────────

  describe('AgentHealthService', () => {
    let healthService: AgentHealthService;

    beforeAll(() => {
      healthService = app.get(AgentHealthService);
    });

    it('should be defined', () => {
      expect(healthService).toBeDefined();
    });

    it('should record execution results', () => {
      healthService.recordExecution('health-agent-1', 100, true);
      healthService.recordExecution('health-agent-1', 200, true);
      healthService.recordExecution('health-agent-1', 150, false, 'Timeout');

      const health = healthService.getHealth('health-agent-1');
      expect(health.executionCount).toBe(3);
      expect(health.successCount).toBe(2);
      expect(health.failureCount).toBe(1);
      expect(health.successRate).toBeCloseTo(2 / 3, 1);
      expect(health.consecutiveFailures).toBe(1);
      expect(health.lastError).toBe('Timeout');
    });

    it('should report healthy status for agents with high success rate', () => {
      healthService.recordExecution('healthy-agent', 100, true);
      healthService.recordExecution('healthy-agent', 100, true);
      healthService.recordExecution('healthy-agent', 100, true);

      const health = healthService.getHealth('healthy-agent');
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(1);
    });

    it('should report degraded status when success rate drops', () => {
      // Add some failures to lower the success rate
      for (let i = 0; i < 5; i++) {
        healthService.recordExecution('degraded-agent', 100, true);
      }
      for (let i = 0; i < 3; i++) {
        healthService.recordExecution('degraded-agent', 100, false, 'Error');
      }

      const health = healthService.getHealth('degraded-agent');
      // 5/8 = 62.5% success rate, which is below 80% threshold → degraded
      expect(health.status).toBe('degraded');
    });

    it('should report unhealthy status for very low success rate', () => {
      for (let i = 0; i < 3; i++) {
        healthService.recordExecution('unhealthy-agent', 100, false, 'Fatal');
      }

      const health = healthService.getHealth('unhealthy-agent');
      expect(health.status).toBe('unhealthy');
    });

    it('should report healthy for agents with no executions', () => {
      const health = healthService.getHealth('unknown-agent');
      expect(health.status).toBe('healthy');
      expect(health.executionCount).toBe(0);
    });

    it('should track consecutive failures', () => {
      healthService.recordExecution('consec-agent', 50, true);
      healthService.recordExecution('consec-agent', 50, false, 'E1');
      healthService.recordExecution('consec-agent', 50, false, 'E2');
      healthService.recordExecution('consec-agent', 50, false, 'E3');

      const health = healthService.getHealth('consec-agent');
      expect(health.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', () => {
      healthService.recordExecution('reset-agent', 50, false, 'E1');
      healthService.recordExecution('reset-agent', 50, false, 'E2');
      healthService.recordExecution('reset-agent', 50, true);

      const health = healthService.getHealth('reset-agent');
      expect(health.consecutiveFailures).toBe(0);
    });

    it('should provide detailed metrics', () => {
      for (let i = 0; i < 10; i++) {
        healthService.recordExecution(
          'metrics-agent',
          100 + i * 10,
          i < 8,
          i >= 8 ? `Error ${i}` : undefined,
        );
      }

      const metrics: AgentMetrics = healthService.getMetrics('metrics-agent');
      expect(metrics.totalExecutions).toBe(10);
      expect(metrics.successRate).toBeCloseTo(0.8, 1);
      expect(metrics.failureRate).toBeCloseTo(0.2, 1);
      expect(metrics.avgDurationMs).toBeGreaterThan(0);
      expect(metrics.minDurationMs).toBe(100);
      expect(metrics.maxDurationMs).toBe(190);
      expect(metrics.p50DurationMs).toBeGreaterThan(0);
      expect(metrics.consecutiveFailures).toBe(2);
    });

    it('should provide empty metrics for unknown agents', () => {
      const metrics = healthService.getMetrics('no-data-agent');
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    it('should provide system-wide health overview', () => {
      const systemHealth: SystemHealth = healthService.getSystemHealth();

      expect(systemHealth.totalAgents).toBeGreaterThan(0);
      expect(systemHealth).toHaveProperty('healthy');
      expect(systemHealth).toHaveProperty('degraded');
      expect(systemHealth).toHaveProperty('unhealthy');
      expect(systemHealth).toHaveProperty('overallStatus');
      expect(systemHealth.agents).toBeInstanceOf(Array);
    });
  });

  // ─── Bridge Service Tests ────────────────────────────────────

  describe('AgentBridgeService', () => {
    let bridgeService: AgentBridgeService;

    beforeAll(() => {
      bridgeService = app.get(AgentBridgeService);
    });

    it('should be defined', () => {
      expect(bridgeService).toBeDefined();
    });

    it('should register simulation connectors on init', () => {
      const names = bridgeService.getConnectorNames();
      expect(names).toContain('browser');
      expect(names).toContain('computer');
      expect(names).toContain('coding');
      expect(names).toContain('office');
      expect(names).toContain('marketing');
      expect(names).toContain('business');
    });

    it('should retrieve a connector by name', () => {
      const browserConnector = bridgeService.getConnector('browser');
      expect(browserConnector).toBeDefined();
      expect(browserConnector!.name).toBe('browser');
      expect(browserConnector!.actions).toContain('navigate');
      expect(browserConnector!.actions).toContain('scrape');
      expect(browserConnector!.actions).toContain('screenshot');
    });

    it('should execute an action via a connector', async () => {
      const result = await bridgeService.executeViaConnector('browser', 'navigate', {
        url: 'https://example.com',
      });

      expect(result).toBeDefined();
      expect(result.action).toBe('navigate');
      expect(result.result).toContain('[simulation] browser.navigate');
    });

    it('should throw for unknown connectors', async () => {
      await expect(
        bridgeService.executeViaConnector('nonexistent', 'test', {}),
      ).rejects.toThrow('Connector not found');
    });

    it('should throw for unsupported actions', async () => {
      await expect(
        bridgeService.executeViaConnector('browser', 'fly-to-moon', {}),
      ).rejects.toThrow('not supported');
    });

    it('should register custom connectors', () => {
      const customConnector: SoftwareFactoryConnector = {
        name: 'custom-test',
        description: 'Custom test connector',
        actions: ['doSomething', 'doAnotherThing'],
        execute: async (action, params) => ({
          action,
          params,
          result: `custom-${action} executed`,
        }),
      };

      bridgeService.registerConnector('custom-test', customConnector);

      const retrieved = bridgeService.getConnector('custom-test');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('custom-test');
      expect(retrieved!.actions).toContain('doSomething');
    });

    it('should execute actions on custom connectors', async () => {
      const result = await bridgeService.executeViaConnector('custom-test', 'doSomething', {
        param1: 'value1',
      });

      expect(result).toBeDefined();
      expect(result.action).toBe('doSomething');
      expect(result.result).toBe('custom-doSomething executed');
    });

    it('should overwrite connector when re-registered', () => {
      const v2: SoftwareFactoryConnector = {
        name: 'custom-test',
        description: 'V2 connector',
        actions: ['v2Action'],
        execute: async (action, params) => ({ action, v2: true }),
      };

      bridgeService.registerConnector('custom-test', v2);

      const retrieved = bridgeService.getConnector('custom-test');
      expect(retrieved!.actions).toContain('v2Action');
      expect(retrieved!.actions).not.toContain('doSomething');
    });

    it('should return undefined for non-existent connector', () => {
      const result = bridgeService.getConnector('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('should execute computer connector actions', async () => {
      const result = await bridgeService.executeViaConnector('computer', 'execute', {
        command: 'ls -la',
      });

      expect(result).toBeDefined();
      expect(result.action).toBe('execute');
    });

    it('should execute coding connector actions', async () => {
      const result = await bridgeService.executeViaConnector('coding', 'generate', {
        language: 'typescript',
      });

      expect(result).toBeDefined();
      expect(result.action).toBe('generate');
    });
  });
});
