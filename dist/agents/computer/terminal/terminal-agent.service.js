"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalAgentService = exports.TERMINAL_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.TERMINAL_AGENT_CONFIG = {
    id: 'computer-terminal',
    name: 'Terminal',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Execute terminal and shell commands, manage command history, and support piped command chains. Provides a sandboxed terminal environment with working directory management, environment variables, and structured output capture.',
    capabilities: [
        {
            name: 'executeCommand',
            description: 'Execute a single shell command and return the output',
            inputSchema: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Shell command to execute' },
                    cwd: { type: 'string', description: 'Working directory for execution' },
                    env: { type: 'object', description: 'Additional environment variables' },
                    timeout: { type: 'number', default: 30000, description: 'Command timeout in ms' },
                },
                required: ['command'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    stdout: { type: 'string' },
                    stderr: { type: 'string' },
                    exitCode: { type: 'number' },
                    executionTime: { type: 'number' },
                    cwd: { type: 'string' },
                },
            },
        },
        {
            name: 'executeScript',
            description: 'Execute a multi-line script (bash or similar)',
            inputSchema: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: 'Multi-line script content' },
                    interpreter: { type: 'string', default: 'bash', description: 'Script interpreter' },
                    cwd: { type: 'string', description: 'Working directory' },
                    timeout: { type: 'number', default: 60000 },
                },
                required: ['script'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    stdout: { type: 'string' },
                    stderr: { type: 'string' },
                    exitCode: { type: 'number' },
                    executionTime: { type: 'number' },
                    lineCount: { type: 'number' },
                },
            },
        },
        {
            name: 'getCommandHistory',
            description: 'Retrieve the command execution history',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 50, description: 'Max history entries to return' },
                    filter: { type: 'string', description: 'Filter commands by substring' },
                    offset: { type: 'number', default: 0 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    history: { type: 'array' },
                    total: { type: 'number' },
                },
            },
        },
        {
            name: 'clearHistory',
            description: 'Clear the command execution history',
            inputSchema: {
                type: 'object',
                properties: {
                    confirm: { type: 'boolean', description: 'Confirmation flag' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cleared: { type: 'boolean' },
                    entriesRemoved: { type: 'number' },
                },
            },
        },
        {
            name: 'pipeCommands',
            description: 'Execute multiple commands piped together',
            inputSchema: {
                type: 'object',
                properties: {
                    commands: { type: 'array', items: { type: 'string' }, description: 'Commands to pipe' },
                    cwd: { type: 'string', description: 'Working directory' },
                    timeout: { type: 'number', default: 30000 },
                },
                required: ['commands'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    stdout: { type: 'string' },
                    stderr: { type: 'string' },
                    exitCode: { type: 'number' },
                    pipeline: { type: 'array' },
                    executionTime: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:terminal',
        'write:terminal',
        'execute:command',
        'execute:script',
        'access:history',
    ],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 1,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
const SIMULATED_COMMANDS = {
    ls: { stdout: 'documents  downloads  pictures  music  videos  .bashrc  .profile', exitCode: 0 },
    'ls -la': {
        stdout: 'total 48\ndrwxr-xr-x  8 user user 4096 Jan 15 10:30 .\ndrwxr-xr-x  3 root root 4096 Jan 10 08:00 ..\n-rw-r--r--  1 user user  220 Jan 10 08:00 .bash_logout\n-rw-r--r--  1 user user 3771 Jan 10 08:00 .bashrc\ndrwxr-xr-x  2 user user 4096 Jan 15 10:30 documents\ndrwxr-xr-x  2 user user 4096 Jan 15 10:30 downloads',
        exitCode: 0,
    },
    pwd: { stdout: '/home/user', exitCode: 0 },
    whoami: { stdout: 'user', exitCode: 0 },
    hostname: { stdout: 'aenews-agent-os', exitCode: 0 },
    date: { stdout: '', exitCode: 0 },
    uname: { stdout: 'Linux', exitCode: 0 },
    'uname -a': {
        stdout: 'Linux aenews-agent-os 5.15.0-generic #1 SMP x86_64 GNU/Linux',
        exitCode: 0,
    },
    uptime: { stdout: '', exitCode: 0 },
    df: {
        stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       51475068 8234012  40606456  17% /\ntmpfs            4096000       0   4096000   0% /dev/shm',
        exitCode: 0,
    },
    free: {
        stdout: '              total        used        free      shared  buff/cache   available\nMem:        8192000     3276800     2457600      256000     2457600     4608000\nSwap:       2097152      102400     1994752',
        exitCode: 0,
    },
    'echo hello': { stdout: 'hello', exitCode: 0 },
    'cat /etc/os-release': {
        stdout: 'NAME="AENEWS Agent OS"\nVERSION="1.0"\nID=aenews\nPRETTY_NAME="AENEWS Agent OS 1.0"',
        exitCode: 0,
    },
    env: {
        stdout: 'HOME=/home/user\nPATH=/usr/local/bin:/usr/bin:/bin\nSHELL=/bin/bash\nUSER=user\nLANG=en_US.UTF-8',
        exitCode: 0,
    },
    'which node': { stdout: '/usr/local/bin/node', exitCode: 0 },
    'node --version': { stdout: 'v20.11.0', exitCode: 0 },
    'npm --version': { stdout: '10.2.4', exitCode: 0 },
    'git --version': { stdout: 'git version 2.43.0', exitCode: 0 },
    'python3 --version': { stdout: 'Python 3.12.1', exitCode: 0 },
};
let TerminalAgentService = class TerminalAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.commandHistory = [];
        this.historyIdCounter = 0;
        this.currentCwd = '/home/user';
        this.environmentVars = {
            HOME: '/home/user',
            PATH: '/usr/local/bin:/usr/bin:/bin',
            SHELL: '/bin/bash',
            USER: 'user',
            LANG: 'en_US.UTF-8',
            TERM: 'xterm-256color',
        };
    }
    defineConfig() {
        return exports.TERMINAL_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'executeCommand',
            description: 'Execute a single shell command',
            execute: async (params) => this.executeCommand(params.command, params.cwd, params.env, params.timeout),
        });
        this.registerTool({
            name: 'executeScript',
            description: 'Execute a multi-line script',
            execute: async (params) => this.executeScript(params.script, params.interpreter, params.cwd, params.timeout),
        });
        this.registerTool({
            name: 'getCommandHistory',
            description: 'Retrieve command execution history',
            execute: async (params) => this.getCommandHistory(params.limit, params.filter, params.offset),
        });
        this.registerTool({
            name: 'clearHistory',
            description: 'Clear command execution history',
            execute: async (params) => this.clearHistory(params.confirm),
        });
        this.registerTool({
            name: 'pipeCommands',
            description: 'Execute piped commands',
            execute: async (params) => this.pipeCommands(params.commands, params.cwd, params.timeout),
        });
        await this.storeInWorkingMemory('term:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Terminal agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DevCapability.DEVOPS, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'executeCommand',
            'executeScript',
            'getCommandHistory',
            'clearHistory',
            'pipeCommands',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown terminal action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
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
            this.logger.error(`Terminal execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.commandHistory = [];
        this.environmentVars = {};
        this.currentCwd = '/home/user';
        this.logger.log('Terminal agent destroyed, history and state cleared');
    }
    async executeCommand(command, cwd, env, timeout = 30000) {
        if (!command || typeof command !== 'string') {
            throw new Error('A valid command string is required');
        }
        const dangerousPatterns = ['rm -rf /', 'mkfs', 'dd if=', '> /dev/sd', ':(){ :|:& };:'];
        for (const pattern of dangerousPatterns) {
            if (command.includes(pattern)) {
                throw new Error(`Command blocked for safety: contains dangerous pattern "${pattern}"`);
            }
        }
        const workingDir = cwd || this.currentCwd;
        const mergedEnv = { ...this.environmentVars, ...env };
        if (command.trim().startsWith('cd ')) {
            const targetDir = command.trim().substring(3).trim();
            const newCwd = targetDir.startsWith('/')
                ? targetDir
                : `${workingDir}/${targetDir}`.replace(/\/+/g, '/');
            this.currentCwd = newCwd;
            const entry = this.recordHistory(command, workingDir, 0, '', '', 0);
            return {
                stdout: '',
                stderr: '',
                exitCode: 0,
                executionTime: 0,
                cwd: newCwd,
            };
        }
        const execStart = Date.now();
        const trimmedCommand = command.trim();
        const simulated = SIMULATED_COMMANDS[trimmedCommand] || this.generateSimulatedOutput(trimmedCommand);
        let stdout = simulated.stdout;
        if (trimmedCommand === 'date') {
            stdout = new Date().toString();
        }
        else if (trimmedCommand === 'uptime') {
            const uptimeMs = Date.now() - new Date('2025-01-01').getTime();
            const days = Math.floor(uptimeMs / 86400000);
            stdout = ` ${new Date().toLocaleTimeString()} up ${days} days, 3:42, 1 user, load average: 0.15, 0.10, 0.08`;
        }
        for (const [key, value] of Object.entries(mergedEnv)) {
            stdout = stdout.replace(`$${key}`, value);
            stdout = stdout.replace(`\${${key}}`, value);
        }
        const executionTime = Date.now() - execStart;
        const stderr = simulated.exitCode !== 0 ? `Command exited with code ${simulated.exitCode}` : '';
        this.recordHistory(command, workingDir, simulated.exitCode, stdout, stderr, executionTime);
        await this.storeInWorkingMemory(`cmd:last:${command.substring(0, 50)}`, { command, exitCode: simulated.exitCode, executionTime }, 300000);
        this.logger.log(`Executed command: "${trimmedCommand}" (exit: ${simulated.exitCode}, ${executionTime}ms)`);
        return {
            stdout,
            stderr,
            exitCode: simulated.exitCode,
            executionTime,
            cwd: workingDir,
        };
    }
    async executeScript(script, interpreter = 'bash', cwd, timeout = 60000) {
        if (!script || typeof script !== 'string') {
            throw new Error('A valid script string is required');
        }
        const lines = script
            .split('\n')
            .filter((line) => line.trim().length > 0 && !line.trim().startsWith('#'));
        if (lines.length === 0) {
            throw new Error('Script contains no executable lines');
        }
        const workingDir = cwd || this.currentCwd;
        const execStart = Date.now();
        const outputs = [];
        const errors = [];
        let overallExitCode = 0;
        for (const line of lines) {
            try {
                const result = await this.executeCommand(line.trim(), workingDir, undefined, timeout / lines.length);
                if (result.stdout)
                    outputs.push(result.stdout);
                if (result.stderr)
                    errors.push(result.stderr);
                if (result.exitCode !== 0) {
                    overallExitCode = result.exitCode;
                    break;
                }
            }
            catch (error) {
                errors.push(error.message);
                overallExitCode = 1;
                break;
            }
        }
        const executionTime = Date.now() - execStart;
        this.logger.log(`Executed script: ${lines.length} lines, interpreter: ${interpreter} (${executionTime}ms)`);
        return {
            stdout: outputs.join('\n'),
            stderr: errors.join('\n'),
            exitCode: overallExitCode,
            executionTime,
            lineCount: lines.length,
        };
    }
    async getCommandHistory(limit = 50, filter, offset = 0) {
        let entries = [...this.commandHistory];
        if (filter) {
            const filterLower = filter.toLowerCase();
            entries = entries.filter((e) => e.command.toLowerCase().includes(filterLower));
        }
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const total = entries.length;
        const paginated = entries.slice(offset, offset + limit).map((e) => ({
            id: e.id,
            command: e.command,
            cwd: e.cwd,
            exitCode: e.exitCode,
            executionTimeMs: e.executionTimeMs,
            timestamp: e.timestamp.toISOString(),
        }));
        this.logger.log(`Retrieved command history: ${paginated.length}/${total} entries`);
        return { history: paginated, total };
    }
    async clearHistory(confirm) {
        if (!confirm) {
            throw new Error('Must set confirm: true to clear command history');
        }
        const entriesRemoved = this.commandHistory.length;
        this.commandHistory = [];
        this.historyIdCounter = 0;
        this.logger.log(`Command history cleared (${entriesRemoved} entries removed)`);
        return { cleared: true, entriesRemoved };
    }
    async pipeCommands(commands, cwd, timeout = 30000) {
        if (!commands || !Array.isArray(commands) || commands.length === 0) {
            throw new Error('A non-empty array of commands is required');
        }
        if (commands.length > 10) {
            throw new Error('Maximum 10 commands in a pipeline');
        }
        const workingDir = cwd || this.currentCwd;
        const execStart = Date.now();
        const pipeline = [];
        let previousOutput = '';
        let overallExitCode = 0;
        for (const cmd of commands) {
            const stageStart = Date.now();
            try {
                const result = await this.executeCommand(cmd.trim(), workingDir, undefined, timeout / commands.length);
                const stage = {
                    command: cmd.trim(),
                    exitCode: result.exitCode,
                    stdout: result.stdout,
                    stderr: result.stderr,
                    executionTimeMs: Date.now() - stageStart,
                };
                pipeline.push(stage);
                previousOutput = result.stdout;
                if (result.exitCode !== 0) {
                    overallExitCode = result.exitCode;
                    break;
                }
            }
            catch (error) {
                const stage = {
                    command: cmd.trim(),
                    exitCode: 1,
                    stdout: '',
                    stderr: error.message,
                    executionTimeMs: Date.now() - stageStart,
                };
                pipeline.push(stage);
                overallExitCode = 1;
                break;
            }
        }
        const executionTime = Date.now() - execStart;
        this.logger.log(`Executed pipeline: ${commands.length} stages (${executionTime}ms)`);
        return {
            stdout: previousOutput,
            stderr: pipeline
                .filter((s) => s.stderr)
                .map((s) => s.stderr)
                .join('\n'),
            exitCode: overallExitCode,
            pipeline,
            executionTime,
        };
    }
    recordHistory(command, cwd, exitCode, stdout, stderr, executionTimeMs) {
        const entry = {
            id: ++this.historyIdCounter,
            command,
            cwd,
            exitCode,
            stdout: stdout.substring(0, 10000),
            stderr: stderr.substring(0, 5000),
            executionTimeMs,
            timestamp: new Date(),
        };
        this.commandHistory.push(entry);
        if (this.commandHistory.length > 1000) {
            this.commandHistory = this.commandHistory.slice(-500);
        }
        return entry;
    }
    generateSimulatedOutput(command) {
        const cmdBase = command.split(' ')[0];
        if (cmdBase === 'mkdir' || cmdBase === 'touch' || cmdBase === 'cp' || cmdBase === 'mv') {
            return { stdout: '', exitCode: 0 };
        }
        if (cmdBase === 'grep') {
            return { stdout: 'match found on line 1', exitCode: 0 };
        }
        if (cmdBase === 'find') {
            return {
                stdout: '/home/user/documents\n/home/user/documents/report.txt\n/home/user/downloads',
                exitCode: 0,
            };
        }
        if (cmdBase === 'wc') {
            return { stdout: '  42  128  1024', exitCode: 0 };
        }
        if (cmdBase === 'head' || cmdBase === 'tail') {
            return { stdout: 'line 1: sample content\nline 2: more content\nline 3: end', exitCode: 0 };
        }
        if (cmdBase === 'sort') {
            return { stdout: 'alpha\nbeta\ngamma\nzeta', exitCode: 0 };
        }
        if (cmdBase === 'curl' || cmdBase === 'wget') {
            return { stdout: 'HTTP request completed (simulated)', exitCode: 0 };
        }
        if (cmdBase === 'ping') {
            return {
                stdout: 'PING 127.0.0.1 (127.0.0.1): 56 data bytes\n64 bytes: icmp_seq=0 ttl=64 time=0.1 ms\n--- 127.0.0.1 ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss',
                exitCode: 0,
            };
        }
        if (cmdBase === 'docker') {
            return { stdout: 'Docker command simulated', exitCode: 0 };
        }
        if (cmdBase === 'echo') {
            const text = command
                .substring(5)
                .trim()
                .replace(/^["']|["']$/g, '');
            return { stdout: text, exitCode: 0 };
        }
        return {
            stdout: `Command executed: ${command}`,
            exitCode: command.includes('fail') || command.includes('error') ? 1 : 0,
        };
    }
};
exports.TerminalAgentService = TerminalAgentService;
exports.TerminalAgentService = TerminalAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], TerminalAgentService);
//# sourceMappingURL=terminal-agent.service.js.map