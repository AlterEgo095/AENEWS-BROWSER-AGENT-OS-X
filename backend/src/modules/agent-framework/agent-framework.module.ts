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
 * Services provided:
 *   - AgentMemoryService: Unified memory facade (Redis + Qdrant)
 *   - AgentEventBusService: Enhanced event bus for agent-specific patterns
 *   - AgentOrchestratorService: Decompose→Plan→Execute→Critique→Repair→Validate→Deliver
 *   - AgentCommunicationService: Inter-agent messaging
 *   - AgentHealthService: Agent health monitoring and metrics
 *   - AgentBridgeService: Bridge to Software Factory connectors
 */

import { Global, Module } from '@nestjs/common';
import { AgentMemoryService } from './services/agent-memory.service';
import { AgentEventBusService } from './services/agent-event-bus.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { AgentCommunicationService } from './services/agent-communication.service';
import { AgentHealthService } from './services/agent-health.service';
import { AgentBridgeService } from './services/agent-bridge.service';
import { AgentModule } from '../agent/agent.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Global()
@Module({
  imports: [
    // AgentModule provides AgentRegistryService (needed by Orchestrator)
    AgentModule,
    // QdrantModule provides QdrantService (used optionally by Memory)
    QdrantModule,
  ],
  providers: [
    AgentMemoryService,
    AgentEventBusService,
    AgentOrchestratorService,
    AgentCommunicationService,
    AgentHealthService,
    AgentBridgeService,
  ],
  exports: [
    AgentMemoryService,
    AgentEventBusService,
    AgentOrchestratorService,
    AgentCommunicationService,
    AgentHealthService,
    AgentBridgeService,
  ],
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
