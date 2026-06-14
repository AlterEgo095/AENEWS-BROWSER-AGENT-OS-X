/**
 * AENEWS Agent OS X — Coding Connector Module
 *
 * NestJS module that provides and wires the three coding connectors:
 *   - GitHubConnectorService: GitHub API integration (Octokit)
 *   - GitLocalConnectorService: Local git operations (simple-git)
 *   - FilesystemConnectorService: Safe file system operations
 *
 * All three are registered with:
 *   - AgentBridgeService (for agent framework routing)
 *   - CircuitBreakerService (for fault tolerance)
 *
 * Configuration via environment variables:
 *   GITHUB_ENABLED=false         — Enable GitHub API integration
 *   GITHUB_TOKEN=                — GitHub personal access token
 *   GITHUB_API_URL=https://api.github.com
 *   GITHUB_WEBHOOK_SECRET=
 *   GIT_LOCAL_ENABLED=true       — Enable local git operations
 *   WORKSPACE_ROOT=/tmp/aenews-workspace
 *   MAX_FILE_SIZE_BYTES=10485760 — 10MB default max file size
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GitHubConnectorService } from './github-connector.service';
import { GitLocalConnectorService } from './git-local-connector.service';
import { FilesystemConnectorService } from './filesystem-connector.service';
import { AgentBridgeService, SoftwareFactoryConnector } from '../../agent-framework/services/agent-bridge.service';

// ─── GitHub Bridge Connector ─────────────────────────────────────

class GitHubBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'github';
  readonly description = 'GitHub API integration — repositories, files, branches, PRs, issues, code search';
  readonly actions = [
    'listRepos', 'getRepo', 'createRepo', 'searchRepos',
    'getFileContent', 'createOrUpdateFile', 'deleteFile', 'listDirectory', 'getTree',
    'listBranches', 'createBranch', 'getCommit', 'listCommits',
    'createPR', 'listPRs', 'getPR', 'mergePR', 'reviewPR',
    'createIssue', 'listIssues', 'addComment',
    'searchCode', 'searchIssues',
  ];

  constructor(private readonly githubService: GitHubConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    const svc = this.githubService;
    switch (action) {
      case 'listRepos': return svc.listRepos(params.owner, params.type);
      case 'getRepo': return svc.getRepo(params.owner, params.repo);
      case 'createRepo': return svc.createRepo(params.name, params.options);
      case 'searchRepos': return svc.searchRepos(params.query);
      case 'getFileContent': return svc.getFileContent(params.owner, params.repo, params.path, params.ref);
      case 'createOrUpdateFile': return svc.createOrUpdateFile(params.owner, params.repo, params.path, params.content, params.message, params.branch, params.sha);
      case 'deleteFile': return svc.deleteFile(params.owner, params.repo, params.path, params.message, params.branch);
      case 'listDirectory': return svc.listDirectory(params.owner, params.repo, params.path, params.ref);
      case 'getTree': return svc.getTree(params.owner, params.repo, params.ref);
      case 'listBranches': return svc.listBranches(params.owner, params.repo);
      case 'createBranch': return svc.createBranch(params.owner, params.repo, params.branch, params.from);
      case 'getCommit': return svc.getCommit(params.owner, params.repo, params.sha);
      case 'listCommits': return svc.listCommits(params.owner, params.repo, params.options);
      case 'createPR': return svc.createPR(params.owner, params.repo, params.title, params.head, params.base, params.body);
      case 'listPRs': return svc.listPRs(params.owner, params.repo, params.state);
      case 'getPR': return svc.getPR(params.owner, params.repo, params.number);
      case 'mergePR': return svc.mergePR(params.owner, params.repo, params.number);
      case 'reviewPR': return svc.reviewPR(params.owner, params.repo, params.number, params.body, params.event);
      case 'createIssue': return svc.createIssue(params.owner, params.repo, params.title, params.body, params.labels);
      case 'listIssues': return svc.listIssues(params.owner, params.repo, params.state);
      case 'addComment': return svc.addComment(params.owner, params.repo, params.number, params.body);
      case 'searchCode': return svc.searchCode(params.query);
      case 'searchIssues': return svc.searchIssues(params.query);
      default: throw new Error(`GitHub connector: unsupported action "${action}"`);
    }
  }
}

// ─── Git Local Bridge Connector ──────────────────────────────────

class GitLocalBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'git-local';
  readonly description = 'Local git operations — clone, init, status, add, commit, push, pull, log, diff, branch, merge, stash';
  readonly actions = [
    'clone', 'init', 'status', 'add', 'commit', 'push', 'pull',
    'log', 'diff', 'branch', 'merge', 'stash',
  ];

  constructor(private readonly gitLocalService: GitLocalConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    const svc = this.gitLocalService;
    switch (action) {
      case 'clone': return svc.clone(params.url, params.destination);
      case 'init': return svc.init(params.path);
      case 'status': return svc.status(params.path);
      case 'add': return svc.add(params.path, params.files);
      case 'commit': return svc.commit(params.path, params.message);
      case 'push': return svc.push(params.path, params.remote, params.branch);
      case 'pull': return svc.pull(params.path, params.remote, params.branch);
      case 'log': return svc.log(params.path, params.options);
      case 'diff': return svc.diff(params.path, params.options);
      case 'branch': return svc.branch(params.path, params.name);
      case 'merge': return svc.merge(params.path, params.branch);
      case 'stash': return svc.stash(params.path, params.action);
      default: throw new Error(`Git local connector: unsupported action "${action}"`);
    }
  }
}

// ─── Filesystem Bridge Connector ─────────────────────────────────

class FilesystemBridgeConnector implements SoftwareFactoryConnector {
  readonly name = 'filesystem';
  readonly description = 'Safe file system operations — read, write, list, mkdir, remove, copy, move, exists, stat, search, grep';
  readonly actions = [
    'readFile', 'writeFile', 'listDir', 'mkdir', 'remove',
    'copy', 'move', 'exists', 'stat', 'search', 'grep',
  ];

  constructor(private readonly fsService: FilesystemConnectorService) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    const svc = this.fsService;
    switch (action) {
      case 'readFile': return svc.readFile(params.filePath);
      case 'writeFile': return svc.writeFile(params.filePath, params.content);
      case 'listDir': return svc.listDir(params.dirPath);
      case 'mkdir': return svc.mkdir(params.dirPath, params.recursive);
      case 'remove': return svc.remove(params.targetPath, params.recursive);
      case 'copy': return svc.copy(params.src, params.dest);
      case 'move': return svc.move(params.src, params.dest);
      case 'exists': return svc.exists(params.filePath);
      case 'stat': return svc.stat(params.filePath);
      case 'search': return svc.search(params.root, params.pattern);
      case 'grep': return svc.grep(params.root, params.pattern, params.filePattern);
      default: throw new Error(`Filesystem connector: unsupported action "${action}"`);
    }
  }
}

// ─── Module ──────────────────────────────────────────────────────

@Module({
  providers: [
    GitHubConnectorService,
    GitLocalConnectorService,
    FilesystemConnectorService,
  ],
  exports: [
    GitHubConnectorService,
    GitLocalConnectorService,
    FilesystemConnectorService,
  ],
})
export class CodingConnectorModule implements OnModuleInit {
  private readonly logger = new Logger(CodingConnectorModule.name);

  constructor(
    private readonly githubService: GitHubConnectorService,
    private readonly gitLocalService: GitLocalConnectorService,
    private readonly filesystemService: FilesystemConnectorService,
    private readonly bridgeService: AgentBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Register all three coding connectors with the AgentBridgeService
    // This replaces the simulation "coding" connector with real implementations

    this.bridgeService.registerConnector('github', new GitHubBridgeConnector(this.githubService));
    this.logger.log('Registered GitHub connector with AgentBridge');

    this.bridgeService.registerConnector('git-local', new GitLocalBridgeConnector(this.gitLocalService));
    this.logger.log('Registered Git Local connector with AgentBridge');

    this.bridgeService.registerConnector('filesystem', new FilesystemBridgeConnector(this.filesystemService));
    this.logger.log('Registered Filesystem connector with AgentBridge');

    // Also update the "coding" connector to route to the real services
    this.bridgeService.registerConnector('coding', {
      name: 'coding',
      description: 'Unified coding connector — delegates to github, git-local, and filesystem',
      actions: [
        // GitHub actions
        'listRepos', 'getRepo', 'createRepo', 'searchRepos',
        'getFileContent', 'createOrUpdateFile', 'deleteFile', 'listDirectory', 'getTree',
        'listBranches', 'createBranch', 'getCommit', 'listCommits',
        'createPR', 'listPRs', 'getPR', 'mergePR', 'reviewPR',
        'createIssue', 'listIssues', 'addComment',
        'searchCode', 'searchIssues',
        // Git local actions
        'clone', 'init', 'status', 'add', 'commit', 'push', 'pull',
        'log', 'diff', 'branch', 'merge', 'stash',
        // Filesystem actions
        'readFile', 'writeFile', 'listDir', 'mkdir', 'remove',
        'copy', 'move', 'exists', 'stat', 'search', 'grep',
      ],
      execute: async (action: string, params: Record<string, any>) => {
        // Route to the appropriate sub-connector based on action type
        const githubActions = new Set([
          'listRepos', 'getRepo', 'createRepo', 'searchRepos',
          'getFileContent', 'createOrUpdateFile', 'deleteFile', 'listDirectory', 'getTree',
          'listBranches', 'createBranch', 'getCommit', 'listCommits',
          'createPR', 'listPRs', 'getPR', 'mergePR', 'reviewPR',
          'createIssue', 'listIssues', 'addComment',
          'searchCode', 'searchIssues',
        ]);
        const gitLocalActions = new Set([
          'clone', 'init', 'status', 'add', 'commit', 'push', 'pull',
          'log', 'diff', 'branch', 'merge', 'stash',
        ]);
        const fsActions = new Set([
          'readFile', 'writeFile', 'listDir', 'mkdir', 'remove',
          'copy', 'move', 'exists', 'stat', 'search', 'grep',
        ]);

        if (githubActions.has(action)) {
          return this.bridgeService.executeViaConnector('github', action, params);
        } else if (gitLocalActions.has(action)) {
          return this.bridgeService.executeViaConnector('git-local', action, params);
        } else if (fsActions.has(action)) {
          return this.bridgeService.executeViaConnector('filesystem', action, params);
        }

        throw new Error(`Coding connector: unsupported action "${action}"`);
      },
    });

    this.logger.log('Registered unified Coding connector with AgentBridge');
    this.logger.log(
      `Coding Connector Module initialized — GitHub: ${this.githubService.isLive ? 'LIVE' : 'SIMULATION'}, ` +
      `Git Local: ${this.gitLocalService.enabled ? 'ENABLED' : 'DISABLED'}, ` +
      `Filesystem: ENABLED`,
    );
  }
}
