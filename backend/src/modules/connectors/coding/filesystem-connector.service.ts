/**
 * AENEWS Agent OS X — Filesystem Connector Service
 *
 * Safe file system operations with:
 *   - Root directory restriction (configurable, defaults to /tmp/aenews-workspace)
 *   - Path traversal prevention
 *   - File size limits (configurable, defaults to 10MB)
 *   - Forbidden paths (system directories)
 *   - Circuit breaker integration (key: connector:filesystem)
 *   - Event emission for audit trail
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';

const CIRCUIT_KEY = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:filesystem`;

// System directories that are always forbidden
const FORBIDDEN_PATHS = [
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
  '/sys',
  '/proc',
  '/dev',
  '/boot',
  '/lib',
  '/lib64',
  '/root',
  '/home',
  '/opt',
  '/srv',
  '/run',
  '/snap',
];

export interface FileStats {
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  permissions: string;
}

export interface DirEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
}

export interface SearchResult {
  path: string;
  relativePath: string;
  size: number;
}

export interface GrepResult {
  file: string;
  line: number;
  content: string;
  match: string;
}

@Injectable()
export class FilesystemConnectorService implements OnModuleInit {
  private readonly logger = new Logger(FilesystemConnectorService.name);
  private workspaceRoot: string;
  private maxFileSizeBytes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: AgentEventBusService,
    @Optional() private readonly circuitBreaker: CircuitBreakerService | null = null,
    private readonly emitter: EventEmitter2,
  ) {
    this.workspaceRoot = this.configService.get<string>('WORKSPACE_ROOT', '/tmp/aenews-workspace');
    this.maxFileSizeBytes = this.configService.get<number>('MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024);
  }

  async onModuleInit(): Promise<void> {
    // Ensure workspace root exists
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      this.logger.log(`Filesystem connector initialized (workspace: ${this.workspaceRoot}, maxFileSize: ${this.maxFileSizeBytes} bytes)`);
    } catch (error) {
      this.logger.error(`Failed to create workspace root: ${(error as Error).message}`);
    }
  }

  // ─── File Operations ───────────────────────────────────────────

  async readFile(filePath: string): Promise<{ path: string; content: string; size: number; encoding: string }> {
    return this.executeWithCircuit('readFile', async () => {
      const safePath = this.validateAndResolvePath(filePath);
      this.validateNotForbidden(safePath);
      await this.validateFileSize(safePath);

      const fs = await import('fs/promises');
      const content = await fs.readFile(safePath, 'utf-8');
      const stat = await fs.stat(safePath);

      return {
        path: safePath,
        content,
        size: stat.size,
        encoding: 'utf-8',
      };
    }, { filePath });
  }

  async writeFile(filePath: string, content: string): Promise<{ path: string; size: number; created: boolean }> {
    return this.executeWithCircuit('writeFile', async () => {
      const safePath = this.validateAndResolvePath(filePath);
      this.validateNotForbidden(safePath);
      this.validateContentSize(content);

      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure parent directory exists
      const dir = path.dirname(safePath);
      await fs.mkdir(dir, { recursive: true });

      // Check if file already exists
      let exists = false;
      try {
        await fs.access(safePath);
        exists = true;
      } catch {
        // File does not exist
      }

      await fs.writeFile(safePath, content, 'utf-8');
      const stat = await fs.stat(safePath);

      return {
        path: safePath,
        size: stat.size,
        created: !exists,
      };
    }, { filePath, contentLength: content.length });
  }

  async listDir(dirPath: string): Promise<DirEntry[]> {
    return this.executeWithCircuit('listDir', async () => {
      const safePath = this.validateAndResolvePath(dirPath);
      this.validateNotForbidden(safePath);

      const fs = await import('fs/promises');
      const entries = await fs.readdir(safePath, { withFileTypes: true });

      const results: DirEntry[] = [];
      for (const entry of entries) {
        const entryPath = require('path').join(safePath, entry.name);
        let size = 0;
        try {
          const stat = await fs.stat(entryPath);
          size = stat.size;
        } catch {
          // Permission denied or other error, skip
        }

        results.push({
          name: entry.name,
          path: entryPath,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          size,
        });
      }

      return results;
    }, { dirPath });
  }

  async mkdir(dirPath: string, recursive: boolean = true): Promise<{ path: string; created: boolean }> {
    return this.executeWithCircuit('mkdir', async () => {
      const safePath = this.validateAndResolvePath(dirPath);
      this.validateNotForbidden(safePath);

      const fs = await import('fs/promises');

      let exists = false;
      try {
        await fs.access(safePath);
        exists = true;
      } catch {
        // Does not exist
      }

      if (!exists) {
        await fs.mkdir(safePath, { recursive });
      }

      return { path: safePath, created: !exists };
    }, { dirPath, recursive });
  }

  async remove(targetPath: string, recursive: boolean = false): Promise<{ path: string; removed: boolean }> {
    return this.executeWithCircuit('remove', async () => {
      const safePath = this.validateAndResolvePath(targetPath);
      this.validateNotForbidden(safePath);

      // Extra safety: prevent deletion of the workspace root itself
      if (safePath === this.workspaceRoot) {
        throw new Error('Cannot remove the workspace root directory');
      }

      const fs = await import('fs/promises');

      try {
        const stat = await fs.stat(safePath);

        if (stat.isDirectory()) {
          if (!recursive) {
            // Check if directory is empty
            const entries = await fs.readdir(safePath);
            if (entries.length > 0) {
              throw new Error(`Directory "${targetPath}" is not empty. Use recursive=true to remove non-empty directories.`);
            }
          }
          await fs.rm(safePath, { recursive });
        } else {
          await fs.unlink(safePath);
        }

        return { path: safePath, removed: true };
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          return { path: safePath, removed: false };
        }
        throw error;
      }
    }, { targetPath, recursive });
  }

  async copy(src: string, dest: string): Promise<{ src: string; dest: string; copied: boolean }> {
    return this.executeWithCircuit('copy', async () => {
      const safeSrc = this.validateAndResolvePath(src);
      const safeDest = this.validateAndResolvePath(dest);
      this.validateNotForbidden(safeSrc);
      this.validateNotForbidden(safeDest);

      const fs = await import('fs/promises');
      const path = await import('path');

      const srcStat = await fs.stat(safeSrc);

      if (srcStat.isDirectory()) {
        // Copy directory recursively
        await this.copyDirectoryRecursive(safeSrc, safeDest);
      } else {
        // Ensure destination directory exists
        await fs.mkdir(path.dirname(safeDest), { recursive: true });
        await fs.copyFile(safeSrc, safeDest);
      }

      return { src: safeSrc, dest: safeDest, copied: true };
    }, { src, dest });
  }

  async move(src: string, dest: string): Promise<{ src: string; dest: string; moved: boolean }> {
    return this.executeWithCircuit('move', async () => {
      const safeSrc = this.validateAndResolvePath(src);
      const safeDest = this.validateAndResolvePath(dest);
      this.validateNotForbidden(safeSrc);
      this.validateNotForbidden(safeDest);

      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(safeDest), { recursive: true });
      await fs.rename(safeSrc, safeDest);

      return { src: safeSrc, dest: safeDest, moved: true };
    }, { src, dest });
  }

  async exists(filePath: string): Promise<{ path: string; exists: boolean; isFile: boolean; isDirectory: boolean }> {
    return this.executeWithCircuit('exists', async () => {
      const safePath = this.validateAndResolvePath(filePath);

      const fs = await import('fs/promises');

      try {
        const stat = await fs.stat(safePath);
        return {
          path: safePath,
          exists: true,
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
        };
      } catch {
        return {
          path: safePath,
          exists: false,
          isFile: false,
          isDirectory: false,
        };
      }
    }, { filePath });
  }

  async stat(filePath: string): Promise<FileStats> {
    return this.executeWithCircuit('stat', async () => {
      const safePath = this.validateAndResolvePath(filePath);
      this.validateNotForbidden(safePath);

      const fs = await import('fs/promises');
      const stat = await fs.stat(safePath);

      return {
        path: safePath,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime,
        permissions: stat.mode.toString(8).slice(-3),
      };
    }, { filePath });
  }

  async search(root: string, pattern: string): Promise<SearchResult[]> {
    return this.executeWithCircuit('search', async () => {
      const safeRoot = this.validateAndResolvePath(root);
      this.validateNotForbidden(safeRoot);

      const fs = await import('fs/promises');
      const path = await import('path');

      const results: SearchResult[] = [];
      const globPattern = this.globToRegex(pattern);

      const walkDir = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(safeRoot, fullPath);

          if (entry.name.startsWith('.') && !pattern.includes('.')) {
            // Skip hidden files unless pattern explicitly includes them
            continue;
          }

          if (entry.isFile() && globPattern.test(relativePath)) {
            try {
              const stat = await fs.stat(fullPath);
              results.push({
                path: fullPath,
                relativePath,
                size: stat.size,
              });
            } catch {
              // Skip files we can't stat
            }
          }

          if (entry.isDirectory()) {
            await walkDir(fullPath);
          }
        }
      };

      await walkDir(safeRoot);
      return results;
    }, { root, pattern });
  }

  async grep(root: string, pattern: string, filePattern?: string): Promise<GrepResult[]> {
    return this.executeWithCircuit('grep', async () => {
      const safeRoot = this.validateAndResolvePath(root);
      this.validateNotForbidden(safeRoot);

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const results: GrepResult[] = [];
      const regex = new RegExp(pattern, 'gi');
      const fileRegex = filePattern ? this.globToRegex(filePattern) : null;

      const walkDir = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = pathModule.join(dir, entry.name);
          const relativePath = pathModule.relative(safeRoot, fullPath);

          if (entry.isFile()) {
            // Check file pattern filter
            if (fileRegex && !fileRegex.test(relativePath)) {
              continue;
            }

            try {
              const stat = await fs.stat(fullPath);
              // Skip files that are too large
              if (stat.size > this.maxFileSizeBytes) continue;

              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');

              for (let i = 0; i < lines.length; i++) {
                const match = regex.exec(lines[i]);
                if (match) {
                  results.push({
                    file: relativePath,
                    line: i + 1,
                    content: lines[i].substring(0, 500), // Truncate long lines
                    match: match[0],
                  });
                  if (results.length >= 100) return; // Limit results
                }
                regex.lastIndex = 0; // Reset regex for next line
              }
            } catch {
              // Skip files we can't read (binary, permission denied, etc.)
            }
          }

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await walkDir(fullPath);
          }
        }
      };

      await walkDir(safeRoot);
      return results;
    }, { root, pattern, filePattern });
  }

  // ─── Path Safety ───────────────────────────────────────────────

  /**
   * Validate and resolve a path, ensuring it stays within the workspace root.
   * Prevents path traversal attacks.
   */
  private validateAndResolvePath(inputPath: string): string {
    const path = require('path');
    const resolved = path.resolve(this.workspaceRoot, inputPath);

    // Path traversal prevention
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(
        `Path traversal detected: "${inputPath}" resolves to "${resolved}" which is outside workspace root "${this.workspaceRoot}"`,
      );
    }

    return resolved;
  }

  /**
   * Check if a resolved path is within a forbidden system directory.
   */
  private validateNotForbidden(resolvedPath: string): void {
    for (const forbidden of FORBIDDEN_PATHS) {
      if (resolvedPath.startsWith(forbidden + '/') || resolvedPath === forbidden) {
        throw new Error(
          `Access denied: path "${resolvedPath}" is within a forbidden system directory (${forbidden})`,
        );
      }
    }
  }

  /**
   * Validate file size before reading.
   */
  private async validateFileSize(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > this.maxFileSizeBytes) {
        throw new Error(
          `File "${filePath}" exceeds maximum allowed size (${this.maxFileSizeBytes} bytes). ` +
          `File size: ${stat.size} bytes.`,
        );
      }
    } catch (error) {
      if ((error as any).message?.includes('exceeds maximum')) {
        throw error;
      }
      // If we can't stat, let the actual read operation handle the error
    }
  }

  /**
   * Validate content size before writing.
   */
  private validateContentSize(content: string): void {
    const size = Buffer.byteLength(content, 'utf-8');
    if (size > this.maxFileSizeBytes) {
      throw new Error(
        `Content size (${size} bytes) exceeds maximum allowed file size (${this.maxFileSizeBytes} bytes)`,
      );
    }
  }

  /**
   * Convert a simple glob pattern to a RegExp.
   * Supports: * (any chars), ? (single char), ** (any path)
   */
  private globToRegex(pattern: string): RegExp {
    const regexStr = pattern
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/{{DOUBLESTAR}}/g, '.*')
      .replace(/\./g, '\\.');
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Recursively copy a directory.
   */
  private async copyDirectoryRecursive(src: string, dest: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // ─── Circuit Breaker Wrapper ───────────────────────────────────

  private async executeWithCircuit<T>(
    action: string,
    fn: () => Promise<T>,
    params: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      let result: T;

      if (this.circuitBreaker) {
        result = await this.circuitBreaker.execute(
          CIRCUIT_KEY,
          fn,
          async () => {
            this.logger.warn(`Circuit OPEN for filesystem connector — action ${action} rejected`);
            throw new Error(`Filesystem connector circuit breaker is OPEN — action "${action}" cannot be executed`);
          },
        );
      } else {
        result = await fn();
      }

      const duration = Date.now() - startTime;
      this.emitEvent(action, true, duration, params);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emitEvent(action, false, duration, params, (error as Error).message);
      throw error;
    }
  }

  // ─── Event Emission ────────────────────────────────────────────

  private emitEvent(
    action: string,
    success: boolean,
    durationMs: number,
    params: Record<string, any>,
    error?: string,
  ): void {
    try {
      this.emitter.emit(`connector.filesystem.${action}`, {
        action,
        success,
        durationMs,
        params: Object.keys(params),
        error,
        workspaceRoot: this.workspaceRoot,
        timestamp: Date.now(),
      });

      this.eventBus.emitConnectorEvent('filesystem', action, success, durationMs);
    } catch {
      // Never let event emission failures affect the connector
    }
  }
}
