"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManagerAgentService = exports.PROCESS_MANAGER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.PROCESS_MANAGER_AGENT_CONFIG = {
    id: 'computer-process',
    name: 'ProcessManager',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Manage system processes: start, stop, monitor, and list running processes. Provides process lifecycle management with resource tracking, signal handling, and health monitoring.',
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
let ProcessManagerAgentService = class ProcessManagerAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.processes = new Map();
        this.nextPid = 1000;
        this.monitorResults = new Map();
    }
    defineConfig() {
        return exports.PROCESS_MANAGER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedSystemProcesses();
        this.registerTool({
            name: 'startProcess',
            description: 'Start a new process',
            execute: async (params) => this.startProcess(params.command, params.args, params.cwd, params.env, params.detached),
        });
        this.registerTool({
            name: 'stopProcess',
            description: 'Gracefully stop a running process',
            execute: async (params) => this.stopProcess(params.pid, params.signal, params.timeout),
        });
        this.registerTool({
            name: 'listProcesses',
            description: 'List running processes',
            execute: async (params) => this.listProcesses(params.filter, params.sortBy, params.limit),
        });
        this.registerTool({
            name: 'getProcessInfo',
            description: 'Get detailed process information',
            execute: async (params) => this.getProcessInfo(params.pid),
        });
        this.registerTool({
            name: 'monitorProcess',
            description: 'Monitor process for changes',
            execute: async (params) => this.monitorProcess(params.pid, params.duration, params.interval),
        });
        this.registerTool({
            name: 'killProcess',
            description: 'Force kill a process',
            execute: async (params) => this.killProcess(params.pid, params.signal),
        });
        await this.storeInWorkingMemory('pm:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('ProcessManager agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'startProcess', 'stopProcess', 'listProcesses',
            'getProcessInfo', 'monitorProcess', 'killProcess',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown process action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`ProcessManager execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
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
    async startProcess(command, args = [], cwd = '/home/user', env = {}, detached = false) {
        if (!command || typeof command !== 'string') {
            throw new Error('A valid command string is required');
        }
        const pid = this.nextPid++;
        const process = {
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
    async stopProcess(pid, signal = 'SIGTERM', timeout = 5000) {
        const process = this.processes.get(pid);
        if (!process) {
            throw new Error(`Process not found: PID ${pid}`);
        }
        if (process.status !== 'running' && process.status !== 'sleeping') {
            throw new Error(`Process ${pid} is not running (status: ${process.status})`);
        }
        if (signal === 'SIGTERM') {
            const willStopGracefully = Math.random() > 0.1;
            if (willStopGracefully) {
                process.status = 'stopped';
                process.exitCode = 0;
            }
            else {
                this.logger.warn(`Process ${pid} did not stop gracefully within ${timeout}ms`);
                process.status = 'stopped';
                process.exitCode = -9;
            }
        }
        else if (signal === 'SIGINT') {
            process.status = 'stopped';
            process.exitCode = 130;
        }
        else {
            process.status = 'stopped';
            process.exitCode = 1;
        }
        this.logger.log(`Stopped process: PID ${pid} (signal: ${signal}, exit: ${process.exitCode})`);
        return {
            pid,
            stopped: true,
            signal,
            exitCode: process.exitCode,
        };
    }
    async listProcesses(filter, sortBy = 'pid', limit = 50) {
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
        if (filter) {
            const filterLower = filter.toLowerCase();
            processList = processList.filter((p) => p.command.toLowerCase().includes(filterLower) ||
                p.pid.toString().includes(filterLower));
        }
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
    async getProcessInfo(pid) {
        const process = this.processes.get(pid);
        if (!process) {
            throw new Error(`Process not found: PID ${pid}`);
        }
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
    async monitorProcess(pid, duration = 10000, interval = 1000) {
        const process = this.processes.get(pid);
        if (!process) {
            throw new Error(`Process not found: PID ${pid}`);
        }
        const samples = [];
        const sampleCount = Math.floor(duration / interval);
        let totalCpu = 0;
        let totalMemory = 0;
        let exited = false;
        for (let i = 0; i < sampleCount; i++) {
            if (process.status !== 'running' && process.status !== 'sleeping') {
                exited = true;
                break;
            }
            process.cpuUsage = Math.max(0, Math.min(100, process.cpuUsage + (Math.random() - 0.5) * 10));
            process.memoryUsage = Math.max(1, process.memoryUsage + (Math.random() - 0.5) * 8);
            const sample = {
                timestamp: new Date().toISOString(),
                cpu: Math.round(process.cpuUsage * 100) / 100,
                memory: Math.round(process.memoryUsage * 100) / 100,
                status: process.status,
            };
            samples.push(sample);
            totalCpu += sample.cpu;
            totalMemory += sample.memory;
            if (i < sampleCount - 1) {
                await this.sleep(Math.min(interval, 100));
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
    async killProcess(pid, signal = 'SIGKILL') {
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
    seedSystemProcesses() {
        const systemProcesses = [
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
};
exports.ProcessManagerAgentService = ProcessManagerAgentService;
exports.ProcessManagerAgentService = ProcessManagerAgentService = __decorate([
    (0, common_1.Injectable)()
], ProcessManagerAgentService);
//# sourceMappingURL=process-manager-agent.service.js.map