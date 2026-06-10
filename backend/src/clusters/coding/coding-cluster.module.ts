import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { CodeGenerationAgent } from './agents/code-generation.agent';
import { CodeReviewAgent } from './agents/code-review.agent';
import { TestingCodeAgent } from './agents/testing-code.agent';
import { DocumentationAgent } from './agents/documentation.agent';
import { DeploymentAgent } from './agents/deployment.agent';
import { VersionControlAgent } from './agents/version-control.agent';
import { DependencyAgent } from './agents/dependency.agent';
import { DebuggingAgent } from './agents/debugging.agent';

/**
 * Factory function that creates all 8 Coding Cluster agent instances.
 * Called once during module initialization.
 */
function createCodingAgents() {
  return [
    new CodeGenerationAgent(),
    new CodeReviewAgent(),
    new TestingCodeAgent(),
    new DocumentationAgent(),
    new DeploymentAgent(),
    new VersionControlAgent(),
    new DependencyAgent(),
    new DebuggingAgent(),
  ];
}

@Module({})
export class CodingClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 8 coding cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createCodingAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
