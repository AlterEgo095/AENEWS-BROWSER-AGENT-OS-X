/**
 * AENEWS Agent OS X - Coding Cluster Module
 * Aggregates all 8 coding agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all coding agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { CodeGenerationAgentService } from './code-generation/code-generation-agent.service';
import { CodeReviewAgentService } from './code-review/code-review-agent.service';
import { TestingAgentService } from './testing/testing-agent.service';
import { DebuggingAgentService } from './debugging/debugging-agent.service';
import { DocumentationAgentService } from './documentation/documentation-agent.service';
import { DependencyAgentService } from './dependency/dependency-agent.service';
import { VersionControlAgentService } from './version-control/version-control-agent.service';
import { BuildAgentService } from './build/build-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Code Generation — generate code from specs, templates, descriptions; refactor and optimize
    CodeGenerationAgentService,
    // 2. Code Review — review quality, security, best practices, bugs, complexity
    CodeReviewAgentService,
    // 3. Testing — generate unit/integration tests, run tests, analyze coverage, generate fixtures
    TestingAgentService,
    // 4. Debugging — analyze errors, trace execution, suggest/apply/validate fixes
    DebuggingAgentService,
    // 5. Documentation — generate docs, API docs, READMEs, changelogs, type docs
    DocumentationAgentService,
    // 6. Dependency — list dependencies, check vulnerabilities, update, audit, resolve conflicts
    DependencyAgentService,
    // 7. Version Control — commit, branch, merge, rebase, resolve conflicts, diff, log
    VersionControlAgentService,
    // 8. Build — build, compile, bundle, clean build, configure, get build info
    BuildAgentService,
  ],
  exports: [
    CodeGenerationAgentService,
    CodeReviewAgentService,
    TestingAgentService,
    DebuggingAgentService,
    DocumentationAgentService,
    DependencyAgentService,
    VersionControlAgentService,
    BuildAgentService,
  ],
})
export class CodingClusterModule {}
