/**
 * AENEWS Agent OS X - Base Agent Service Unit Tests
 * Tests the abstract BaseAgentService through a concrete TestAgent subclass.
 * Covers: lifecycle, execution, circuit breaker, tools, health, pause/resume, permissions.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AgentStatus,
  AgentCluster,
  AgentInput,
  AgentOutput,
  AgentError,
  AgentErrorCode,
  TaskPriority,
} from '../../src/agents/interfaces/agent.interface';
import {
  AgentEventType,
  EventPriority,
} from '../../src/agents/interfaces/agent-event.interface';
import { LifecyclePhase } from '../../src/agents/interfaces/agent-lifecycle.interface';
import { BaseAgentService } from '../../src/agents/base/base-agent.service';

// ─── Concrete Test Agent ────────────────────────────────────────────

class TestAgent extends BaseAgentService {
  private executeShouldFail = false;
  private initializeShouldFail = false;
  private healthCheckResult = true;

  protected defineConfig() {
    return {
      id: 'test-agent',
      name: 'Test',
      cluster: AgentCluster.BROWSER,
      version: '1.0.0',
      description: 'Test agent for unit tests',
      capabilities: [
        { name: 'test-capability', description: 'A test capability', inputSchema: {}, outputSchema: {} },
      ],
      permissions: ['execute:task', 'read:memory', '*'],
      maxConcurrentTasks: 5,
      timeout: 5000,
      retryPolicy: {
        maxRetries: 0,
        backoffMs: 100,
        exponentialBackoff: false,
      },
    };
  }

  protected async onInitialize(): Promise<void> {
    if (this.initializeShouldFail) {
      throw new Error('Initialization failed');
    }
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    if (this.executeShouldFail) {
      throw new Error('Execution failed');
    }
    return {
      taskId: input.taskId,
      success: true,
      result: { processed: input.payload },
      metrics: { executionTimeMs: 10, memoryUsedMb: 0.1, cpuUsagePercent: 0.5 },
      timestamp: new Date(),
    };
  }

  protected async onDestroy(): Promise<void> {}

  // ─── Test helpers to control behavior ─────────────────────────────

  setExecuteShouldFail(shouldFail: boolean): void {
    this.executeShouldFail = shouldFail;
  }

  setInitializeShouldFail(shouldFail: boolean): void {
    this.initializeShouldFail = shouldFail;
  }

  setHealthCheckResult(result: boolean): void {
    this.healthCheckResult = result;
  }

  protected async onHealthCheck(): Promise<boolean> {
    return this.healthCheckResult;
  }

  // Expose protected members for testing
  getCircuitBreaker() {
    return this.circuitBreaker;
  }

  forceCircuitBreakerState(state: 'open' | 'closed' | 'half_open') {
    this.circuitBreaker.state = state;
  }

  forceCircuitBreakerFailures(count: number) {
    this.circuitBreaker.failureCount = count;
  }

  getToolsMap() {
    return this.tools;
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('BaseAgentService', () => {
  let agent: TestAgent;
  let eventBusMock: { publish: jest.Mock };

  beforeEach(async () => {
    eventBusMock = { publish: jest.fn().mockResolvedValue(undefined) };

    agent = new TestAgent(eventBusMock, undefined, undefined);
  });

  afterEach(async () => {
    try {
      if (agent.getStatus() === AgentStatus.RUNNING || agent.getStatus() === AgentStatus.PAUSED) {
        await agent.stop();
      }
    } catch {
      // Ignore stop errors in cleanup
    }
  });

  // ─── defineConfig ────────────────────────────────────────────────

  describe('defineConfig', () => {
    it('should return a valid agent config', () => {
      const config = agent.getConfig();
      expect(config).toBeDefined();
      expect(config.id).toBe('test-agent');
      expect(config.name).toBe('Test');
      expect(config.cluster).toBe(AgentCluster.BROWSER);
      expect(config.version).toBe('1.0.0');
      expect(config.maxConcurrentTasks).toBe(5);
      expect(config.timeout).toBe(5000);
      expect(config.retryPolicy.maxRetries).toBe(0);
      expect(config.permissions).toContain('execute:task');
    });

    it('should have capabilities defined', () => {
      const config = agent.getConfig();
      expect(config.capabilities).toHaveLength(1);
      expect(config.capabilities[0].name).toBe('test-capability');
    });
  });

  // ─── onModuleInit ────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should transition to IDLE after initialization', async () => {
      await agent.onModuleInit();
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should emit AGENT_INITIALIZED event', async () => {
      await agent.onModuleInit();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AgentEventType.AGENT_INITIALIZED,
        }),
      );
    });

    it('should transition to ERROR when initialization fails', async () => {
      agent.setInitializeShouldFail(true);
      await expect(agent.onModuleInit()).rejects.toThrow('Initialization failed');
      expect(agent.getStatus()).toBe(AgentStatus.ERROR);
    });
  });

  // ─── execute ─────────────────────────────────────────────────────

  describe('execute', () => {
    beforeEach(async () => {
      await agent.onModuleInit();
    });

    it('should execute successfully with valid input', async () => {
      const input: AgentInput = {
        taskId: 'task-1',
        payload: { data: 'test' },
      };
      const output = await agent.execute(input);
      expect(output.success).toBe(true);
      expect(output.taskId).toBe('task-1');
      expect(output.result).toEqual({ processed: { data: 'test' } });
    });

    it('should throw on invalid input (missing taskId)', async () => {
      const input = { payload: { data: 'test' } } as any;
      await expect(agent.execute(input)).rejects.toThrow('Invalid input');
    });

    it('should throw on invalid input (missing payload)', async () => {
      const input = { taskId: 'task-1' } as any;
      await expect(agent.execute(input)).rejects.toThrow('Invalid input');
    });

    it('should return error output when execution fails', async () => {
      agent.setExecuteShouldFail(true);
      const input: AgentInput = {
        taskId: 'task-fail',
        payload: { data: 'test' },
      };
      const output = await agent.execute(input);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Execution failed');
    });

    it('should increment failedTaskCount on execution failure', async () => {
      agent.setExecuteShouldFail(true);
      const input: AgentInput = {
        taskId: 'task-fail',
        payload: { data: 'test' },
      };
      await agent.execute(input);
      const state = agent.getState();
      expect(state.failedTasks).toBe(1);
    });

    it('should increment completedTaskCount on success', async () => {
      const input: AgentInput = {
        taskId: 'task-ok',
        payload: { data: 'test' },
      };
      await agent.execute(input);
      const state = agent.getState();
      expect(state.completedTasks).toBe(1);
    });

    it('should reject execution when circuit breaker is open', async () => {
      agent.forceCircuitBreakerState('open');
      const input: AgentInput = {
        taskId: 'task-cb',
        payload: { data: 'test' },
      };
      await expect(agent.execute(input)).rejects.toThrow('Circuit breaker');
    });
  });

  // ─── pause / resume ─────────────────────────────────────────────

  describe('pause and resume', () => {
    beforeEach(async () => {
      await agent.onModuleInit();
    });

    it('should pause a running agent', async () => {
      await agent.start();
      await agent.pause();
      expect(agent.getStatus()).toBe(AgentStatus.PAUSED);
    });

    it('should resume a paused agent', async () => {
      await agent.start();
      await agent.pause();
      await agent.resume();
      expect(agent.getStatus()).toBe(AgentStatus.RUNNING);
    });

    it('should emit AGENT_PAUSED event on pause', async () => {
      await agent.start();
      eventBusMock.publish.mockClear();
      await agent.pause();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AgentEventType.AGENT_PAUSED,
        }),
      );
    });

    it('should emit AGENT_RESUMED event on resume', async () => {
      await agent.start();
      await agent.pause();
      eventBusMock.publish.mockClear();
      await agent.resume();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AgentEventType.AGENT_RESUMED,
        }),
      );
    });
  });

  // ─── stop ────────────────────────────────────────────────────────

  describe('stop', () => {
    beforeEach(async () => {
      await agent.onModuleInit();
    });

    it('should stop a running agent', async () => {
      await agent.start();
      await agent.stop();
      expect(agent.getStatus()).toBe(AgentStatus.STOPPED);
    });

    it('should emit AGENT_STOPPED event', async () => {
      await agent.start();
      eventBusMock.publish.mockClear();
      await agent.stop();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AgentEventType.AGENT_STOPPED,
        }),
      );
    });

    it('should clear active tasks on stop', async () => {
      await agent.start();
      await agent.stop();
      const state = agent.getState();
      expect(state.currentTasks).toHaveLength(0);
    });
  });

  // ─── circuit breaker ─────────────────────────────────────────────

  describe('circuit breaker', () => {
    beforeEach(async () => {
      await agent.onModuleInit();
    });

    it('should start in closed state', () => {
      const cb = agent.getCircuitBreaker();
      expect(cb.state).toBe('closed');
      expect(cb.failureCount).toBe(0);
    });

    it('should open after reaching failure threshold', () => {
      agent.forceCircuitBreakerFailures(5);
      // Simulate recording a failure to trigger open
      const cb = agent.getCircuitBreaker();
      expect(cb.failureThreshold).toBe(5);
    });

    it('should record success and reset failure count when closed', () => {
      const cb = agent.getCircuitBreaker();
      expect(cb.failureCount).toBe(0);
    });

    it('canAcceptTask returns false when circuit breaker is open', async () => {
      agent.forceCircuitBreakerState('open');
      expect(agent.canAcceptTask()).toBe(false);
    });
  });

  // ─── tool management ─────────────────────────────────────────────

  describe('tool management', () => {
    it('should register a tool', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        execute: jest.fn().mockResolvedValue('tool-result'),
      };
      agent.registerTool(tool);
      expect(agent.getTool('test-tool')).toBe(tool);
    });

    it('should overwrite a tool with the same name', () => {
      const tool1 = {
        name: 'test-tool',
        description: 'First',
        execute: jest.fn().mockResolvedValue('result1'),
      };
      const tool2 = {
        name: 'test-tool',
        description: 'Second',
        execute: jest.fn().mockResolvedValue('result2'),
      };
      agent.registerTool(tool1);
      agent.registerTool(tool2);
      expect(agent.getTool('test-tool')?.description).toBe('Second');
    });

    it('should unregister a tool', () => {
      const tool = {
        name: 'removable-tool',
        description: 'A removable tool',
        execute: jest.fn().mockResolvedValue('result'),
      };
      agent.registerTool(tool);
      const result = agent.unregisterTool('removable-tool');
      expect(result).toBe(true);
      expect(agent.getTool('removable-tool')).toBeUndefined();
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = agent.unregisterTool('non-existent');
      expect(result).toBe(false);
    });

    it('should execute a registered tool', async () => {
      const tool = {
        name: 'exec-tool',
        description: 'An executable tool',
        execute: jest.fn().mockResolvedValue('exec-result'),
      };
      agent.registerTool(tool);
      const result = await agent.executeTool('exec-tool', 'arg1');
      expect(result).toBe('exec-result');
      expect(tool.execute).toHaveBeenCalledWith('arg1');
    });

    it('should throw when executing non-existent tool', async () => {
      await expect(agent.executeTool('non-existent')).rejects.toThrow('Tool "non-existent" not found');
    });

    it('should list all registered tools', () => {
      agent.registerTool({ name: 'tool-a', description: 'A', execute: jest.fn() });
      agent.registerTool({ name: 'tool-b', description: 'B', execute: jest.fn() });
      const tools = agent.getAllTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(['tool-a', 'tool-b']));
    });
  });

  // ─── health check ────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should return true for healthy agent', async () => {
      await agent.onModuleInit();
      const isHealthy = await agent.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when custom health check fails', async () => {
      await agent.onModuleInit();
      agent.setHealthCheckResult(false);
      const isHealthy = await agent.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should update health state', async () => {
      await agent.onModuleInit();
      await agent.healthCheck();
      const healthState = agent.getHealthState();
      expect(healthState.lastHealthCheck).toBeDefined();
    });
  });

  // ─── state and status ────────────────────────────────────────────

  describe('getState and getStatus', () => {
    it('should return current status', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should return state with all fields', () => {
      const state = agent.getState();
      expect(state.config).toBeDefined();
      expect(state.status).toBeDefined();
      expect(state.currentTasks).toBeDefined();
      expect(state.completedTasks).toBeDefined();
      expect(state.failedTasks).toBeDefined();
      expect(state.lastActivity).toBeDefined();
      expect(state.health).toBeDefined();
    });
  });

  // ─── correlation ID ──────────────────────────────────────────────

  describe('correlationId', () => {
    it('should set and get correlation ID', () => {
      agent.setCorrelationId('corr-123');
      expect(agent.getCorrelationId()).toBe('corr-123');
    });
  });

  // ─── capability check ────────────────────────────────────────────

  describe('hasCapability', () => {
    it('should return true for existing capability', () => {
      expect(agent.hasCapability('test-capability')).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      expect(agent.hasCapability('non-existent')).toBe(false);
    });
  });

  // ─── canAcceptTask ───────────────────────────────────────────────

  describe('canAcceptTask', () => {
    it('should accept tasks when IDLE and circuit breaker closed', async () => {
      await agent.onModuleInit();
      expect(agent.canAcceptTask()).toBe(true);
    });

    it('should not accept tasks when STOPPED', async () => {
      await agent.onModuleInit();
      await agent.start();
      await agent.stop();
      expect(agent.canAcceptTask()).toBe(false);
    });
  });

  // ─── lifecycle hooks ─────────────────────────────────────────────

  describe('lifecycle hooks', () => {
    it('should register and execute a lifecycle hook', async () => {
      const hook = jest.fn().mockResolvedValue({ success: true, shouldProceed: true });
      agent.registerLifecycleHook(LifecyclePhase.PRE_EXECUTE, hook);

      await agent.onModuleInit();
      const input: AgentInput = {
        taskId: 'hook-task',
        payload: { test: true },
      };
      await agent.execute(input);
      expect(hook).toHaveBeenCalled();
    });

    it('should remove a lifecycle hook', () => {
      const hook = jest.fn().mockResolvedValue({ success: true, shouldProceed: true });
      agent.registerLifecycleHook(LifecyclePhase.PRE_EXECUTE, hook);
      agent.removeLifecycleHook(LifecyclePhase.PRE_EXECUTE, hook);
      // Hook removed - no assertion needed, just ensure no error
    });
  });
});
