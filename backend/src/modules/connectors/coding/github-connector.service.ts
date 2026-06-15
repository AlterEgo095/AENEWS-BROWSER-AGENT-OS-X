/**
 * AENEWS Agent OS X — GitHub Connector Service
 *
 * Real GitHub API integration using Octokit.
 * Provides repository, file, branch, commit, PR, issue, and code search operations.
 *
 * Features:
 *   - Octokit with authentication via GITHUB_TOKEN
 *   - Rate limit handling (X-RateLimit-Remaining header)
 *   - Circuit breaker integration (key: connector:github)
 *   - Event emission for audit trail
 *   - Falls back to simulation when GITHUB_TOKEN not configured
 */

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';

const CIRCUIT_KEY = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:github`;

export interface GitHubRepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  url: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubFileContent {
  path: string;
  name: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  encoding?: string;
  content?: string;
  sha: string;
  url: string;
}

export interface GitHubBranch {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  body: string;
  head: string;
  base: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  merged: boolean;
  mergeable?: boolean | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string;
  labels: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: Date;
  consumed: number;
}

@Injectable()
export class GitHubConnectorService implements OnModuleInit {
  private readonly logger = new Logger(GitHubConnectorService.name);
  private octokit: any = null;
  private isSimulation = true;
  private rateLimitInfo: GitHubRateLimit = {
    limit: 5000,
    remaining: 5000,
    reset: new Date(),
    consumed: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: AgentEventBusService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly emitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<string>('GITHUB_ENABLED', 'false') === 'true';
    const token = this.configService.get<string>('GITHUB_TOKEN', '');
    const apiUrl = this.configService.get<string>('GITHUB_API_URL', 'https://api.github.com');

    if (!enabled || !token) {
      this.logger.warn(
        `GitHub connector running in SIMULATION mode (GITHUB_ENABLED=${enabled}, token=${token ? 'set' : 'not set'})`,
      );
      this.isSimulation = true;
      return;
    }

    try {
      const { Octokit } = await import('@octokit/rest' as any);
      this.octokit = new Octokit({
        auth: token,
        baseUrl: apiUrl,
        request: { timeout: 30000 },
      });
      this.isSimulation = false;
      this.logger.log('GitHub connector initialized with Octokit (LIVE mode)');
    } catch (error) {
      this.logger.error(`Failed to initialize Octokit: ${(error as Error).message}. Falling back to simulation.`);
      this.isSimulation = true;
    }
  }

  get isLive(): boolean {
    return !this.isSimulation && this.octokit !== null;
  }

  // ─── Repository Operations ─────────────────────────────────────

  async listRepos(owner: string, type: string = 'owner'): Promise<GitHubRepoInfo[]> {
    return this.executeWithCircuit('listRepos', async () => {
      if (this.isSimulation) return this.simulate('listRepos', { owner, type });

      const { data } = await this.octokit.repos.listForUser({ username: owner, type, per_page: 100 });
      this.updateRateLimit(data);
      return data.map((r: any) => this.mapRepoInfo(r));
    }, { owner, type });
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepoInfo> {
    return this.executeWithCircuit('getRepo', async () => {
      if (this.isSimulation) return this.simulate('getRepo', { owner, repo });

      const { data } = await this.octokit.repos.get({ owner, repo });
      this.updateRateLimit(data);
      return this.mapRepoInfo(data);
    }, { owner, repo });
  }

  async createRepo(name: string, options?: { description?: string; private?: boolean; autoInit?: boolean }): Promise<GitHubRepoInfo> {
    return this.executeWithCircuit('createRepo', async () => {
      if (this.isSimulation) return this.simulate('createRepo', { name, ...options });

      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description: options?.description,
        private: options?.private ?? false,
        auto_init: options?.autoInit ?? true,
      });
      this.updateRateLimit(data);
      return this.mapRepoInfo(data);
    }, { name, ...options });
  }

  async searchRepos(query: string): Promise<{ total: number; items: GitHubRepoInfo[] }> {
    return this.executeWithCircuit('searchRepos', async () => {
      if (this.isSimulation) return this.simulate('searchRepos', { query });

      const { data } = await this.octokit.search.repos({ q: query, per_page: 30 });
      this.updateRateLimit(data);
      return {
        total: data.total_count,
        items: data.items.map((r: any) => this.mapRepoInfo(r)),
      };
    }, { query });
  }

  // ─── Files & Content ───────────────────────────────────────────

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFileContent> {
    return this.executeWithCircuit('getFileContent', async () => {
      if (this.isSimulation) return this.simulate('getFileContent', { owner, repo, path, ref });

      const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref });
      this.updateRateLimit(data);

      if (Array.isArray(data)) {
        // It's a directory, not a file
        throw new Error(`Path "${path}" is a directory, not a file. Use listDirectory() instead.`);
      }

      return {
        path: data.path,
        name: data.name,
        type: data.type as any,
        size: data.size,
        encoding: (data as any).encoding,
        content: (data as any).content ? Buffer.from((data as any).content, 'base64').toString('utf-8') : undefined,
        sha: data.sha,
        url: data.html_url,
      };
    }, { owner, repo, path, ref });
  }

  async createOrUpdateFile(
    owner: string, repo: string, path: string, content: string,
    message: string, branch: string, sha?: string,
  ): Promise<{ content: GitHubFileContent | null; commit: { sha: string; url: string } }> {
    return this.executeWithCircuit('createOrUpdateFile', async () => {
      if (this.isSimulation) return this.simulate('createOrUpdateFile', { owner, repo, path, content: content.substring(0, 100), message, branch, sha });

      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        branch,
        content: Buffer.from(content).toString('base64'),
        sha,
      });
      this.updateRateLimit(data);

      return {
        content: data.content ? {
          path: data.content.path,
          name: data.content.name,
          type: data.content.type as any,
          size: data.content.size,
          sha: data.content.sha,
          url: data.content.html_url,
        } : null,
        commit: {
          sha: data.commit.sha,
          url: data.commit.html_url,
        },
      };
    }, { owner, repo, path, message, branch });
  }

  async deleteFile(owner: string, repo: string, path: string, message: string, branch: string): Promise<{ commit: { sha: string; url: string } }> {
    return this.executeWithCircuit('deleteFile', async () => {
      if (this.isSimulation) return this.simulate('deleteFile', { owner, repo, path, message, branch });

      // First, get the file's SHA
      const { data: fileData } = await this.octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (Array.isArray(fileData)) {
        throw new Error(`Path "${path}" is a directory, not a file.`);
      }

      const { data } = await this.octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        branch,
        sha: fileData.sha,
      });
      this.updateRateLimit(data);

      return {
        commit: {
          sha: data.commit.sha,
          url: data.commit.html_url,
        },
      };
    }, { owner, repo, path, message, branch });
  }

  async listDirectory(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubFileContent[]> {
    return this.executeWithCircuit('listDirectory', async () => {
      if (this.isSimulation) return this.simulate('listDirectory', { owner, repo, path, ref });

      const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref });
      this.updateRateLimit(data);

      if (!Array.isArray(data)) {
        // Single file returned
        return [this.mapFileContent(data)];
      }

      return data.map((item: any) => this.mapFileContent(item));
    }, { owner, repo, path, ref });
  }

  async getTree(owner: string, repo: string, ref: string = 'main'): Promise<GitHubFileContent[]> {
    return this.executeWithCircuit('getTree', async () => {
      if (this.isSimulation) return this.simulate('getTree', { owner, repo, ref });

      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: ref,
        recursive: 'true',
      });
      this.updateRateLimit(data);

      return data.tree
        .filter((item: any) => item.type === 'blob' || item.type === 'tree')
        .map((item: any) => ({
          path: item.path,
          name: item.path?.split('/').pop() || '',
          type: item.type === 'blob' ? 'file' : 'dir',
          size: item.size || 0,
          sha: item.sha,
          url: item.url,
        }));
    }, { owner, repo, ref });
  }

  // ─── Branches & Commits ────────────────────────────────────────

  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.executeWithCircuit('listBranches', async () => {
      if (this.isSimulation) return this.simulate('listBranches', { owner, repo });

      const { data } = await this.octokit.repos.listBranches({ owner, repo, per_page: 100 });
      this.updateRateLimit(data);
      return data.map((b: any) => ({
        name: b.name,
        commitSha: b.commit.sha,
        protected: b.protected,
      }));
    }, { owner, repo });
  }

  async createBranch(owner: string, repo: string, branch: string, from?: string): Promise<GitHubBranch> {
    return this.executeWithCircuit('createBranch', async () => {
      if (this.isSimulation) return this.simulate('createBranch', { owner, repo, branch, from });

      // Get the SHA of the source branch
      const sourceRef = from || 'main';
      const { data: refData } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${sourceRef}` });

      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: refData.object.sha,
      });
      this.updateRateLimit(data);

      return {
        name: branch,
        commitSha: data.object.sha,
        protected: false,
      };
    }, { owner, repo, branch, from });
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    return this.executeWithCircuit('getCommit', async () => {
      if (this.isSimulation) return this.simulate('getCommit', { owner, repo, sha });

      const { data } = await this.octokit.repos.getCommit({ owner, repo, ref: sha });
      this.updateRateLimit(data);
      return {
        sha: data.sha,
        message: data.commit.message,
        author: data.commit.author?.name || 'unknown',
        date: data.commit.author?.date || '',
        url: data.html_url,
      };
    }, { owner, repo, sha });
  }

  async listCommits(owner: string, repo: string, options?: { sha?: string; path?: string; perPage?: number }): Promise<GitHubCommit[]> {
    return this.executeWithCircuit('listCommits', async () => {
      if (this.isSimulation) return this.simulate('listCommits', { owner, repo, ...options });

      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        sha: options?.sha,
        path: options?.path,
        per_page: options?.perPage || 30,
      });
      this.updateRateLimit(data);
      return data.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name || 'unknown',
        date: c.commit.author?.date || '',
        url: c.html_url,
      }));
    }, { owner, repo, ...options });
  }

  // ─── Pull Requests ─────────────────────────────────────────────

  async createPR(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<GitHubPR> {
    return this.executeWithCircuit('createPR', async () => {
      if (this.isSimulation) return this.simulate('createPR', { owner, repo, title, head, base, body });

      const { data } = await this.octokit.pulls.create({ owner, repo, title, head, base, body: body || '' });
      this.updateRateLimit(data);
      return this.mapPR(data);
    }, { owner, repo, title, head, base });
  }

  async listPRs(owner: string, repo: string, state: string = 'open'): Promise<GitHubPR[]> {
    return this.executeWithCircuit('listPRs', async () => {
      if (this.isSimulation) return this.simulate('listPRs', { owner, repo, state });

      const { data } = await this.octokit.pulls.list({ owner, repo, state, per_page: 100 });
      this.updateRateLimit(data);
      return data.map((pr: any) => this.mapPR(pr));
    }, { owner, repo, state });
  }

  async getPR(owner: string, repo: string, number: number): Promise<GitHubPR> {
    return this.executeWithCircuit('getPR', async () => {
      if (this.isSimulation) return this.simulate('getPR', { owner, repo, number });

      const { data } = await this.octokit.pulls.get({ owner, repo, pull_number: number });
      this.updateRateLimit(data);
      return this.mapPR(data);
    }, { owner, repo, number });
  }

  async mergePR(owner: string, repo: string, number: number): Promise<{ sha: string; merged: boolean; message: string }> {
    return this.executeWithCircuit('mergePR', async () => {
      if (this.isSimulation) return this.simulate('mergePR', { owner, repo, number });

      const { data } = await this.octokit.pulls.merge({ owner, repo, pull_number: number });
      this.updateRateLimit(data);
      return {
        sha: data.sha,
        merged: data.merged,
        message: data.message,
      };
    }, { owner, repo, number });
  }

  async reviewPR(owner: string, repo: string, number: number, body: string, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'): Promise<{ id: number; state: string }> {
    return this.executeWithCircuit('reviewPR', async () => {
      if (this.isSimulation) return this.simulate('reviewPR', { owner, repo, number, body, event });

      const { data } = await this.octokit.pulls.createReview({ owner, repo, pull_number: number, body, event });
      this.updateRateLimit(data);
      return {
        id: data.id,
        state: data.state,
      };
    }, { owner, repo, number, event });
  }

  // ─── Issues ────────────────────────────────────────────────────

  async createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<GitHubIssue> {
    return this.executeWithCircuit('createIssue', async () => {
      if (this.isSimulation) return this.simulate('createIssue', { owner, repo, title, body, labels });

      const { data } = await this.octokit.issues.create({ owner, repo, title, body: body || '', labels: labels || [] });
      this.updateRateLimit(data);
      return this.mapIssue(data);
    }, { owner, repo, title });
  }

  async listIssues(owner: string, repo: string, state: string = 'open'): Promise<GitHubIssue[]> {
    return this.executeWithCircuit('listIssues', async () => {
      if (this.isSimulation) return this.simulate('listIssues', { owner, repo, state });

      const { data } = await this.octokit.issues.listForRepo({ owner, repo, state, per_page: 100 });
      this.updateRateLimit(data);
      return data.map((i: any) => this.mapIssue(i));
    }, { owner, repo, state });
  }

  async addComment(owner: string, repo: string, number: number, body: string): Promise<{ id: number; url: string }> {
    return this.executeWithCircuit('addComment', async () => {
      if (this.isSimulation) return this.simulate('addComment', { owner, repo, number, body });

      const { data } = await this.octokit.issues.createComment({ owner, repo, issue_number: number, body });
      this.updateRateLimit(data);
      return {
        id: data.id,
        url: data.html_url,
      };
    }, { owner, repo, number });
  }

  // ─── Code Search ───────────────────────────────────────────────

  async searchCode(query: string): Promise<{ total: number; items: Array<{ path: string; repository: string; url: string }> }> {
    return this.executeWithCircuit('searchCode', async () => {
      if (this.isSimulation) return this.simulate('searchCode', { query });

      const { data } = await this.octokit.search.code({ q: query, per_page: 30 });
      this.updateRateLimit(data);
      return {
        total: data.total_count,
        items: data.items.map((item: any) => ({
          path: item.path,
          repository: item.repository.full_name,
          url: item.html_url,
        })),
      };
    }, { query });
  }

  async searchIssues(query: string): Promise<{ total: number; items: GitHubIssue[] }> {
    return this.executeWithCircuit('searchIssues', async () => {
      if (this.isSimulation) return this.simulate('searchIssues', { query });

      const { data } = await this.octokit.search.issuesAndPullRequests({ q: query, per_page: 30 });
      this.updateRateLimit(data);
      return {
        total: data.total_count,
        items: data.items.map((i: any) => this.mapIssue(i)),
      };
    }, { query });
  }

  // ─── Rate Limit Info ───────────────────────────────────────────

  getRateLimit(): GitHubRateLimit {
    return { ...this.rateLimitInfo };
  }

  // ─── Circuit Breaker Wrapper ───────────────────────────────────

  private async executeWithCircuit<T>(
    action: string,
    fn: () => Promise<T>,
    params: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(
        CIRCUIT_KEY,
        fn,
        async () => {
          this.logger.warn(`Circuit OPEN for GitHub connector — returning simulation for ${action}`);
          return this.simulate(action, params);
        },
      );

      const duration = Date.now() - startTime;
      this.emitEvent(action, true, duration, params);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emitEvent(action, false, duration, params, (error as Error).message);
      throw error;
    }
  }

  // ─── Simulation Fallback ───────────────────────────────────────

  private simulate(action: string, params: Record<string, any>): any {
    this.logger.debug(`[SIMULATION] GitHub.${action} called with: ${JSON.stringify(params)}`);

    const simResults: Record<string, any> = {
      listRepos: [
        { owner: params.owner, name: 'simulated-repo', fullName: `${params.owner}/simulated-repo`, description: 'Simulated repository', private: false, url: `https://github.com/${params.owner}/simulated-repo`, defaultBranch: 'main', stars: 42, forks: 7, language: 'TypeScript', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      getRepo: { owner: params.owner, name: params.repo, fullName: `${params.owner}/${params.repo}`, description: 'Simulated repository details', private: false, url: `https://github.com/${params.owner}/${params.repo}`, defaultBranch: 'main', stars: 100, forks: 20, language: 'TypeScript', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      createRepo: { owner: 'simulated-user', name: params.name, fullName: `simulated-user/${params.name}`, description: params.description || 'New repository', private: params.private || false, url: `https://github.com/simulated-user/${params.name}`, defaultBranch: 'main', stars: 0, forks: 0, language: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      searchRepos: { total: 1, items: [{ owner: 'simulated', name: 'search-result', fullName: 'simulated/search-result', description: 'Search result', private: false, url: 'https://github.com/simulated/search-result', defaultBranch: 'main', stars: 50, forks: 5, language: 'TypeScript', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
      getFileContent: { path: params.path, name: params.path.split('/').pop(), type: 'file', size: 256, encoding: 'base64', content: `// Simulated file content for ${params.path}`, sha: 'sim-sha-123', url: `https://github.com/${params.owner}/${params.repo}/blob/main/${params.path}` },
      createOrUpdateFile: { content: { path: params.path, name: params.path.split('/').pop(), type: 'file', size: params.content?.length || 0, sha: 'sim-sha-456', url: `https://github.com/${params.owner}/${params.repo}/blob/${params.branch}/${params.path}` }, commit: { sha: 'sim-commit-sha', url: `https://github.com/${params.owner}/${params.repo}/commit/sim-commit-sha` } },
      deleteFile: { commit: { sha: 'sim-delete-sha', url: `https://github.com/${params.owner}/${params.repo}/commit/sim-delete-sha` } },
      listDirectory: [
        { path: 'src', name: 'src', type: 'dir', size: 0, sha: 'dir-sha-1', url: '' },
        { path: 'README.md', name: 'README.md', type: 'file', size: 1024, sha: 'file-sha-1', url: '' },
        { path: 'package.json', name: 'package.json', type: 'file', size: 512, sha: 'file-sha-2', url: '' },
      ],
      getTree: [
        { path: 'src/index.ts', name: 'index.ts', type: 'file', size: 256, sha: 'tree-sha-1', url: '' },
        { path: 'src/app.ts', name: 'app.ts', type: 'file', size: 512, sha: 'tree-sha-2', url: '' },
        { path: 'package.json', name: 'package.json', type: 'file', size: 512, sha: 'tree-sha-3', url: '' },
      ],
      listBranches: [
        { name: 'main', commitSha: 'sim-main-sha', protected: true },
        { name: 'develop', commitSha: 'sim-dev-sha', protected: false },
      ],
      createBranch: { name: params.branch, commitSha: 'sim-new-branch-sha', protected: false },
      getCommit: { sha: params.sha, message: 'Simulated commit message', author: 'simulated-user', date: new Date().toISOString(), url: `https://github.com/${params.owner}/${params.repo}/commit/${params.sha}` },
      listCommits: [
        { sha: 'sim-sha-1', message: 'Initial commit', author: 'simulated-user', date: new Date().toISOString(), url: '' },
        { sha: 'sim-sha-2', message: 'Add feature', author: 'simulated-user', date: new Date().toISOString(), url: '' },
      ],
      createPR: { number: 1, title: params.title, state: 'open', body: params.body || '', head: params.head, base: params.base, url: `https://github.com/${params.owner}/${params.repo}/pull/1`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), merged: false, mergeable: true },
      listPRs: [{ number: 1, title: 'Simulated PR', state: params.state, body: '', head: 'feature-branch', base: 'main', url: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), merged: false }],
      getPR: { number: params.number, title: 'Simulated PR', state: 'open', body: 'PR description', head: 'feature', base: 'main', url: `https://github.com/${params.owner}/${params.repo}/pull/${params.number}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), merged: false, mergeable: true },
      mergePR: { sha: 'sim-merge-sha', merged: true, message: 'Pull request successfully merged' },
      reviewPR: { id: 1, state: params.event === 'APPROVE' ? 'APPROVED' : params.event === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'COMMENTED' },
      createIssue: { number: 1, title: params.title, state: 'open', body: params.body || '', labels: params.labels || [], url: `https://github.com/${params.owner}/${params.repo}/issues/1`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      listIssues: [{ number: 1, title: 'Simulated Issue', state: params.state, body: 'Issue description', labels: ['bug'], url: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      addComment: { id: 1, url: `https://github.com/${params.owner}/${params.repo}/issues/${params.number}#issuecomment-1` },
      searchCode: { total: 1, items: [{ path: 'src/index.ts', repository: 'simulated/repo', url: 'https://github.com/simulated/repo/blob/main/src/index.ts' }] },
      searchIssues: { total: 1, items: [{ number: 1, title: 'Search result', state: 'open', body: '', labels: [], url: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
    };

    return {
      ...simResults[action],
      _meta: { source: 'simulation', action, timestamp: Date.now() },
    };
  }

  // ─── Mapping Helpers ───────────────────────────────────────────

  private mapRepoInfo(r: any): GitHubRepoInfo {
    return {
      owner: r.owner?.login || '',
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      private: r.private,
      url: r.html_url,
      defaultBranch: r.default_branch,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapFileContent(f: any): GitHubFileContent {
    return {
      path: f.path,
      name: f.name,
      type: f.type,
      size: f.size,
      sha: f.sha,
      url: f.html_url,
    };
  }

  private mapPR(pr: any): GitHubPR {
    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      body: pr.body || '',
      head: pr.head?.ref || '',
      base: pr.base?.ref || '',
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      merged: pr.merged || false,
      mergeable: pr.mergeable,
    };
  }

  private mapIssue(i: any): GitHubIssue {
    return {
      number: i.number,
      title: i.title,
      state: i.state,
      body: i.body || '',
      labels: (i.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name)),
      url: i.html_url,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    };
  }

  // ─── Rate Limit Tracking ───────────────────────────────────────

  private updateRateLimit(response: any): void {
    try {
      if (response?.headers) {
        this.rateLimitInfo = {
          limit: parseInt(response.headers['x-ratelimit-limit'] || '5000', 10),
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '5000', 10),
          reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0', 10) * 1000),
          consumed: 5000 - parseInt(response.headers['x-ratelimit-remaining'] || '5000', 10),
        };

        // Warn when rate limit is low
        if (this.rateLimitInfo.remaining < 100) {
          this.logger.warn(
            `GitHub API rate limit low: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.remaining} remaining. Resets at ${this.rateLimitInfo.reset.toISOString()}`,
          );
        }
      }
    } catch {
      // Don't let rate limit tracking failures break the connector
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
      this.emitter.emit(`connector.github.${action}`, {
        action,
        success,
        durationMs,
        params: Object.keys(params),
        error,
        mode: this.isSimulation ? 'simulation' : 'live',
        timestamp: Date.now(),
      });

      this.eventBus.emitConnectorEvent('github', action, success, durationMs, {
        mode: this.isSimulation ? 'simulation' : 'live',
        rateLimitRemaining: this.rateLimitInfo.remaining,
      });
    } catch {
      // Never let event emission failures affect the connector
    }
  }
}
