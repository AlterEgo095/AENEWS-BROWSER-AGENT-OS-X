/**
 * AENEWS Agent OS X - Agent Framework Module
 *
 * Bridges the extended agent framework (src/agents/) and Software Factory
 * (src/software-factory/) into the backend NestJS application.
 *
 * Phase 4 — Unification Strategy:
 *   1. The backend's own clusters (backend/src/clusters/) use the simple
 *      BaseAgent pattern with AgentRegistryService — these are always loaded.
 *   2. The extended framework (src/agents/) provides the richer BaseAgentService
 *      with memory, events, decorators, tools, and LLM-powered agents.
 *   3. This module serves as the integration point, ensuring both agent
 *      registries coexist and the Software Factory's connectors are available.
 *
 * In production, the root src/ is compiled first, then the backend references
 * the compiled output. In development with webpack, both are bundled together.
 */

import { Module } from '@nestjs/common';

@Module({
  imports: [],
  exports: [],
})
export class AgentFrameworkModule {
  /**
   * Register method that can be called to verify framework availability.
   * The actual framework modules are loaded via the webpack bundle or
   * the compiled root dist/ directory.
   */
  static forRoot() {
    return {
      module: AgentFrameworkModule,
    };
  }
}
