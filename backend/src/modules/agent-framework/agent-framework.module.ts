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
 * Phase 8 — Intelligent Orchestration additions:
 *   - UnifiedConnectorRegistryService: Merges Bridge + Capability connectors
 *   - AgentCollaborationService: Multi-agent collaboration patterns
 *   - MissionDecompositionService: AI-powered mission decomposition
 *   - CrossClusterCoordinatorService: Cross-cluster agent coordination
 *   - ConnectorAwareExecutionService: Connector-first execution with LLM fallback
 *
 * Phase 9 — Adaptive Intelligence & Knowledge System additions:
 *   - KnowledgeGraphService: Neo4j-powered knowledge graph for agents, missions, patterns
 *   - AgentLearningEngine: Reinforcement-inspired learning from execution outcomes
 *   - PatternMiningService: Historical pattern mining and prediction
 *   - AdaptiveStrategyService: Self-tuning orchestration parameters
 *   - ExperienceReplayService: Mission experience storage and replay analysis
 *   - FeedbackAggregationService: Multi-source feedback collection and analysis
 *   - IntelligenceController: REST API for all Phase 9 services
 *
 * Phase 10 — Advanced Swarm Intelligence & Production Hardening:
 *   - SwarmIntelligenceService: True swarm with stigmergy, dynamic spawning, emergent behavior
 *   - AdvancedConsensusProtocol: Weighted voting, BFT, multi-round deliberation
 *   - CollaborationPersistenceService: DB-backed state, crash recovery
 *   - SharedWorkingMemoryService: Multi-agent collaboration context store
 *   - AdaptiveFeedbackLoopService: PID-inspired feedback from Phase 9 to Phase 8
 *   - DynamicAgentTopologyService: Runtime agent topology reconfiguration
 *   - AdvancedDAGOrchestratorService: Conditional DAG with branching, retry, re-planning
 *   - SwarmController: REST API for all Phase 10 services
 *
 * Core services:
 *   - AgentMemoryService: Unified memory facade (Redis + Qdrant)
 *   - AgentEventBusService: Enhanced event bus for agent-specific patterns
 *   - AgentOrchestratorService: Decompose→Plan→Execute→Critique→Repair→Validate→Deliver
 *   - AgentCommunicationService: Inter-agent messaging
 *   - AgentHealthService: Agent health monitoring and metrics
 *   - AgentBridgeService: Bridge to Software Factory connectors
 *   - CircuitBreakerService: Circuit breaker for fault tolerance
 *   - RateLimiterService: Fine-grained rate limiting
 *   - RateLimitGuard: NestJS guard for rate limiting
 *   - HumanApprovalGuard: Self-evolution safety — blocks unapproved changes
 *   - SandboxService: Safe execution environment for self-evolution agents
 */

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentMemoryService } from './services/agent-memory.service';
import { AgentEventBusService } from './services/agent-event-bus.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { AgentCommunicationService } from './services/agent-communication.service';
import { AgentHealthService } from './services/agent-health.service';
import { AgentBridgeService } from './services/agent-bridge.service';
import { SandboxService } from './services/sandbox.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { HumanApprovalGuard } from './guards/human-approval.guard';
import { AgentModule } from '../agent/agent.module';
import { QdrantModule } from '../qdrant/qdrant.module';
import { CollaborationState } from './entities/collaboration-state.entity';

// Phase 8 — Intelligent Orchestration
import { UnifiedConnectorRegistryService } from './services/unified-connector-registry.service';
import { AgentCollaborationService } from './services/agent-collaboration.service';
import { MissionDecompositionService } from './services/mission-decomposition.service';
import { CrossClusterCoordinatorService } from './services/cross-cluster-coordinator.service';
import { ConnectorAwareExecutionService } from './services/connector-aware-execution.service';
import { OrchestrationController } from './controllers/orchestration.controller';

// Phase 9 — Adaptive Intelligence & Knowledge System
import { KnowledgeGraphService } from './services/knowledge-graph.service';
import { AgentLearningEngine } from './services/agent-learning-engine.service';
import { PatternMiningService } from './services/pattern-mining.service';
import { AdaptiveStrategyService } from './services/adaptive-strategy.service';
import { ExperienceReplayService } from './services/experience-replay.service';
import { FeedbackAggregationService } from './services/feedback-aggregation.service';
import { IntelligenceController } from './controllers/intelligence.controller';

// Phase 10 — Advanced Swarm Intelligence & Production Hardening
import { SwarmIntelligenceService } from './services/swarm-intelligence.service';
import { AdvancedConsensusProtocol } from './services/advanced-consensus-protocol.service';
import { CollaborationPersistenceService } from './services/collaboration-persistence.service';
import { SharedWorkingMemoryService } from './services/shared-working-memory.service';
import { AdaptiveFeedbackLoopService } from './services/adaptive-feedback-loop.service';
import { DynamicAgentTopologyService } from './services/dynamic-agent-topology.service';
import { AdvancedDAGOrchestratorService } from './services/advanced-dag-orchestrator.service';
import { DeepResearchService } from './services/deep-research.service';
import { MemoryService } from './services/memory.service';
import { SwarmController } from './controllers/swarm.controller';

@Global()
@Module({
  imports: [
    // AgentModule provides AgentRegistryService (needed by Orchestrator)
    AgentModule,
    // QdrantModule provides QdrantService (used optionally by Memory)
    QdrantModule,
    // TypeORM entity for CollaborationPersistenceService
    TypeOrmModule.forFeature([CollaborationState]),
  ],
  controllers: [
    OrchestrationController,
    IntelligenceController,
    SwarmController,
  ],
  providers: [
    // ── Core Framework Services ──────────────────────────────────
    AgentMemoryService,
    AgentEventBusService,
    AgentOrchestratorService,
    AgentCommunicationService,
    AgentHealthService,
    AgentBridgeService,
    // ── Circuit Breaker & Rate Limiting ──────────────────────────
    CircuitBreakerService,
    RateLimiterService,
    RateLimitGuard,
    // ── Self-Evolution Safety ────────────────────────────────────
    HumanApprovalGuard,
    SandboxService,
    // ── Phase 8 — Intelligent Orchestration ──────────────────────
    UnifiedConnectorRegistryService,
    AgentCollaborationService,
    MissionDecompositionService,
    CrossClusterCoordinatorService,
    ConnectorAwareExecutionService,
    // ── Phase 9 — Adaptive Intelligence & Knowledge System ───────
    KnowledgeGraphService,
    AgentLearningEngine,
    PatternMiningService,
    AdaptiveStrategyService,
    ExperienceReplayService,
    FeedbackAggregationService,
    // ── Phase 10 — Advanced Swarm Intelligence & Production Hardening
    SwarmIntelligenceService,
    AdvancedConsensusProtocol,
    CollaborationPersistenceService,
    SharedWorkingMemoryService,
    AdaptiveFeedbackLoopService,
    DynamicAgentTopologyService,
    AdvancedDAGOrchestratorService,
    // ── Deep Research ──────────────────────────────────────────────
    DeepResearchService,
    // ── Memory Service ──────────────────────────────────────────────
    MemoryService,
  ],
  exports: [
    // ── Core Framework Services ──────────────────────────────────
    AgentMemoryService,
    AgentEventBusService,
    AgentOrchestratorService,
    AgentCommunicationService,
    AgentHealthService,
    AgentBridgeService,
    // ── Circuit Breaker & Rate Limiting ──────────────────────────
    CircuitBreakerService,
    RateLimiterService,
    RateLimitGuard,
    // ── Self-Evolution Safety ────────────────────────────────────
    HumanApprovalGuard,
    SandboxService,
    // ── Phase 8 — Intelligent Orchestration ──────────────────────
    UnifiedConnectorRegistryService,
    AgentCollaborationService,
    MissionDecompositionService,
    CrossClusterCoordinatorService,
    ConnectorAwareExecutionService,
    // ── Phase 9 — Adaptive Intelligence & Knowledge System ───────
    KnowledgeGraphService,
    AgentLearningEngine,
    PatternMiningService,
    AdaptiveStrategyService,
    ExperienceReplayService,
    FeedbackAggregationService,
    // ── Phase 10 — Advanced Swarm Intelligence & Production Hardening
    SwarmIntelligenceService,
    AdvancedConsensusProtocol,
    CollaborationPersistenceService,
    SharedWorkingMemoryService,
    AdaptiveFeedbackLoopService,
    DynamicAgentTopologyService,
    AdvancedDAGOrchestratorService,
    DeepResearchService,
    MemoryService,
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
