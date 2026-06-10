/**
 * AENEWS Agent OS X - Process Manager Agent
 * Manages system processes: start, stop, monitor, list processes.
 * Simulates process management for environments without direct OS access.
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

export const PROCESS_MANAGER_AGENT_CONFIG: AgentConfig = {
  id: 'computer-process',
  name: 'ProcessManager',
  cluster: AgentCluster.COMPUTER,
  version: '1.0.0',
  description:
    'Manage system processes: start, stop, monitor, and list running processes. Provides process lifecycle management with resource tracking, signal handling, and health monitoring.',
  capabilities: [
    {
      name: 'startProcess',
      description: 'Start a new process with the specified command and arguments',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
          cwd: { type: 'string', description: 'Working directory' },
          env: { type: 'object', description: 'Environment variables' },
          detached: { type: 'boolean', default: false },
        },
        required: ['command'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number' },
          command: { type: 'string' },
          status: { type: 'string' },
          startedAt: { type: 'string' },
        },
      },
    },
    {
      name: 'stopProcess',
      description: 'Gracefully stop a running process by PID',
      inputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number', description: 'Process ID to stop' },
          signal: { type: 'string', default: 'SIGTERM', description: 'Signal to send' },
          timeout: { type: 'number', default: 5000, description: 'Grace period in ms before SIGKILL' },
        },
        required: ['pid'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number' },
          stopped: { type: 'boolean' },
          signal: { type: 'string' },
          exitCode: { type: 'number' },
        },
      },
    },
    {
      name: 'listProcesses',
      description: 'List all running processes with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter by name or command' },
          sortBy: { type: 'string', enum: ['pid', 'name', 'cpu', 'memory'], default: 'pid' },
          limit: { type: 'number', default: 50 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          processes: { type: 'array' },
          total: { type: 'number' },
        },
      },
    },
    {
      name: 'getProcessInfo',
      description: 'Get detailed information about a specific process',
      inputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number', description: 'Process ID' },
        },
        required: ['pid'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number' },
          command: { type: 'string' },
          status: { type: 'string' },
          cpu: { type: 'number' },
          memory: { type: 'number' },
          uptime: { type: 'number' },
        },
      },
    },
    {
      name: 'monitorProcess',
      description: 'Monitor a process for status changes and resource usage',
      inputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number', description: 'Process ID to monitor' },
          duration: { type: 'number', default: 10000, description: 'Monitoring duration in ms' },
          interval: { type: 'number', default: 1000, description: 'Sampling interval in ms' },
        },
        required: ['pid'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number' },
          samples: { type: 'array' },
          avgCpu: { type: 'number' },
          avgMemory: { type: 'number' },
          exited: { type: 'boolean' },
          exitCode: { type: 'number' },
        },
      },
    },
    {
      name: 'killProcess',
      description: 'Forcefully kill a process by PID',
      inputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number', description: 'Process ID to kill' },
          signal: { type: 'string', default: 'SIGKILL' },
        },
        required: ['pid'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          pid: { type: 'number' },
          killed: { type: 'boolean' },
          signal: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:process',
    'write:process',
    'start:process',
    'stop:process',
    'kill:process',
    'monitor:process',
  ],
  maxConcurrentTasks: 10,
  timeout: 20000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 800,
    exponentialBackoff: true,
  },
};

// ─── Process Types ────────────────────────────────────────────────

type ProcessStatus = 'running' | 'stopped' | 'sleeping' | 'zombie' | 'idle';

interface SimulatedProcess {
  pid: number;
  ppid: number;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  status: ProcessStatus;
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  startedAt: Date;
  exitCode: number | null;
  stdout: string[];
  stderr: string[];
}

interface MonitorSample {
  timestamp: string;
  cpu: number;
  memory: number;
  status: ProcessStatus;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ProcessManagerAgentService extends BaseAgentService {
  private processes: Map<number, SimulatedProcess> = new Map();
  private nextPid = 1000;
  private monitorResults: Map<number, MonitorSample[]> = new Map();

  protected defineConfig(): AgentConfig {
    return PROCESS_MANAGER_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Seed some system processes
    this.seedSystemProcesses();

    // Register tools
    this.registerTool({
      name: 'startProcess',
      description: 'Start a new process',
      execute: async (params: { command: string; args?: string[]; cwd?: string; env?: Record<string, string>; detached?: boolean }) =>
        this.startProcess(params.command, params.args, params.cwd, params.env, params.detached),
    });

    this.registerTool({
      name: 'stopProcess',
      description: 'Gracefully stop a running process',
      execute: async (params: { pid: number; signal?: string; timeout?: number }) =>
        this.stopProcess(params.pid, params.signal, params.timeout),
    });

    this.registerTool({
      name: 'listProcesses',
      description: 'List running processes',
      execute: async (params: { filter?: string; sortBy?: string; limit?: number }) =>
        this.listProcesses(params.filter, params.sortBy, params.limit),
    });

    this.registerTool({
      name: 'getProcessInfo',
      description: 'Get detailed process information',
      execute: async (params: { pid: number }) => this.getProcessInfo(params.pid),
    });

    this.registerTool({
      name: 'monitorProcess',
      description: 'Monitor process for changes',
      execute: async (params: { pid: number; duration?: number; interval?: number }) =>
        this.monitorProcess(params.pid, params.duration, params.interval),
    });

    this.registerTool({
      name: 'killProcess',
      description: 'Force kill a process',
      execute: async (params: { pid: number; signal?: string }) =>
        this.killProcess(params.pid, params.signal),
    });

    await this.storeInWorkingMemory('pm:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('ProcessManager agent initialized with 6 tools');
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
      'startProcess', 'stopProcess', 'listProcesses',
      'getProcessInfo', 'monitorProcess', 'killProcess',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown process action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
      }

      const result = await tool.execute(params);
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`ProcessManager execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    // Stop all managed processes
    for (const [pid, process] of this.processes) {
      if (process.status === 'running') {
        process.status = 'stopped';
        process.exitCode = -1;
        this.logger.log(`Stopped process ${pid} (${process.command}) during destroy`);
      }
    }
    this.processes.clear();
    this.monitorResults.clear();
    this.logger.log('ProcessManager agent destroyed, all processes stopped');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async startProcess(
    command: string,
    args: string[] = [],
    cwd: string = '/home/user',
    env: Record<string, string> = {},
    detached: boolean = false,
  ): Promise<{ pid: number; command: string; status: string; startedAt: string }> {
    if (!command || typeof command !== 'string') {
      throw new Error('A valid command string is required');
    }

    const pid = this.nextPid++;
    const process: SimulatedProcess = {
      pid,
      ppid: 1,
      command,
      args,
      cwd,
      env: { PATH: '/usr/bin:/bin', HOME: '/home/user', ...env },
      status: 'running',
      cpuUsage: Math.random() * 5,
      memoryUsage: Math.random() * 50 + 10,
      startedAt: new Date(),
      exitCode: null,
      stdout: [],
      stderr: [],
    };

    this.processes.set(pid, process);

    // Simulate some processes completing quickly
    const quickCommands = ['echo', 'ls', 'pwd', 'whoami', 'date', 'hostname'];
    if (quickCommands.some((cmd) => command.includes(cmd)) && !detached) {
      process.stdout.push(`Simulated output for: ${command} ${args.join(' ')}`);
    }

    await this.storeInWorkingMemory(`process:${pid}`, { pid, command, startedAt: process.startedAt }, 3600000);

    this.logger.log(`Started process: PID ${pid} - ${command} ${args.join(' ')}`);
    return {
      pid,
      command: `${command} ${args.join(' ')}`.trim(),
      status: process.status,
      startedAt: process.startedAt.toISOString(),
    };
  }

  private async stopProcess(
    pid: number,
    signal: string = 'SIGTERM',
    timeout: number = 5000,
  ): Promise<{ pid: number; stopped: boolean; signal: string; exitCode: number }> {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`Process not found: PID ${pid}`);
    }
    if (process.status !== 'running' && process.status !== 'sleeping') {
      throw new Error(`Process ${pid} is not running (status: ${process.status})`);
    }

    // Simulate graceful shutdown
    if (signal === 'SIGTERM') {
      // Simulate that process may take some time to stop
      const willStopGracefully = Math.random() > 0.1; // 90% chance of graceful stop
      if (willStopGracefully) {
        process.status = 'stopped';
        process.exitCode = 0;
      } else {
        // Process didn't stop in time, would need SIGKILL
        this.logger.warn(`Process ${pid} did not stop gracefully within ${timeout}ms`);
        process.status = 'stopped';
        process.exitCode = -9;
      }
    } else if (signal === 'SIGINT') {
      process.status = 'stopped';
      process.exitCode = 130; // Standard SIGINT exit code
    } else {
      process.status = 'stopped';
      process.exitCode = 1;
    }

    this.logger.log(`Stopped process: PID ${pid} (signal: ${signal}, exit: ${process.exitCode})`);
    return {
      pid,
      stopped: true,
      signal,
      exitCode: process.exitCode!,
    };
  }

  private async listProcesses(
    filter?: string,
    sortBy: string = 'pid',
    limit: number = 50,
  ): Promise<{
    processes: Array<{
      pid: number;
      command: string;
      status: ProcessStatus;
      cpu: number;
      memory: number;
      uptime: number;
    }>;
    total: number;
  }> {
    let processList = Array.from(this.processes.values())
      .filter((p) => p.status === 'running' || p.status === 'sleeping')
      .map((p) => ({
        pid: p.pid,
        command: `${p.command} ${p.args.join(' ')}`.trim(),
        status: p.status,
        cpu: Math.round(p.cpuUsage * 100) / 100,
        memory: Math.round(p.memoryUsage * 100) / 100,
        uptime: Date.now() - p.startedAt.getTime(),
      }));

    // Apply filter
    if (filter) {
      const filterLower = filter.toLowerCase();
      processList = processList.filter(
        (p) =>
          p.command.toLowerCase().includes(filterLower) ||
          p.pid.toString().includes(filterLower),
      );
    }

    // Apply sort
    switch (sortBy) {
      case 'name':
        processList.sort((a, b) => a.command.localeCompare(b.command));
        break;
      case 'cpu':
        processList.sort((a, b) => b.cpu - a.cpu);
        break;
      case 'memory':
        processList.sort((a, b) => b.memory - a.memory);
        break;
      case 'pid':
      default:
        processList.sort((a, b) => a.pid - b.pid);
        break;
    }

    const total = processList.length;
    processList = processList.slice(0, limit);

    this.logger.log(`Listed ${processList.length} processes (total: ${total})`);
    return { processes: processList, total };
  }

  private async getProcessInfo(pid: number): Promise<{
    pid: number;
    ppid: number;
    command: string;
    args: string[];
    cwd: string;
    status: ProcessStatus;
    cpu: number;
    memory: number;
    uptime: number;
    startedAt: string;
    exitCode: number | null;
    stdout: string[];
    stderr: string[];
  }> {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`Process not found: PID ${pid}`);
    }

    // Fluctuate CPU/memory slightly to simulate real behavior
    if (process.status === 'running') {
      process.cpuUsage = Math.max(0, process.cpuUsage + (Math.random() - 0.5) * 2);
      process.memoryUsage = Math.max(1, process.memoryUsage + (Math.random() - 0.5) * 5);
    }

    this.logger.log(`Got process info: PID ${pid}`);
    return {
      pid: process.pid,
      ppid: process.ppid,
      command: process.command,
      args: process.args,
      cwd: process.cwd,
      status: process.status,
      cpu: Math.round(process.cpuUsage * 100) / 100,
      memory: Math.round(process.memoryUsage * 100) / 100,
      uptime: Date.now() - process.startedAt.getTime(),
      startedAt: process.startedAt.toISOString(),
      exitCode: process.exitCode,
      stdout: process.stdout,
      stderr: process.stderr,
    };
  }

  private async monitorProcess(
    pid: number,
    duration: number = 10000,
    interval: number = 1000,
  ): Promise<{
    pid: number;
    samples: MonitorSample[];
    avgCpu: number;
    avgMemory: number;
    exited: boolean;
    exitCode: number | null;
  }> {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`Process not found: PID ${pid}`);
    }

    const samples: MonitorSample[] = [];
    const sampleCount = Math.floor(duration / interval);
    let totalCpu = 0;
    let totalMemory = 0;
    let exited = false;

    for (let i = 0; i < sampleCount; i++) {
      if (process.status !== 'running' && process.status !== 'sleeping') {
        exited = true;
        break;
      }

      // Simulate resource fluctuation
      process.cpuUsage = Math.max(0, Math.min(100, process.cpuUsage + (Math.random() - 0.5) * 10));
      process.memoryUsage = Math.max(1, process.memoryUsage + (Math.random() - 0.5) * 8);

      const sample: MonitorSample = {
        timestamp: new Date().toISOString(),
        cpu: Math.round(process.cpuUsage * 100) / 100,
        memory: Math.round(process.memoryUsage * 100) / 100,
        status: process.status,
      };

      samples.push(sample);
      totalCpu += sample.cpu;
      totalMemory += sample.memory;

      if (i < sampleCount - 1) {
        await this.sleep(Math.min(interval, 100)); // Simulated wait (compressed)
      }
    }

    const sampleCount_actual = samples.length || 1;
    const result = {
      pid,
      samples,
      avgCpu: Math.round((totalCpu / sampleCount_actual) * 100) / 100,
      avgMemory: Math.round((totalMemory / sampleCount_actual) * 100) / 100,
      exited,
      exitCode: process.exitCode,
    };

    this.monitorResults.set(pid, samples);
    this.logger.log(`Monitored process: PID ${pid} (${samples.length} samples, avg CPU: ${result.avgCpu}%)`);
    return result;
  }

  private async killProcess(
    pid: number,
    signal: string = 'SIGKILL',
  ): Promise<{ pid: number; killed: boolean; signal: string }> {
    const process = this.processes.get(pid);
    if (!process) {
      throw new Error(`Process not found: PID ${pid}`);
    }
    if (process.status !== 'running' && process.status !== 'sleeping') {
      throw new Error(`Process ${pid} is not running (status: ${process.status})`);
    }

    process.status = 'stopped';
    process.exitCode = signal === 'SIGKILL' ? -9 : -1;

    this.logger.log(`Killed process: PID ${pid} (signal: ${signal})`);
    return { pid, killed: true, signal };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private seedSystemProcesses(): void {
    const systemProcesses: Array<{ command: string; cpu: number; memory: number }> = [
      { command: 'systemd', cpu: 0.1, memory: 12 },
      { command: 'sshd', cpu: 0.05, memory: 4 },
      { command: 'cron', cpu: 0.02, memory: 2 },
      { command: 'nginx', cpu: 1.5, memory: 28 },
      { command: 'node', cpu: 8.2, memory: 145 },
      { command: 'postgres', cpu: 3.4, memory: 85 },
      { command: 'redis-server', cpu: 0.8, memory: 22 },
    ];

    for (const sp of systemProcesses) {
      const pid = this.nextPid++;
      this.processes.set(pid, {
        pid,
        ppid: 1,
        command: sp.command,
        args: [],
        cwd: '/',
        env: {},
        status: 'running',
        cpuUsage: sp.cpu,
        memoryUsage: sp.memory,
        startedAt: new Date(Date.now() - Math.random() * 86400000),
        exitCode: null,
        stdout: [],
        stderr: [],
      });
    }
  }
}
