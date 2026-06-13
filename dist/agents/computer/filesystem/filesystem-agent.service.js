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
exports.FileSystemAgentService = exports.FILESYSTEM_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.FILESYSTEM_AGENT_CONFIG = {
    id: 'computer-filesystem',
    name: 'FileSystem',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Manage file system operations: read, write, create, delete, move, and copy files and directories. Provides a virtualized file system with full path validation, permission checks, and structured error handling.',
    capabilities: [
        {
            name: 'readFile',
            description: 'Read the contents of a file at the specified path',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Absolute or relative file path' },
                    encoding: {
                        type: 'string',
                        description: 'File encoding (utf-8, ascii, base64)',
                        default: 'utf-8',
                    },
                },
                required: ['path'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    content: { type: 'string' },
                    size: { type: 'number' },
                    encoding: { type: 'string' },
                    lastModified: { type: 'string' },
                },
            },
        },
        {
            name: 'writeFile',
            description: 'Write content to a file, creating it if it does not exist',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path to write to' },
                    content: { type: 'string', description: 'Content to write' },
                    encoding: { type: 'string', default: 'utf-8' },
                    overwrite: { type: 'boolean', default: true },
                },
                required: ['path', 'content'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    bytesWritten: { type: 'number' },
                    created: { type: 'boolean' },
                },
            },
        },
        {
            name: 'createDirectory',
            description: 'Create a directory at the specified path, including parent directories',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Directory path to create' },
                    recursive: { type: 'boolean', default: true },
                },
                required: ['path'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    created: { type: 'boolean' },
                },
            },
        },
        {
            name: 'deleteFile',
            description: 'Delete a file or directory at the specified path',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to delete' },
                    recursive: { type: 'boolean', default: false },
                    force: { type: 'boolean', default: false },
                },
                required: ['path'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    deleted: { type: 'boolean' },
                    type: { type: 'string' },
                },
            },
        },
        {
            name: 'moveFile',
            description: 'Move a file or directory from source to destination',
            inputSchema: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    destination: { type: 'string' },
                    overwrite: { type: 'boolean', default: false },
                },
                required: ['source', 'destination'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    destination: { type: 'string' },
                    moved: { type: 'boolean' },
                },
            },
        },
        {
            name: 'copyFile',
            description: 'Copy a file or directory from source to destination',
            inputSchema: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    destination: { type: 'string' },
                    overwrite: { type: 'boolean', default: false },
                    recursive: { type: 'boolean', default: false },
                },
                required: ['source', 'destination'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    destination: { type: 'string' },
                    copied: { type: 'boolean' },
                    bytesCopied: { type: 'number' },
                },
            },
        },
        {
            name: 'listDirectory',
            description: 'List the contents of a directory',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    recursive: { type: 'boolean', default: false },
                    includeHidden: { type: 'boolean', default: false },
                    pattern: { type: 'string', description: 'Glob pattern to filter results' },
                },
                required: ['path'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    entries: { type: 'array' },
                    totalFiles: { type: 'number' },
                    totalDirectories: { type: 'number' },
                },
            },
        },
        {
            name: 'getFileInfo',
            description: 'Get detailed metadata about a file or directory',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                },
                required: ['path'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    size: { type: 'number' },
                    created: { type: 'string' },
                    modified: { type: 'string' },
                    permissions: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:filesystem',
        'write:filesystem',
        'delete:filesystem',
        'create:directory',
        'move:filesystem',
        'copy:filesystem',
    ],
    maxConcurrentTasks: 8,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 500,
        exponentialBackoff: true,
    },
};
let FileSystemAgentService = class FileSystemAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.operationLog = [];
    }
    defineConfig() {
        return exports.FILESYSTEM_AGENT_CONFIG;
    }
    async onInitialize() {
        this.root = this.createDirectoryNode('/');
        const homeDir = this.createDirectoryNode('home');
        const userDir = this.createDirectoryNode('user');
        const docsDir = this.createDirectoryNode('documents');
        const tmpDir = this.createDirectoryNode('tmp');
        userDir.children.set('documents', docsDir);
        homeDir.children.set('user', userDir);
        this.root.children.set('home', homeDir);
        this.root.children.set('tmp', tmpDir);
        this.registerTool({
            name: 'readFile',
            description: 'Read the contents of a file',
            execute: async (params) => this.readFile(params.path, params.encoding),
        });
        this.registerTool({
            name: 'writeFile',
            description: 'Write content to a file',
            execute: async (params) => this.writeFile(params.path, params.content, params.encoding, params.overwrite),
        });
        this.registerTool({
            name: 'createDirectory',
            description: 'Create a directory',
            execute: async (params) => this.createDirectory(params.path, params.recursive),
        });
        this.registerTool({
            name: 'deleteFile',
            description: 'Delete a file or directory',
            execute: async (params) => this.deleteFile(params.path, params.recursive, params.force),
        });
        this.registerTool({
            name: 'moveFile',
            description: 'Move a file or directory',
            execute: async (params) => this.moveFile(params.source, params.destination, params.overwrite),
        });
        this.registerTool({
            name: 'copyFile',
            description: 'Copy a file or directory',
            execute: async (params) => this.copyFile(params.source, params.destination, params.overwrite, params.recursive),
        });
        this.registerTool({
            name: 'listDirectory',
            description: 'List directory contents',
            execute: async (params) => this.listDirectory(params.path, params.recursive, params.includeHidden, params.pattern),
        });
        this.registerTool({
            name: 'getFileInfo',
            description: 'Get file or directory metadata',
            execute: async (params) => this.getFileInfo(params.path),
        });
        await this.storeInWorkingMemory('fs:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('FileSystem agent initialized with 8 tools and virtual file system');
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
            'readFile',
            'writeFile',
            'createDirectory',
            'deleteFile',
            'moveFile',
            'copyFile',
            'listDirectory',
            'getFileInfo',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown filesystem action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            this.operationLog.push({
                operation: action,
                path: params.path || params.source || '',
                timestamp: new Date(),
                success: true,
            });
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`FileSystem execution failed for ${action}: ${msg}`);
            this.operationLog.push({
                operation: action,
                path: params.path || params.source || '',
                timestamp: new Date(),
                success: false,
            });
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.root.children.clear();
        this.operationLog = [];
        this.logger.log('FileSystem agent destroyed, virtual file system cleared');
    }
    async readFile(path, encoding = 'utf-8') {
        this.validatePath(path);
        const node = this.resolveNode(path);
        if (!node) {
            throw new Error(`File not found: ${path}`);
        }
        if (node.type === 'directory') {
            throw new Error(`Path is a directory, not a file: ${path}`);
        }
        this.logger.log(`Read file: ${path} (${node.size} bytes)`);
        return {
            content: node.content || '',
            size: node.size,
            encoding,
            lastModified: node.modified.toISOString(),
        };
    }
    async writeFile(path, content, encoding = 'utf-8', overwrite = true) {
        this.validatePath(path);
        const parentPath = this.getParentPath(path);
        const fileName = this.getBaseName(path);
        const parentNode = this.resolveNode(parentPath);
        if (!parentNode) {
            throw new Error(`Parent directory not found: ${parentPath}`);
        }
        if (parentNode.type !== 'directory') {
            throw new Error(`Parent path is not a directory: ${parentPath}`);
        }
        const existingNode = parentNode.children.get(fileName);
        if (existingNode && existingNode.type === 'directory') {
            throw new Error(`Cannot write file: a directory exists at ${path}`);
        }
        if (existingNode && !overwrite) {
            throw new Error(`File already exists and overwrite is false: ${path}`);
        }
        const isCreated = !existingNode;
        const byteSize = Buffer.byteLength(content, encoding);
        const fileNode = {
            name: fileName,
            type: 'file',
            content,
            children: new Map(),
            created: existingNode?.created || new Date(),
            modified: new Date(),
            permissions: 'rw-r--r--',
            size: byteSize,
        };
        parentNode.children.set(fileName, fileNode);
        parentNode.modified = new Date();
        this.logger.log(`Wrote file: ${path} (${byteSize} bytes, created: ${isCreated})`);
        return { path, bytesWritten: byteSize, created: isCreated };
    }
    async createDirectory(path, recursive = true) {
        this.validatePath(path);
        const segments = this.splitPath(path);
        if (recursive) {
            let current = this.root;
            for (const segment of segments) {
                if (!current.children.has(segment)) {
                    current.children.set(segment, this.createDirectoryNode(segment));
                    current.modified = new Date();
                }
                const next = current.children.get(segment);
                if (next.type !== 'directory') {
                    throw new Error(`Path component is not a directory: ${segment}`);
                }
                current = next;
            }
            this.logger.log(`Created directory (recursive): ${path}`);
            return { path, created: true };
        }
        else {
            const parentPath = this.getParentPath(path);
            const dirName = this.getBaseName(path);
            const parentNode = this.resolveNode(parentPath);
            if (!parentNode) {
                throw new Error(`Parent directory not found: ${parentPath}. Use recursive: true to create parents.`);
            }
            if (parentNode.type !== 'directory') {
                throw new Error(`Parent path is not a directory: ${parentPath}`);
            }
            if (parentNode.children.has(dirName)) {
                throw new Error(`Directory already exists: ${path}`);
            }
            parentNode.children.set(dirName, this.createDirectoryNode(dirName));
            parentNode.modified = new Date();
            this.logger.log(`Created directory: ${path}`);
            return { path, created: true };
        }
    }
    async deleteFile(path, recursive = false, force = false) {
        this.validatePath(path);
        if (path === '/') {
            throw new Error('Cannot delete root directory');
        }
        const node = this.resolveNode(path);
        if (!node) {
            throw new Error(`Path not found: ${path}`);
        }
        const parentPath = this.getParentPath(path);
        const baseName = this.getBaseName(path);
        const parentNode = this.resolveNode(parentPath);
        if (node.type === 'directory' && node.children.size > 0) {
            if (!recursive && !force) {
                throw new Error(`Directory not empty: ${path}. Use recursive: true or force: true.`);
            }
        }
        parentNode.children.delete(baseName);
        parentNode.modified = new Date();
        this.logger.log(`Deleted ${node.type}: ${path}`);
        return { path, deleted: true, type: node.type };
    }
    async moveFile(source, destination, overwrite = false) {
        this.validatePath(source);
        this.validatePath(destination);
        if (source === '/') {
            throw new Error('Cannot move root directory');
        }
        const sourceNode = this.resolveNode(source);
        if (!sourceNode) {
            throw new Error(`Source not found: ${source}`);
        }
        const sourceParentPath = this.getParentPath(source);
        const sourceBaseName = this.getBaseName(source);
        const sourceParent = this.resolveNode(sourceParentPath);
        const destParentPath = this.getParentPath(destination);
        const destBaseName = this.getBaseName(destination);
        const destParent = this.resolveNode(destParentPath);
        if (!destParent) {
            throw new Error(`Destination parent directory not found: ${destParentPath}`);
        }
        if (destParent.type !== 'directory') {
            throw new Error(`Destination parent is not a directory: ${destParentPath}`);
        }
        const existingDest = destParent.children.get(destBaseName);
        if (existingDest && !overwrite) {
            throw new Error(`Destination already exists and overwrite is false: ${destination}`);
        }
        const movedNode = { ...sourceNode, name: destBaseName, modified: new Date() };
        destParent.children.set(destBaseName, movedNode);
        sourceParent.children.delete(sourceBaseName);
        destParent.modified = new Date();
        sourceParent.modified = new Date();
        this.logger.log(`Moved: ${source} → ${destination}`);
        return { source, destination, moved: true };
    }
    async copyFile(source, destination, overwrite = false, recursive = false) {
        this.validatePath(source);
        this.validatePath(destination);
        const sourceNode = this.resolveNode(source);
        if (!sourceNode) {
            throw new Error(`Source not found: ${source}`);
        }
        const destParentPath = this.getParentPath(destination);
        const destBaseName = this.getBaseName(destination);
        const destParent = this.resolveNode(destParentPath);
        if (!destParent) {
            throw new Error(`Destination parent directory not found: ${destParentPath}`);
        }
        const existingDest = destParent.children.get(destBaseName);
        if (existingDest && !overwrite) {
            throw new Error(`Destination already exists and overwrite is false: ${destination}`);
        }
        const copiedNode = this.deepCloneNode(sourceNode, destBaseName);
        destParent.children.set(destBaseName, copiedNode);
        destParent.modified = new Date();
        const bytesCopied = this.calculateNodeSize(copiedNode);
        this.logger.log(`Copied: ${source} → ${destination} (${bytesCopied} bytes)`);
        return { source, destination, copied: true, bytesCopied };
    }
    async listDirectory(path, recursive = false, includeHidden = false, pattern) {
        this.validatePath(path);
        const node = this.resolveNode(path);
        if (!node) {
            throw new Error(`Directory not found: ${path}`);
        }
        if (node.type !== 'directory') {
            throw new Error(`Path is not a directory: ${path}`);
        }
        const entries = [];
        let totalFiles = 0;
        let totalDirectories = 0;
        const collectEntries = (currentNode, currentPath) => {
            for (const [childName, childNode] of currentNode.children) {
                if (childName.startsWith('.') && !includeHidden)
                    continue;
                if (pattern && !this.matchGlob(childName, pattern))
                    continue;
                const childPath = currentPath === '/' ? `/${childName}` : `${currentPath}/${childName}`;
                entries.push({
                    name: childName,
                    type: childNode.type,
                    size: childNode.size,
                    modified: childNode.modified.toISOString(),
                });
                if (childNode.type === 'file') {
                    totalFiles++;
                }
                else {
                    totalDirectories++;
                    if (recursive) {
                        collectEntries(childNode, childPath);
                    }
                }
            }
        };
        collectEntries(node, path);
        this.logger.log(`Listed directory: ${path} (${totalFiles} files, ${totalDirectories} dirs)`);
        return { path, entries, totalFiles, totalDirectories };
    }
    async getFileInfo(path) {
        this.validatePath(path);
        const node = this.resolveNode(path);
        if (!node) {
            throw new Error(`Path not found: ${path}`);
        }
        this.logger.log(`Got file info: ${path}`);
        return {
            path,
            name: node.name,
            type: node.type,
            size: node.size,
            created: node.created.toISOString(),
            modified: node.modified.toISOString(),
            permissions: node.permissions,
        };
    }
    createDirectoryNode(name) {
        return {
            name,
            type: 'directory',
            children: new Map(),
            created: new Date(),
            modified: new Date(),
            permissions: 'rwxr-xr-x',
            size: 4096,
        };
    }
    validatePath(path) {
        if (!path || typeof path !== 'string') {
            throw new Error('Path must be a non-empty string');
        }
        if (!path.startsWith('/')) {
            throw new Error('Path must be absolute (start with /)');
        }
        const normalized = path.replace(/\/+/g, '/');
        if (normalized.includes('..')) {
            throw new Error('Path traversal (..) is not allowed');
        }
    }
    resolveNode(path) {
        if (path === '/')
            return this.root;
        const segments = this.splitPath(path);
        let current = this.root;
        for (const segment of segments) {
            if (!segment)
                continue;
            if (current.type !== 'directory')
                return null;
            const child = current.children.get(segment);
            if (!child)
                return null;
            current = child;
        }
        return current;
    }
    splitPath(path) {
        return path.split('/').filter((s) => s.length > 0);
    }
    getParentPath(path) {
        const segments = this.splitPath(path);
        if (segments.length <= 1)
            return '/';
        return '/' + segments.slice(0, -1).join('/');
    }
    getBaseName(path) {
        const segments = this.splitPath(path);
        return segments[segments.length - 1] || '/';
    }
    deepCloneNode(node, newName) {
        const clone = {
            name: newName,
            type: node.type,
            content: node.content,
            children: new Map(),
            created: new Date(),
            modified: new Date(),
            permissions: node.permissions,
            size: node.size,
        };
        for (const [key, child] of node.children) {
            clone.children.set(key, this.deepCloneNode(child, child.name));
        }
        return clone;
    }
    calculateNodeSize(node) {
        let size = node.size;
        for (const [, child] of node.children) {
            size += this.calculateNodeSize(child);
        }
        return size;
    }
    matchGlob(name, pattern) {
        const regexStr = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        try {
            const regex = new RegExp(`^${regexStr}$`);
            return regex.test(name);
        }
        catch {
            return name.includes(pattern);
        }
    }
};
exports.FileSystemAgentService = FileSystemAgentService;
exports.FileSystemAgentService = FileSystemAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], FileSystemAgentService);
//# sourceMappingURL=filesystem-agent.service.js.map