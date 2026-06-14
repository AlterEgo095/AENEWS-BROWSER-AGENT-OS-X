# ADR-007: Intelligent Orchestration Architecture

## Status

Accepted

## Date

2026-06-14

## Context

After Phase 7 (Real Connectors), the system had real connectors wired to agents via the `AgentBridgeService`, but two critical gaps remained:

1. **Dual Connector Registries**: `AgentBridgeService` (action-based) and `ConnectorRegistryService` (capability-pack-based) operated independently, causing routing inconsistencies — a mission running through the Software Factory could get simulated browser results while an agent going through the Bridge got real Playwright results.

2. **No Multi-Agent Collaboration**: While agents could communicate via `AgentCommunicationService`, there was no higher-level coordination layer for patterns like delegation, parallel execution, consensus, or cross-cluster orchestration. Each agent worked in isolation within its cluster.

3. **Shallow Decomposition**: The `AgentOrchestratorService`'s decomposition step used simple heuristic splitting. Complex missions (e.g., "build a web application and audit it") require intelligent decomposition that understands capability requirements, cluster boundaries, and dependency ordering.

4. **Tier 3 Agent Gap**: Business, Office, Marketing, Infrastructure, and Meta-Intelligence agents had Bridge services injected but didn't actively use them — they returned simulation-style structured data without trying real connectors first.

## Decision

### 1. Unified Connector Registry

Create `UnifiedConnectorRegistryService` that merges both connector systems:

- **Bridge connectors** (from `AgentBridgeService`): Simple action-based interface (`connectorName.action(params)`)
- **Capability connectors** (from `ConnectorRegistryService`): Pack-based interface (`capabilityId → ICapabilityConnector`)
- **Auto-bridging**: When a Bridge connector exists but no Capability connector, an adapter is automatically created
- **Health-aware routing**: Tracks per-connector health metrics, routes away from degraded connectors
- **Circuit breaker integration**: Both connector types are wrapped in circuit breakers

Routing priority: Action-based calls → Bridge, Capability-based calls → Capability → Adapter → Bridge fallback.

### 2. Agent Collaboration Service

Create `AgentCollaborationService` supporting six collaboration patterns:

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Delegation | Agent delegates sub-tasks to specialists | Complex multi-domain tasks |
| Handoff | Sequential transfer between agents | Data processing pipelines |
| Parallel | Concurrent independent execution | Batch operations |
| Pipeline | Structured sequential with data transformation | Build → Test → Deploy |
| Consensus | Multi-agent review and voting | Quality assurance |
| Swarm | Collective exploration with shared findings | Research and analysis |

Safety features:
- Max delegation depth (default: 3) prevents infinite chains
- Timeout protection per collaboration step
- Deadlock detection for circular dependencies
- Circuit breaker for inter-agent communication failures

### 3. Mission Decomposition Engine

Create `MissionDecompositionService` with four decomposition strategies:

| Strategy | When Used | Quality |
|----------|-----------|---------|
| LLM | When LLM is available | Highest — context-aware |
| Template | When mission matches known patterns | High — proven structure |
| Heuristic | Fallback when no LLM/template | Moderate — rule-based |
| Hybrid | Default — combines LLM + heuristics | Highest — validated by both |

Features:
- Dependency graph (DAG) generation
- Capability-aware splitting
- Cross-cluster dependency resolution
- Complexity estimation (simple/moderate/complex)
- Duration and cost estimation
- Quality scoring (0–1) based on sub-task count, DAG structure, parallelizability

Built-in templates: web_application, data_analysis, security_audit, marketing_campaign, browser_automation.

### 4. Cross-Cluster Coordinator

Create `CrossClusterCoordinatorService` for multi-cluster task execution:

- Six coordination patterns: sequential, parallel, fan-out, fan-in, pipeline, scatter-gather
- Wave-based execution: tasks in the same wave run in parallel, waves run sequentially
- Health-aware agent selection within clusters
- Cluster health monitoring
- Per-cluster metrics (success rate, average duration)

### 5. Connector-Aware Execution

Create `ConnectorAwareExecutionService` as a utility for Tier 3 agents:

Execution priority: Real Connector → LLM → Simulation/Fallback

This allows Tier 3 agents to seamlessly upgrade from simulation to real connectors without rewriting their core logic. The agent just calls `connectorExecution.execute()` and gets the best available result.

### 6. Orchestration API

New REST endpoints under `/api/v1/orchestration/`:
- Collaboration: start, status, cancel
- Decomposition: decompose mission
- Coordination: cross-cluster coordination
- Connectors: unified list, health, execute
- Statistics and history

## Consequences

### Positive

1. **Unified connector routing**: No more inconsistency between Bridge and Capability connectors. All routing goes through one registry with health awareness.
2. **Multi-agent collaboration**: Complex missions can now leverage multiple agents across clusters with structured patterns.
3. **Intelligent decomposition**: LLM-powered decomposition produces better sub-task splits with proper dependency ordering.
4. **Tier 3 agents upgraded**: Business/Office/Marketing/Infrastructure/Meta-Intelligence agents now have a path to use real connectors via `ConnectorAwareExecutionService`.
5. **Observable orchestration**: Full API surface for monitoring collaboration, decomposition, and coordination.

### Negative

1. **Increased complexity**: Five new services add to the system's cognitive load. Each service has its own lifecycle and state management.
2. **Memory usage**: Collaboration and coordination services maintain in-memory state maps. Under high concurrency, this could grow. Mitigated by history limits (500/200 entries) and active plan cleanup.
3. **LLM dependency for best decomposition**: Without LLM, decomposition falls back to heuristics which produce less optimal splits. This is acceptable — heuristics are the baseline, LLM is the enhancement.

### Risks

1. **Circular delegation**: If Agent A delegates to Agent B which delegates back to Agent A, it creates an infinite loop. Mitigated by `maxDelegationDepth` (default: 3) in `AgentCollaborationService`.
2. **Deadlocks in coordination**: If Wave 2 tasks depend on Wave 2 tasks, the system stalls. Mitigated by circular dependency detection in `MissionDecompositionService` and fallback task scheduling.
3. **Connector health stale data**: Health cache might not reflect real-time connector state. Mitigated by periodic health checks and failure-rate-based auto-degradation.

## Related

- ADR-005: Agent Implementation Depth Strategy (Tier 1/2/3 definitions)
- ADR-002: LLM Provider Strategy (LLM availability for decomposition)
- ADR-004: Self-Evolution Safety Model (delegation depth as safety mechanism)
