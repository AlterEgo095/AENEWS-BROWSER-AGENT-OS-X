# ADR-009: Advanced Swarm Intelligence & Production Hardening

## Status: Accepted

## Date: 2026-06-14

## Context

After Phase 8 (Intelligent Orchestration) and Phase 9 (Adaptive Intelligence), the system can collaborate across clusters with 6 patterns and learn from outcomes. However, several critical gaps remain for production readiness:

1. **Swarm intelligence is shallow** — The current swarm pattern in AgentCollaborationService is a simple collective exploration. True swarm intelligence requires stigmergy (indirect coordination through environment), dynamic agent spawning, emergent behavior detection, and swarm size optimization.

2. **Consensus lacks robustness** — Voting is unweighted, has no Byzantine fault tolerance, and cannot handle multi-round deliberation or dissent tracking.

3. **Collaboration state is ephemeral** — All collaboration plans live in-memory (Map). A restart loses all active collaborations with no recovery path.

4. **No shared working memory** — Agents have individual memory but no shared context store for multi-agent collaboration sessions.

5. **Learning-to-orchestration gap** — Phase 9's learning engine and pattern mining are not integrated into Phase 8's orchestration decisions.

6. **Static agent topology** — Agent relationships and cluster membership are fixed at startup. No runtime reconfiguration.

7. **No conditional DAG orchestration** — Cross-cluster coordination uses wave-based execution but cannot branch, retry, or dynamically re-plan based on intermediate results.

## Decision

Implement a 7-service Advanced Swarm Intelligence & Production Hardening layer (Phase 10):

### 1. SwarmIntelligenceService

- **Purpose**: True swarm intelligence with stigmergy, dynamic spawning, and emergent behavior detection
- **Stigmergy Model**: Agents leave digital "pheromones" in a shared environment (Redis-backed). Pheromones have type (exploration, success, failure, warning), strength (decays over time), and spatial coordinates (capability space). Other agents sense pheromones to guide their behavior.
- **Dynamic Spawning**: Based on workload and pheromone density, the swarm can request new agent instances from clusters. Spawning is bounded by maxSwarmSize and requires capacity checks with AgentHealthService.
- **Emergent Behavior Detection**: Monitors swarm metrics (convergence, divergence, oscillation, stagnation) and detects emergent behaviors. Triggers alerts and adaptive responses.
- **Swarm Size Optimization**: Uses gradient-descent-inspired optimization to find the ideal number of agents. Starts with initialSize, adjusts based on throughput and coordination overhead.

### 2. AdvancedConsensusProtocol

- **Purpose**: Robust multi-agent consensus with weighted voting, BFT, and multi-round deliberation
- **Weighted Voting**: Agent votes are weighted by expertise score (from KnowledgeGraphService), reliability history, and cluster relevance. Weights are normalized to prevent dominance.
- **Byzantine Fault Tolerance**: Implements practical BFT with 3f+1 agents tolerating f faulty agents. Includes vote verification, signature-like commitment, and outlier detection.
- **Multi-Round Deliberation**: Agents can challenge, support, or propose alternatives across rounds. Convergence is tracked per round. Max 5 rounds with early termination on supermajority (>66%).
- **Dissent Tracking**: Dissenting opinions are preserved with rationale, enabling audit trails and potential pattern discovery.

### 3. CollaborationPersistenceService

- **Purpose**: Database-backed collaboration state with crash recovery
- **Storage**: Redis for active collaborations (fast access), PostgreSQL for historical collaboration records
- **Recovery**: On startup, scans Redis for active collaborations and re-attaches event handlers. Crashed collaborations are marked for manual review.
- **Checkpoints**: Collaboration state is checkpointed every 30 seconds and after each phase transition.
- **Query API**: Historical collaboration search, statistics, and pattern analysis.

### 4. SharedWorkingMemoryService

- **Purpose**: Shared context store for multi-agent collaboration sessions
- **Architecture**: Redis-backed with namespaced keys per collaboration session. Each session has a shared workspace, agent-specific scratchpads, and a blackboard for results.
- **Conflict Resolution**: Last-writer-wins with version vectors for concurrent writes. Optional merge function for structured data.
- **Scoping**: Data can be session-scoped (auto-deleted on collaboration end), mission-scoped (persists across collaborations), or persistent (never auto-deleted).
- **Access Patterns**: Agents read/write through namespaced keys. Subscription model for real-time updates.

### 5. AdaptiveFeedbackLoopService

- **Purpose**: Bridge Phase 9 learning into Phase 8 orchestration decisions
- **Feedback Sources**: AgentLearningEngine (Q-values), PatternMiningService (patterns), FeedbackAggregationService (user feedback), ExperienceReplayService (similar missions)
- **Orchestration Impact**: Adjusts collaboration pattern selection, agent selection weights, decomposition strategy, and timeout values based on accumulated feedback.
- **Control Theory**: Uses PID-inspired controller to adjust parameters — proportional (current error), integral (accumulated error), derivative (error trend). All adjustments are bounded and have cooldown periods.
- **Safety**: Changes are logged, reversible, and gradual (max 10% per adjustment cycle). Critical parameters require human approval.

### 6. DynamicAgentTopologyService

- **Purpose**: Runtime reconfiguration of agent relationships and cluster membership
- **Topology Types**: Star (hub-spoke), Mesh (fully connected), Ring (circular), Tree (hierarchical), Custom (user-defined graph)
- **Operations**: Add/remove agents, rewire connections, change topology type, isolate/restore agents
- **Triggers**: Manual (admin API), adaptive (feedback from AdaptiveFeedbackLoopService), emergency (circuit breaker triggers isolation)
- **Persistence**: Topology state is persisted in Redis with PostgreSQL backup.

### 7. AdvancedDAGOrchestratorService

- **Purpose**: Conditional DAG execution with branching, retry, and dynamic re-planning
- **DAG Features**: Conditional edges (if/else branching), retry edges (with backoff), fallback edges (alternative path on failure), parallel fan-out/fan-in
- **Dynamic Re-planning**: When a node fails or returns unexpected results, the orchestrator can invoke MissionDecompositionService to re-plan the remaining DAG.
- **Resource Management**: Tracks resource usage per node and prevents over-allocation. Supports priority-based scheduling.
- **Observability**: Full execution trace with timing, data flow, and decision rationale.

### Controller: SwarmController

- **Base Path**: `/api/v1/swarm`
- **Endpoints**: 14 REST endpoints covering all Phase 10 services

## Consequences

### Positive

- **True swarm intelligence** enables emergent problem-solving beyond scripted patterns
- **Production-ready collaboration** with persistence and recovery
- **Self-improving orchestration** that learns from every mission
- **Flexible agent topology** adapts to workload and conditions
- **Robust consensus** handles adversarial and unreliable agents
- **Conditional DAG** enables complex, adaptive workflows

### Negative

- **Increased Redis dependency** for pheromone trails and working memory
- **Higher computational overhead** for BFT consensus and emergent behavior detection
- **Complexity** — 7 new services with intricate interactions
- **Testing burden** — swarm and consensus behavior is harder to unit test

### Mitigations

- All new services gracefully degrade when dependencies are unavailable
- BFT consensus falls back to simple majority when agent count < 3f+1
- Swarm size is bounded and pheromone decay prevents unbounded growth
- Phase 10 E2E tests cover all critical paths
