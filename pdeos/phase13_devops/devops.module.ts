/**
 * PDEOS Phase 13 — DevOps Module
 * 5 flagship agents + 20 classic DevOps agents + GitHub webhooks.
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LLMModule } from '../llm/llm.module';
import { RedisModule } from '../redis/redis.module';
import { InfrastructureModule } from '../phase11_infrastructure/infrastructure.module';
import { ProjectManagerAgent } from './agents/project-manager/project-manager.agent';
import { RepoMonitorAgent } from './agents/classic/repo-monitor.agent';
import { IssueManagerAgent } from './agents/classic/issue-manager.agent';
import { PullRequestAgent } from './agents/classic/pull-request.agent';
import { CodeReviewAgent } from './agents/classic/code-review.agent';
import { SecurityReviewAgent } from './agents/classic/security-review.agent';
import { AutoFixAgent } from './agents/classic/auto-fix.agent';
import { DependencyUpdateAgent } from './agents/classic/dependency-update.agent';
import { ReleaseManagerAgent } from './agents/classic/release-manager.agent';
import { ChangelogAgent } from './agents/classic/changelog.agent';
import { DocumentationAgent } from './agents/classic/documentation.agent';
import { TestRunnerAgent } from './agents/classic/test-runner.agent';
import { CiWatcherAgent } from './agents/classic/ci-watcher.agent';
import { WorkflowAgent } from './agents/classic/workflow.agent';
import { AutoMergeAgent } from './agents/classic/auto-merge.agent';
import { DeployAgent } from './agents/classic/deploy.agent';
import { RollbackAgent } from './agents/classic/rollback.agent';
import { PerformanceRegressionAgent } from './agents/classic/performance-regression.agent';
import { ArchitectureAuditorAgent } from './agents/classic/architecture-auditor.agent';
import { DeadCodeAgent } from './agents/classic/dead-code.agent';
import { TechDebtAgent } from './agents/classic/tech-debt.agent';

@Module({
  imports: [LLMModule, RedisModule, InfrastructureModule, ScheduleModule.forRoot()],
  providers: [
    ProjectManagerAgent,
    RepoMonitorAgent,
    IssueManagerAgent,
    PullRequestAgent,
    CodeReviewAgent,
    SecurityReviewAgent,
    AutoFixAgent,
    DependencyUpdateAgent,
    ReleaseManagerAgent,
    ChangelogAgent,
    DocumentationAgent,
    TestRunnerAgent,
    CiWatcherAgent,
    WorkflowAgent,
    AutoMergeAgent,
    DeployAgent,
    RollbackAgent,
    PerformanceRegressionAgent,
    ArchitectureAuditorAgent,
    DeadCodeAgent,
    TechDebtAgent,
  ],
  exports: [ProjectManagerAgent],
})
export class DevOpsModule {}
