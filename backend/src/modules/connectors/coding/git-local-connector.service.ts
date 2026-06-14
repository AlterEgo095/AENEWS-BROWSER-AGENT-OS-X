/**
 * AENEWS Agent OS X — Git Local Connector Service
 *
 * Local git operations using simple-git.
 * Provides clone, init, status, add, commit, push, pull, log, diff,
 * branch, merge, and stash operations.
 *
 * Features:
 *   - simple-git for all local git operations
 *   - Circuit breaker integration (key: connector:git-local)
 *   - Event emission for audit trail
 *   - Workspace root restriction for safety
 *   - Disabled by default (GIT_LOCAL_ENABLED)
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';

const CIRCUIT_KEY = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:git-local`;

export interface GitStatusResult {
  repoPath: string;
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  clean: boolean;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export interface GitDiffResult {
  files: string[];
  summary: {
    insertions: number;
    deletions: number;
    files: number;
  };
  patches: Array<{
    file: string;
    patch: string;
  }>;
}

export interface GitBranchResult {
  current: string;
  branches: Array<{
    name: string;
    current: boolean;
  }>;
}

export interface GitMergeResult {
  merged: boolean;
  conflicts: string[];
  fastForward: boolean;
  message: string;
}

export interface GitStashResult {
  stashCount: number;
  message: string;
}

@Injectable()
export class GitLocalConnectorService implements OnModuleInit {
  private readonly logger = new Logger(GitLocalConnectorService.name);
  private simpleGit: any = null;
  private isEnabled = true;
  private workspaceRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: AgentEventBusService,
    @Optional() private readonly circuitBreaker: CircuitBreakerService | null = null,
    private readonly emitter: EventEmitter2,
  ) {
    this.workspaceRoot = this.configService.get<string>('WORKSPACE_ROOT', '/tmp/aenews-workspace');
  }

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<string>('GIT_LOCAL_ENABLED', 'true') === 'true';

    if (!enabled) {
      this.logger.warn('Git local connector is DISABLED (GIT_LOCAL_ENABLED=false)');
      this.isEnabled = false;
      return;
    }

    try {
      this.simpleGit = await import('simple-git' as any);
      this.isEnabled = true;
      this.logger.log(`Git local connector initialized (workspace root: ${this.workspaceRoot})`);
    } catch (error) {
      this.logger.error(`Failed to initialize simple-git: ${(error as Error).message}`);
      this.isEnabled = false;
    }
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  // ─── Git Operations ────────────────────────────────────────────

  async clone(url: string, destination: string): Promise<{ path: string; branch: string }> {
    return this.executeWithCircuit('clone', async () => {
      const safePath = this.sanitizePath(destination);
      const git = this.createGitInstance();

      await git.clone(url, safePath);

      const repoGit = this.createGitInstance(safePath);
      const branch = (await repoGit.branch()).current;

      return { path: safePath, branch };
    }, { url, destination });
  }

  async init(path: string): Promise<{ path: string; initialized: boolean }> {
    return this.executeWithCircuit('init', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      await git.init();

      return { path: safePath, initialized: true };
    }, { path });
  }

  async status(path: string): Promise<GitStatusResult> {
    return this.executeWithCircuit('status', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      const status = await git.status();

      return {
        repoPath: safePath,
        branch: status.current || 'HEAD',
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added,
        conflicted: status.conflicted,
        created: status.created,
        deleted: status.deleted,
        clean: status.isClean(),
      };
    }, { path });
  }

  async add(path: string, files?: string[]): Promise<{ added: string[] }> {
    return this.executeWithCircuit('add', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      if (files && files.length > 0) {
        await git.add(files);
      } else {
        await git.add('-A');
      }

      return { added: files || ['all'] };
    }, { path, files });
  }

  async commit(path: string, message: string): Promise<{ hash: string; branch: string; message: string }> {
    return this.executeWithCircuit('commit', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      const result = await git.commit(message);

      return {
        hash: result.commit || '',
        branch: result.branch || '',
        message,
      };
    }, { path, message });
  }

  async push(path: string, remote: string = 'origin', branch?: string): Promise<{ pushed: boolean; remote: string; branch: string }> {
    return this.executeWithCircuit('push', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      if (branch) {
        await git.push([remote, branch]);
      } else {
        await git.push(remote);
      }

      return { pushed: true, remote, branch: branch || 'current' };
    }, { path, remote, branch });
  }

  async pull(path: string, remote: string = 'origin', branch?: string): Promise<{ pulled: boolean; remote: string; branch: string }> {
    return this.executeWithCircuit('pull', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      if (branch) {
        await git.pull(remote, branch);
      } else {
        await git.pull(remote);
      }

      return { pulled: true, remote, branch: branch || 'current' };
    }, { path, remote, branch });
  }

  async log(path: string, options?: { maxCount?: number; branch?: string; file?: string }): Promise<GitLogEntry[]> {
    return this.executeWithCircuit('log', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      const logOptions: any = {};
      if (options?.maxCount) logOptions['--max-count'] = options.maxCount.toString();
      if (options?.file) logOptions.file = options.file;

      const result = await git.log(logOptions);

      return result.all.map((entry: any) => ({
        hash: entry.hash,
        date: entry.date,
        message: entry.message,
        author_name: entry.author_name,
        author_email: entry.author_email,
      }));
    }, { path, ...options });
  }

  async diff(path: string, options?: { cached?: boolean; file?: string; from?: string; to?: string }): Promise<GitDiffResult> {
    return this.executeWithCircuit('diff', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      const diffArgs: string[] = [];
      if (options?.cached) diffArgs.push('--cached');
      if (options?.from && options?.to) {
        diffArgs.push(`${options.from}..${options.to}`);
      }
      if (options?.file) diffArgs.push('--', options.file);

      const diffResult = await git.diffSummary(diffArgs.length > 0 ? diffArgs : undefined);
      const patchResult = await git.diff(diffArgs.length > 0 ? diffArgs : undefined);

      return {
        files: diffResult.files.map((f: any) => f.file),
        summary: {
          insertions: diffResult.insertions,
          deletions: diffResult.deletions,
          files: diffResult.changed,
        },
        patches: diffResult.files.map((f: any, i: number) => ({
          file: f.file,
          patch: typeof patchResult === 'string' ? patchResult : '',
        })),
      };
    }, { path, ...options });
  }

  async branch(path: string, name?: string): Promise<GitBranchResult> {
    return this.executeWithCircuit('branch', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      if (name) {
        // Create and checkout new branch
        await git.checkoutLocalBranch(name);
      }

      const branchSummary = await git.branch();

      return {
        current: branchSummary.current,
        branches: Object.keys(branchSummary.branches).map((b) => ({
          name: b,
          current: b === branchSummary.current,
        })),
      };
    }, { path, name });
  }

  async merge(path: string, branch: string): Promise<GitMergeResult> {
    return this.executeWithCircuit('merge', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      try {
        const result = await git.merge([branch]);

        return {
          merged: true,
          conflicts: result.conflicts || [],
          fastForward: result.fastForward || false,
          message: result.message || `Merged ${branch}`,
        };
      } catch (error: any) {
        // Check for merge conflicts
        if (error.message?.includes('CONFLICT')) {
          const status = await git.status();
          return {
            merged: false,
            conflicts: status.conflicted,
            fastForward: false,
            message: `Merge conflict in ${status.conflicted.length} file(s)`,
          };
        }
        throw error;
      }
    }, { path, branch });
  }

  async stash(path: string, action: 'push' | 'pop' | 'list' = 'push'): Promise<GitStashResult> {
    return this.executeWithCircuit('stash', async () => {
      const safePath = this.sanitizePath(path);
      const git = this.createGitInstance(safePath);

      switch (action) {
        case 'push':
          await git.stash();
          break;
        case 'pop':
          await git.stash(['pop']);
          break;
        case 'list': {
          const result = await git.stashList();
          return {
            stashCount: result.total,
            message: result.total > 0
              ? `${result.total} stash entries`
              : 'No stash entries',
          };
        }
      }

      const stashList = await git.stashList();
      return {
        stashCount: stashList.total,
        message: action === 'push' ? 'Changes stashed successfully' : 'Stash applied successfully',
      };
    }, { path, action });
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private createGitInstance(basePath?: string): any {
    if (!this.simpleGit) {
      throw new Error('simple-git is not initialized');
    }
    return this.simpleGit.default
      ? this.simpleGit.default(basePath || this.workspaceRoot)
      : this.simpleGit(basePath || this.workspaceRoot);
  }

  private sanitizePath(inputPath: string): string {
    const path = require('path');
    const resolved = path.resolve(this.workspaceRoot, inputPath);

    // Path traversal prevention
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(
        `Path traversal detected: "${inputPath}" resolves outside workspace root "${this.workspaceRoot}"`,
      );
    }

    return resolved;
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
            this.logger.warn(`Circuit OPEN for git-local connector — action ${action} rejected`);
            throw new Error(`Git local connector circuit breaker is OPEN — action "${action}" cannot be executed`);
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
      this.emitter.emit(`connector.git-local.${action}`, {
        action,
        success,
        durationMs,
        params: Object.keys(params),
        error,
        timestamp: Date.now(),
      });

      this.eventBus.emitConnectorEvent('git-local', action, success, durationMs);
    } catch {
      // Never let event emission failures affect the connector
    }
  }
}
