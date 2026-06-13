/**
 * AENEWS Agent OS X - FileSystem Agent
 * Handles file system operations: read, write, create, delete, move, copy files and directories.
 * Simulates a virtual file system for environments without direct OS access.
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

export const FILESYSTEM_AGENT_CONFIG: AgentConfig = {
  id: 'computer-filesystem',
  name: 'FileSystem',
  cluster: AgentCluster.COMPUTER,
  version: '1.0.0',
  description:
    'Manage file system operations: read, write, create, delete, move, and copy files and directories. Provides a virtualized file system with full path validation, permission checks, and structured error handling.',
  capabilities: [
    {
      name: 'readFile',
      description: 'Read the contents of a file at the specified path',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative file path' },
          encoding: { type: 'string', description: 'File encoding (utf-8, ascii, base64)', default: 'utf-8' },
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

// ─── Virtual File System Types ────────────────────────────────────

interface VirtualNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children: Map<string, VirtualNode>;
  created: Date;
  modified: Date;
  permissions: string;
  size: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class FileSystemAgentService extends BaseAgentService {
  private root!: VirtualNode;
  private operationLog: Array<{ operation: string; path: string; timestamp: Date; success: boolean }> = [];

  protected defineConfig(): AgentConfig {
    return FILESYSTEM_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Initialize virtual file system root
    this.root = this.createDirectoryNode('/');

    // Seed some default directories
    const homeDir = this.createDirectoryNode('home');
    const userDir = this.createDirectoryNode('user');
    const docsDir = this.createDirectoryNode('documents');
    const tmpDir = this.createDirectoryNode('tmp');
    userDir.children.set('documents', docsDir);
    homeDir.children.set('user', userDir);
    this.root.children.set('home', homeDir);
    this.root.children.set('tmp', tmpDir);

    // Register tools
    this.registerTool({
      name: 'readFile',
      description: 'Read the contents of a file',
      execute: async (params: { path: string; encoding?: string }) => this.readFile(params.path, params.encoding),
    });

    this.registerTool({
      name: 'writeFile',
      description: 'Write content to a file',
      execute: async (params: { path: string; content: string; encoding?: string; overwrite?: boolean }) =>
        this.writeFile(params.path, params.content, params.encoding, params.overwrite),
    });

    this.registerTool({
      name: 'createDirectory',
      description: 'Create a directory',
      execute: async (params: { path: string; recursive?: boolean }) =>
        this.createDirectory(params.path, params.recursive),
    });

    this.registerTool({
      name: 'deleteFile',
      description: 'Delete a file or directory',
      execute: async (params: { path: string; recursive?: boolean; force?: boolean }) =>
        this.deleteFile(params.path, params.recursive, params.force),
    });

    this.registerTool({
      name: 'moveFile',
      description: 'Move a file or directory',
      execute: async (params: { source: string; destination: string; overwrite?: boolean }) =>
        this.moveFile(params.source, params.destination, params.overwrite),
    });

    this.registerTool({
      name: 'copyFile',
      description: 'Copy a file or directory',
      execute: async (params: { source: string; destination: string; overwrite?: boolean; recursive?: boolean }) =>
        this.copyFile(params.source, params.destination, params.overwrite, params.recursive),
    });

    this.registerTool({
      name: 'listDirectory',
      description: 'List directory contents',
      execute: async (params: { path: string; recursive?: boolean; includeHidden?: boolean; pattern?: string }) =>
        this.listDirectory(params.path, params.recursive, params.includeHidden, params.pattern),
    });

    this.registerTool({
      name: 'getFileInfo',
      description: 'Get file or directory metadata',
      execute: async (params: { path: string }) => this.getFileInfo(params.path),
    });

    await this.storeInWorkingMemory('fs:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('FileSystem agent initialized with 8 tools and virtual file system');
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
      'readFile', 'writeFile', 'createDirectory', 'deleteFile',
      'moveFile', 'copyFile', 'listDirectory', 'getFileInfo',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown filesystem action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      this.operationLog.push({
        operation: action,
        path: params.path || params.source || '',
        timestamp: new Date(),
        success: true,
      });

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
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

  protected async onDestroy(): Promise<void> {
    this.root.children.clear();
    this.operationLog = [];
    this.logger.log('FileSystem agent destroyed, virtual file system cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async readFile(
    path: string,
    encoding: string = 'utf-8',
  ): Promise<{ content: string; size: number; encoding: string; lastModified: string }> {
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

  private async writeFile(
    path: string,
    content: string,
    encoding: string = 'utf-8',
    overwrite: boolean = true,
  ): Promise<{ path: string; bytesWritten: number; created: boolean }> {
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
    const byteSize = Buffer.byteLength(content, encoding as BufferEncoding);

    const fileNode: VirtualNode = {
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

  private async createDirectory(
    path: string,
    recursive: boolean = true,
  ): Promise<{ path: string; created: boolean }> {
    this.validatePath(path);

    const segments = this.splitPath(path);

    if (recursive) {
      let current = this.root;
      for (const segment of segments) {
        if (!current.children.has(segment)) {
          current.children.set(segment, this.createDirectoryNode(segment));
          current.modified = new Date();
        }
        const next = current.children.get(segment)!;
        if (next.type !== 'directory') {
          throw new Error(`Path component is not a directory: ${segment}`);
        }
        current = next;
      }
      this.logger.log(`Created directory (recursive): ${path}`);
      return { path, created: true };
    } else {
      // Non-recursive: parent must exist
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

  private async deleteFile(
    path: string,
    recursive: boolean = false,
    force: boolean = false,
  ): Promise<{ path: string; deleted: boolean; type: string }> {
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

    parentNode!.children.delete(baseName);
    parentNode!.modified = new Date();

    this.logger.log(`Deleted ${node.type}: ${path}`);
    return { path, deleted: true, type: node.type };
  }

  private async moveFile(
    source: string,
    destination: string,
    overwrite: boolean = false,
  ): Promise<{ source: string; destination: string; moved: boolean }> {
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

    // Perform the move
    const movedNode = { ...sourceNode, name: destBaseName, modified: new Date() };
    destParent.children.set(destBaseName, movedNode);
    sourceParent!.children.delete(sourceBaseName);
    destParent.modified = new Date();
    sourceParent!.modified = new Date();

    this.logger.log(`Moved: ${source} → ${destination}`);
    return { source, destination, moved: true };
  }

  private async copyFile(
    source: string,
    destination: string,
    overwrite: boolean = false,
    recursive: boolean = false,
  ): Promise<{ source: string; destination: string; copied: boolean; bytesCopied: number }> {
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

  private async listDirectory(
    path: string,
    recursive: boolean = false,
    includeHidden: boolean = false,
    pattern?: string,
  ): Promise<{
    path: string;
    entries: Array<{ name: string; type: string; size: number; modified: string }>;
    totalFiles: number;
    totalDirectories: number;
  }> {
    this.validatePath(path);

    const node = this.resolveNode(path);
    if (!node) {
      throw new Error(`Directory not found: ${path}`);
    }
    if (node.type !== 'directory') {
      throw new Error(`Path is not a directory: ${path}`);
    }

    const entries: Array<{ name: string; type: string; size: number; modified: string }> = [];
    let totalFiles = 0;
    let totalDirectories = 0;

    const collectEntries = (currentNode: VirtualNode, currentPath: string) => {
      for (const [childName, childNode] of currentNode.children) {
        // Skip hidden files unless requested
        if (childName.startsWith('.') && !includeHidden) continue;

        // Apply glob pattern filter
        if (pattern && !this.matchGlob(childName, pattern)) continue;

        const childPath = currentPath === '/' ? `/${childName}` : `${currentPath}/${childName}`;
        entries.push({
          name: childName,
          type: childNode.type,
          size: childNode.size,
          modified: childNode.modified.toISOString(),
        });

        if (childNode.type === 'file') {
          totalFiles++;
        } else {
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

  private async getFileInfo(path: string): Promise<{
    path: string;
    name: string;
    type: string;
    size: number;
    created: string;
    modified: string;
    permissions: string;
  }> {
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

  // ─── Virtual File System Helpers ───────────────────────────────

  private createDirectoryNode(name: string): VirtualNode {
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

  private validatePath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new Error('Path must be a non-empty string');
    }
    if (!path.startsWith('/')) {
      throw new Error('Path must be absolute (start with /)');
    }
    // Prevent path traversal
    const normalized = path.replace(/\/+/g, '/');
    if (normalized.includes('..')) {
      throw new Error('Path traversal (..) is not allowed');
    }
  }

  private resolveNode(path: string): VirtualNode | null {
    if (path === '/') return this.root;

    const segments = this.splitPath(path);
    let current: VirtualNode = this.root;

    for (const segment of segments) {
      if (!segment) continue;
      if (current.type !== 'directory') return null;
      const child = current.children.get(segment);
      if (!child) return null;
      current = child;
    }

    return current;
  }

  private splitPath(path: string): string[] {
    return path.split('/').filter((s) => s.length > 0);
  }

  private getParentPath(path: string): string {
    const segments = this.splitPath(path);
    if (segments.length <= 1) return '/';
    return '/' + segments.slice(0, -1).join('/');
  }

  private getBaseName(path: string): string {
    const segments = this.splitPath(path);
    return segments[segments.length - 1] || '/';
  }

  private deepCloneNode(node: VirtualNode, newName: string): VirtualNode {
    const clone: VirtualNode = {
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

  private calculateNodeSize(node: VirtualNode): number {
    let size = node.size;
    for (const [, child] of node.children) {
      size += this.calculateNodeSize(child);
    }
    return size;
  }

  private matchGlob(name: string, pattern: string): boolean {
    // Simple glob matching: supports * and ?
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    try {
      const regex = new RegExp(`^${regexStr}$`);
      return regex.test(name);
    } catch {
      return name.includes(pattern);
    }
  }
}
