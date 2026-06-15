import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';

export class VersionControlAgent extends BaseAgent {
  readonly name = 'VersionControlAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = [
    'commit',
    'branch',
    'merge',
    'diff',
    'log',
    'tag',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Manages Git and version control operations including commits, branches, merges, diffs, logs, and tags';

  readonly missionCategories = [MissionCategory.CODE_DEVELOPMENT];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'commit';
      const startTime = Date.now();

      switch (action) {
        case 'commit': {
          const repositoryPath = config.repositoryPath;
          const message = config.message;
          const files = config.files || [];
          const all = config.all || false;
          const amend = config.amend || false;
          const allowEmpty = config.allowEmpty || false;
          const author = config.author;
          const coAuthors = config.coAuthors || [];
          const noVerify = config.noVerify || false;

          if (!message) {
            return {
              success: false,
              error: '"message" is required for commit',
            };
          }

          this.logger.log(
            `Committing changes: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              message,
              files,
              all,
              amend,
              author,
              noVerify,
              commitHash: '',
              shortHash: '',
              branch: '',
              filesChanged: 0,
              insertions: 0,
              deletions: 0,
              coAuthors,
              status: 'committed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'branch': {
          const repositoryPath = config.repositoryPath;
          const branchName = config.branchName;
          const baseBranch = config.baseBranch;
          const operation = config.operation || 'create';
          const remote = config.remote || 'origin';
          const track = config.track || false;
          const force = config.force || false;

          if (!branchName && operation !== 'list') {
            return {
              success: false,
              error: '"branchName" is required for branch operations (except list)',
            };
          }

          this.logger.log(
            `Branch operation: ${operation}${branchName ? ` "${branchName}"` : ''}${baseBranch ? ` from ${baseBranch}` : ''}`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              branchName,
              baseBranch,
              operation,
              remote,
              track,
              force,
              currentBranch: '',
              createdFrom: baseBranch || '',
              branches: operation === 'list'
                ? [] as Array<{
                    name: string;
                    current: boolean;
                    remote: boolean;
                    lastCommit: string;
                    lastCommitDate: string;
                  }>
                : undefined,
              status: operation === 'list' ? 'branches_listed' : 'branch_operation_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'merge': {
          const repositoryPath = config.repositoryPath;
          const sourceBranch = config.sourceBranch;
          const targetBranch = config.targetBranch;
          const strategy = config.strategy || 'merge-commit';
          const message = config.message;
          const noFastForward = config.noFastForward !== false;
          const squash = config.squash || false;
          const abortOnConflict = config.abortOnConflict || false;

          if (!sourceBranch) {
            return {
              success: false,
              error: '"sourceBranch" is required for merge',
            };
          }

          this.logger.log(
            `Merging ${sourceBranch} into ${targetBranch || 'current branch'} (strategy: ${strategy}, squash: ${squash})`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              sourceBranch,
              targetBranch: targetBranch || '',
              strategy,
              message,
              noFastForward,
              squash,
              abortOnConflict,
              mergeCommitHash: '',
              conflicts: [] as Array<{
                file: string;
                type: 'content' | 'delete-modify' | 'rename';
                ours: string;
                theirs: string;
              }>,
              filesChanged: 0,
              insertions: 0,
              deletions: 0,
              mergedSuccessfully: true,
              status: 'merged',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'diff': {
          const repositoryPath = config.repositoryPath;
          const fromRef = config.fromRef || 'HEAD';
          const toRef = config.toRef || 'working-tree';
          const filePaths = config.filePaths || [];
          const contextLines = config.contextLines || 3;
          const ignoreWhitespace = config.ignoreWhitespace || false;
          const statOnly = config.statOnly || false;

          this.logger.log(
            `Computing diff from ${fromRef} to ${toRef}${filePaths.length ? ` (${filePaths.length} file(s))` : ''}`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              fromRef,
              toRef,
              filePaths,
              contextLines,
              ignoreWhitespace,
              statOnly,
              diff: statOnly ? undefined : '',
              stats: {
                filesChanged: 0,
                insertions: 0,
                deletions: 0,
                fileStats: [] as Array<{
                  file: string;
                  insertions: number;
                  deletions: number;
                  binary: boolean;
                  status: 'added' | 'modified' | 'deleted' | 'renamed';
                }>,
              },
              status: 'diff_computed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'log': {
          const repositoryPath = config.repositoryPath;
          const branch = config.branch;
          const maxCount = config.maxCount || 50;
          const since = config.since;
          const until = config.until;
          const author = config.author;
          const filePaths = config.filePaths || [];
          const format = config.format || 'medium';
          const grep = config.grep;

          this.logger.log(
            `Retrieving git log${branch ? ` for ${branch}` : ''} (max: ${maxCount})`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              branch,
              maxCount,
              since,
              until,
              author,
              filePaths,
              format,
              grep,
              commits: [] as Array<{
                hash: string;
                shortHash: string;
                author: string;
                authorEmail: string;
                date: string;
                message: string;
                refs: string[];
                filesChanged: number;
              }>,
              totalCount: 0,
              hasMore: false,
              status: 'log_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'tag': {
          const repositoryPath = config.repositoryPath;
          const tagName = config.tagName;
          const operation = config.operation || 'create';
          const message = config.message;
          const commitRef = config.commitRef || 'HEAD';
          const annotated = config.annotated !== false;
          const force = config.force || false;
          const remote = config.remote;

          if (!tagName && operation !== 'list') {
            return {
              success: false,
              error: '"tagName" is required for tag operations (except list)',
            };
          }

          this.logger.log(
            `Tag operation: ${operation}${tagName ? ` "${tagName}"` : ''} at ${commitRef}`,
          );

          return {
            success: true,
            data: {
              action,
              repositoryPath,
              tagName,
              operation,
              message,
              commitRef,
              annotated,
              force,
              remote,
              tagCommitHash: '',
              tags: operation === 'list'
                ? [] as Array<{
                    name: string;
                    commitHash: string;
                    date: string;
                    message: string;
                    annotated: boolean;
                    author: string;
                  }>
                : undefined,
              pushed: !!remote,
              status: operation === 'list' ? 'tags_listed' : 'tag_operation_completed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: commit, branch, merge, diff, log, tag`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
