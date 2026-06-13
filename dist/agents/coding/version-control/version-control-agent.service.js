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
exports.VersionControlAgentService = exports.VERSION_CONTROL_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.VERSION_CONTROL_AGENT_CONFIG = {
    id: 'coding-version-control',
    name: 'VersionControl',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Manage Git operations including commits, branching, merging, rebasing, conflict resolution, diffs, and log inspection. Provides a virtualized repository for safe operations.',
    capabilities: [
        {
            name: 'commit',
            description: 'Stage and commit changes with a message',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Commit message' },
                    files: { type: 'array', items: { type: 'string' }, description: 'Files to stage' },
                    author: { type: 'string', description: 'Commit author' },
                    amend: { type: 'boolean', default: false },
                },
                required: ['message'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    hash: { type: 'string' },
                    message: { type: 'string' },
                    files: { type: 'array', items: { type: 'string' } },
                    branch: { type: 'string' },
                },
            },
        },
        {
            name: 'branch',
            description: 'Create, list, switch, or delete branches',
            inputSchema: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['create', 'list', 'switch', 'delete'],
                        description: 'Branch action',
                    },
                    name: { type: 'string', description: 'Branch name (for create/switch/delete)' },
                    startPoint: { type: 'string', description: 'Starting point for new branch' },
                    force: { type: 'boolean', default: false },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    branches: { type: 'array', items: { type: 'object' } },
                    currentBranch: { type: 'string' },
                    action: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        {
            name: 'merge',
            description: 'Merge a branch into the current branch',
            inputSchema: {
                type: 'object',
                properties: {
                    sourceBranch: { type: 'string', description: 'Branch to merge from' },
                    strategy: { type: 'string', enum: ['merge', 'squash', 'fast-forward'], default: 'merge' },
                    message: { type: 'string', description: 'Merge commit message' },
                },
                required: ['sourceBranch'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    merged: { type: 'boolean' },
                    strategy: { type: 'string' },
                    hash: { type: 'string' },
                    conflicts: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'rebase',
            description: 'Rebase the current branch onto another branch',
            inputSchema: {
                type: 'object',
                properties: {
                    onto: { type: 'string', description: 'Branch to rebase onto' },
                    interactive: { type: 'boolean', default: false },
                    continueAfterConflict: { type: 'boolean', default: false },
                },
                required: ['onto'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rebased: { type: 'boolean' },
                    onto: { type: 'string' },
                    commitsRebased: { type: 'number' },
                    conflicts: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'resolveConflict',
            description: 'Resolve a merge or rebase conflict',
            inputSchema: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'File with conflict' },
                    resolution: {
                        type: 'string',
                        enum: ['ours', 'theirs', 'manual'],
                        description: 'Resolution strategy',
                    },
                    manualContent: { type: 'string', description: 'Manual resolution content' },
                    conflictMarkers: { type: 'object', description: 'Parsed conflict markers' },
                },
                required: ['file', 'resolution'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    resolved: { type: 'boolean' },
                    file: { type: 'string' },
                    resolution: { type: 'string' },
                    content: { type: 'string' },
                },
            },
        },
        {
            name: 'getDiff',
            description: 'Get the diff between commits, branches, or the working tree',
            inputSchema: {
                type: 'object',
                properties: {
                    from: { type: 'string', description: 'Source ref (commit, branch, tag)' },
                    to: { type: 'string', description: 'Target ref (commit, branch, tag)' },
                    paths: { type: 'array', items: { type: 'string' }, description: 'File paths to diff' },
                    contextLines: { type: 'number', default: 3 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    diff: { type: 'string' },
                    filesChanged: { type: 'number' },
                    additions: { type: 'number' },
                    deletions: { type: 'number' },
                },
            },
        },
        {
            name: 'getLog',
            description: 'Get commit history log',
            inputSchema: {
                type: 'object',
                properties: {
                    maxCount: { type: 'number', default: 20 },
                    branch: { type: 'string', description: 'Branch to show log for' },
                    author: { type: 'string', description: 'Filter by author' },
                    since: { type: 'string', description: 'Filter commits since date' },
                    until: { type: 'string', description: 'Filter commits until date' },
                    path: { type: 'string', description: 'Filter by file path' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    commits: { type: 'array', items: { type: 'object' } },
                    totalCommits: { type: 'number' },
                    branch: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:repository',
        'write:repository',
        'execute:git',
        'read:branches',
    ],
    maxConcurrentTasks: 4,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let VersionControlAgentService = class VersionControlAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.commits = new Map();
        this.branches = new Map();
        this.currentBranch = 'main';
        this.stagingArea = new Set();
        this.workingTree = new Map();
        this.headHash = '';
    }
    defineConfig() {
        return exports.VERSION_CONTROL_AGENT_CONFIG;
    }
    async onInitialize() {
        this.initializeVirtualRepo();
        this.registerTool({
            name: 'commit',
            description: 'Stage and commit changes',
            execute: async (params) => this.commit(params),
        });
        this.registerTool({
            name: 'branch',
            description: 'Manage branches',
            execute: async (params) => this.branch(params),
        });
        this.registerTool({
            name: 'merge',
            description: 'Merge a branch',
            execute: async (params) => this.merge(params),
        });
        this.registerTool({
            name: 'rebase',
            description: 'Rebase current branch',
            execute: async (params) => this.rebase(params),
        });
        this.registerTool({
            name: 'resolveConflict',
            description: 'Resolve a merge/rebase conflict',
            execute: async (params) => this.resolveConflict(params),
        });
        this.registerTool({
            name: 'getDiff',
            description: 'Get diff between refs',
            execute: async (params) => this.getDiff(params),
        });
        this.registerTool({
            name: 'getLog',
            description: 'Get commit history',
            execute: async (params) => this.getLog(params),
        });
        await this.storeInWorkingMemory('vcs:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('VersionControl agent initialized with 7 tools');
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
                this.logger.warn(`Bridge failed, fallback to local: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'commit',
            'branch',
            'merge',
            'rebase',
            'resolveConflict',
            'getDiff',
            'getLog',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown version control action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`vcs:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`VersionControl execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.commits.clear();
        this.branches.clear();
        this.stagingArea.clear();
        this.workingTree.clear();
        this.logger.log('VersionControl agent destroyed, virtual repository cleared');
    }
    initializeVirtualRepo() {
        const initialHash = this.generateHash();
        const initialCommit = {
            hash: initialHash,
            message: 'Initial commit',
            author: 'system',
            date: new Date(),
            parentHashes: [],
            branch: 'main',
            files: ['README.md', '.gitignore'],
        };
        this.commits.set(initialHash, initialCommit);
        this.branches.set('main', {
            name: 'main',
            headHash: initialHash,
            isCurrent: true,
            created: new Date(),
        });
        const developHash = this.generateHash();
        const developCommit = {
            hash: developHash,
            message: 'Set up project structure',
            author: 'system',
            date: new Date(),
            parentHashes: [initialHash],
            branch: 'develop',
            files: ['package.json', 'tsconfig.json', 'src/index.ts'],
        };
        this.commits.set(developHash, developCommit);
        this.branches.set('develop', {
            name: 'develop',
            headHash: developHash,
            isCurrent: false,
            created: new Date(),
        });
        this.headHash = initialHash;
        this.workingTree.set('README.md', '# Project\n\nA new project.');
        this.workingTree.set('.gitignore', 'node_modules/\ndist/\n.env');
        this.workingTree.set('package.json', '{"name": "project", "version": "1.0.0"}');
    }
    async commit(params) {
        const { message, files = [], author = 'developer', amend = false } = params;
        if (!message || typeof message !== 'string') {
            throw new Error('Commit message is required');
        }
        if (message.length > 500) {
            throw new Error('Commit message is too long (max 500 characters)');
        }
        let parentHashes;
        if (amend) {
            const currentBranch = this.branches.get(this.currentBranch);
            if (!currentBranch) {
                throw new Error('No current branch found');
            }
            const lastCommit = this.commits.get(currentBranch.headHash);
            if (!lastCommit) {
                throw new Error('No commit to amend');
            }
            parentHashes = lastCommit.parentHashes;
            this.commits.delete(currentBranch.headHash);
        }
        else {
            const currentBranch = this.branches.get(this.currentBranch);
            parentHashes = currentBranch ? [currentBranch.headHash] : [];
        }
        const hash = this.generateHash();
        const stagedFiles = files.length > 0 ? files : Array.from(this.stagingArea);
        if (stagedFiles.length === 0 && !amend) {
            throw new Error('No files staged for commit. Stage files before committing.');
        }
        const commit = {
            hash,
            message,
            author,
            date: new Date(),
            parentHashes,
            branch: this.currentBranch,
            files: stagedFiles,
        };
        this.commits.set(hash, commit);
        const branch = this.branches.get(this.currentBranch);
        if (branch) {
            branch.headHash = hash;
        }
        this.headHash = hash;
        this.stagingArea.clear();
        this.logger.log(`Commit: ${hash.substring(0, 8)} "${message}" on ${this.currentBranch}`);
        return {
            hash,
            message,
            files: stagedFiles,
            branch: this.currentBranch,
            author,
        };
    }
    async branch(params) {
        const { action, name, startPoint, force = false } = params;
        switch (action) {
            case 'create': {
                if (!name)
                    throw new Error('Branch name is required for create action');
                if (this.branches.has(name) && !force) {
                    throw new Error(`Branch "${name}" already exists. Use force: true to overwrite.`);
                }
                const headHash = startPoint
                    ? this.branches.get(startPoint)?.headHash ||
                        this.commits.get(startPoint)?.hash ||
                        this.headHash
                    : this.headHash;
                this.branches.set(name, {
                    name,
                    headHash,
                    isCurrent: false,
                    created: new Date(),
                });
                this.logger.log(`Branch created: ${name} at ${headHash.substring(0, 8)}`);
                return {
                    branches: this.getBranchList(),
                    currentBranch: this.currentBranch,
                    action: 'create',
                    success: true,
                    message: `Branch "${name}" created at ${headHash.substring(0, 8)}`,
                };
            }
            case 'list': {
                return {
                    branches: this.getBranchList(),
                    currentBranch: this.currentBranch,
                    action: 'list',
                    success: true,
                };
            }
            case 'switch': {
                if (!name)
                    throw new Error('Branch name is required for switch action');
                if (!this.branches.has(name)) {
                    throw new Error(`Branch "${name}" not found`);
                }
                const currentBranch = this.branches.get(this.currentBranch);
                if (currentBranch)
                    currentBranch.isCurrent = false;
                this.currentBranch = name;
                const newBranch = this.branches.get(name);
                newBranch.isCurrent = true;
                this.headHash = newBranch.headHash;
                this.logger.log(`Switched to branch: ${name}`);
                return {
                    branches: this.getBranchList(),
                    currentBranch: this.currentBranch,
                    action: 'switch',
                    success: true,
                    message: `Switched to branch "${name}"`,
                };
            }
            case 'delete': {
                if (!name)
                    throw new Error('Branch name is required for delete action');
                if (name === this.currentBranch) {
                    throw new Error('Cannot delete the current branch. Switch to another branch first.');
                }
                if (!this.branches.has(name)) {
                    throw new Error(`Branch "${name}" not found`);
                }
                this.branches.delete(name);
                this.logger.log(`Branch deleted: ${name}`);
                return {
                    branches: this.getBranchList(),
                    currentBranch: this.currentBranch,
                    action: 'delete',
                    success: true,
                    message: `Branch "${name}" deleted`,
                };
            }
            default:
                throw new Error(`Unknown branch action: ${action}. Use create, list, switch, or delete.`);
        }
    }
    async merge(params) {
        const { sourceBranch, strategy = 'merge', message } = params;
        if (!sourceBranch || typeof sourceBranch !== 'string') {
            throw new Error('Source branch name is required');
        }
        const source = this.branches.get(sourceBranch);
        if (!source) {
            throw new Error(`Source branch "${sourceBranch}" not found`);
        }
        const target = this.branches.get(this.currentBranch);
        if (!target) {
            throw new Error('Current branch not found');
        }
        const sourceCommit = this.commits.get(source.headHash);
        const targetCommit = this.commits.get(target.headHash);
        if (strategy === 'fast-forward') {
            if (targetCommit && sourceCommit && sourceCommit.parentHashes.includes(target.headHash)) {
                target.headHash = source.headHash;
                this.headHash = source.headHash;
                this.logger.log(`Fast-forward merge: ${sourceBranch} -> ${this.currentBranch}`);
                return {
                    merged: true,
                    strategy: 'fast-forward',
                    hash: source.headHash,
                    conflicts: [],
                    message: `Fast-forward merge from ${sourceBranch}`,
                };
            }
            else {
                throw new Error('Fast-forward merge not possible: branches have diverged');
            }
        }
        const conflicts = [];
        const hasConflicts = Math.random() < 0.3;
        if (hasConflicts) {
            const conflictFiles = ['src/index.ts', 'package.json', 'config/default.json'];
            const numConflicts = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numConflicts; i++) {
                const file = conflictFiles[i % conflictFiles.length];
                conflicts.push({
                    file,
                    oursContent: `// ${this.currentBranch} version of ${file}`,
                    theirsContent: `// ${sourceBranch} version of ${file}`,
                    baseContent: `// common ancestor version of ${file}`,
                    conflictMarkers: [`<<<<<<< HEAD`, `=======`, `>>>>>>> ${sourceBranch}`],
                });
            }
        }
        if (conflicts.length > 0) {
            this.logger.log(`Merge has ${conflicts.length} conflict(s): ${sourceBranch} -> ${this.currentBranch}`);
            return {
                merged: false,
                strategy,
                hash: '',
                conflicts,
                message: `Merge from ${sourceBranch} has ${conflicts.length} conflict(s) that need resolution`,
            };
        }
        const mergeHash = this.generateHash();
        const mergeMessage = message || `Merge branch '${sourceBranch}' into ${this.currentBranch}`;
        const squashFiles = strategy === 'squash' ? ['squashed-changes'] : sourceCommit?.files || [];
        const mergeCommit = {
            hash: mergeHash,
            message: mergeMessage,
            author: 'developer',
            date: new Date(),
            parentHashes: [target.headHash, source.headHash],
            branch: this.currentBranch,
            files: squashFiles,
        };
        this.commits.set(mergeHash, mergeCommit);
        target.headHash = mergeHash;
        this.headHash = mergeHash;
        this.logger.log(`Merge: ${sourceBranch} -> ${this.currentBranch} (${strategy}), hash=${mergeHash.substring(0, 8)}`);
        return {
            merged: true,
            strategy,
            hash: mergeHash,
            conflicts: [],
            message: `Successfully merged ${sourceBranch} into ${this.currentBranch}`,
        };
    }
    async rebase(params) {
        const { onto, interactive = false, continueAfterConflict = false } = params;
        if (!onto || typeof onto !== 'string') {
            throw new Error('Target branch (onto) is required for rebase');
        }
        const targetBranch = this.branches.get(onto);
        if (!targetBranch) {
            throw new Error(`Target branch "${onto}" not found`);
        }
        let commitsToRebase = 0;
        const currentBranch = this.branches.get(this.currentBranch);
        if (currentBranch) {
            let hash = currentBranch.headHash;
            while (hash) {
                const commit = this.commits.get(hash);
                if (!commit || commit.branch !== this.currentBranch)
                    break;
                commitsToRebase++;
                hash = commit.parentHashes[0] || '';
            }
        }
        const conflicts = [];
        const hasConflicts = Math.random() < 0.25 && !continueAfterConflict;
        if (hasConflicts) {
            conflicts.push({
                file: 'src/index.ts',
                oursContent: '// current branch changes',
                theirsContent: `// ${onto} branch changes`,
                baseContent: '// common ancestor',
                conflictMarkers: [`<<<<<<< HEAD`, `=======`, `>>>>>>> ${onto}`],
            });
        }
        if (conflicts.length > 0) {
            return {
                rebased: false,
                onto,
                commitsRebased: 0,
                conflicts,
                message: `Rebase paused: ${conflicts.length} conflict(s) need resolution. Use resolveConflict then continueAfterConflict: true.`,
            };
        }
        const newHash = this.generateHash();
        const rebaseCommit = {
            hash: newHash,
            message: `Rebase ${this.currentBranch} onto ${onto}`,
            author: 'developer',
            date: new Date(),
            parentHashes: [targetBranch.headHash],
            branch: this.currentBranch,
            files: [],
        };
        this.commits.set(newHash, rebaseCommit);
        if (currentBranch) {
            currentBranch.headHash = newHash;
        }
        this.headHash = newHash;
        this.logger.log(`Rebase: ${this.currentBranch} onto ${onto}, ${commitsToRebase} commit(s) rebased`);
        return {
            rebased: true,
            onto,
            commitsRebased: commitsToRebase,
            conflicts: [],
            message: `Successfully rebased ${this.currentBranch} onto ${onto} (${commitsToRebase} commits)`,
        };
    }
    async resolveConflict(params) {
        const { file, resolution, manualContent, conflictMarkers } = params;
        if (!file || typeof file !== 'string') {
            throw new Error('File path is required for conflict resolution');
        }
        const validResolutions = ['ours', 'theirs', 'manual'];
        if (!validResolutions.includes(resolution)) {
            throw new Error(`Invalid resolution: ${resolution}. Use ours, theirs, or manual.`);
        }
        if (resolution === 'manual' && !manualContent) {
            throw new Error('Manual resolution requires manualContent parameter');
        }
        let content;
        switch (resolution) {
            case 'ours':
                content = conflictMarkers?.ours || `// Resolved: keeping our version of ${file}`;
                break;
            case 'theirs':
                content = conflictMarkers?.theirs || `// Resolved: keeping their version of ${file}`;
                break;
            case 'manual':
                content = manualContent;
                break;
        }
        this.workingTree.set(file, content);
        this.stagingArea.add(file);
        this.logger.log(`Conflict resolved: ${file} using ${resolution} strategy`);
        return { resolved: true, file, resolution, content };
    }
    async getDiff(params) {
        const { from, to, paths = [], contextLines = 3 } = params;
        const fromRef = from || 'HEAD~1';
        const toRef = to || 'HEAD';
        let diff = `diff --git a/src/index.ts b/src/index.ts\n`;
        diff += `index abc1234..def5678 100644\n`;
        diff += `--- a/src/index.ts\n`;
        diff += `+++ b/src/index.ts\n`;
        diff += `@@ -1,${contextLines + 2} +1,${contextLines + 3} @@\n`;
        const lines = [
            ` import { Module } from '@nestjs/common';`,
            `+import { Controller } from '@nestjs/common';`,
            ` `,
            ` @Module({`,
            `-  imports: [],`,
            `+  imports: [CoreModule],`,
            `+  controllers: [AppController],`,
            `   providers: [],`,
            ` })`,
        ];
        diff += lines.join('\n') + '\n';
        if (paths.length > 0) {
            diff += `\n// Filtered by paths: ${paths.join(', ')}\n`;
        }
        diff += `\n// Comparing ${fromRef}..${toRef}\n`;
        const additions = lines.filter((l) => l.startsWith('+')).length;
        const deletions = lines.filter((l) => l.startsWith('-')).length;
        this.logger.log(`Diff: ${fromRef}..${toRef}, ${additions} additions, ${deletions} deletions`);
        return {
            diff,
            filesChanged: 1,
            additions,
            deletions,
        };
    }
    async getLog(params) {
        const { maxCount = 20, branch, author, since, until, path } = params;
        const targetBranch = branch || this.currentBranch;
        const allCommits = Array.from(this.commits.values())
            .filter((c) => !branch || c.branch === branch)
            .filter((c) => !author || c.author === author)
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, maxCount);
        const commits = allCommits.map((c) => ({
            hash: c.hash,
            message: c.message,
            author: c.author,
            date: c.date.toISOString(),
            branch: c.branch,
            files: c.files,
        }));
        this.logger.log(`Log: ${commits.length} commit(s) on ${targetBranch}`);
        return {
            commits,
            totalCommits: this.commits.size,
            branch: targetBranch,
        };
    }
    generateHash() {
        const chars = '0123456789abcdef';
        let hash = '';
        for (let i = 0; i < 40; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }
    getBranchList() {
        return Array.from(this.branches.values()).map((b) => ({
            name: b.name,
            isCurrent: b.isCurrent,
            headHash: b.headHash,
        }));
    }
};
exports.VersionControlAgentService = VersionControlAgentService;
exports.VersionControlAgentService = VersionControlAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], VersionControlAgentService);
//# sourceMappingURL=version-control-agent.service.js.map