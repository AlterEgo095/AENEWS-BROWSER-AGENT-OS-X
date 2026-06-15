# ADR-005: Agent Implementation Depth Strategy

## Status

Accepted

## Context

The AENEWS Agent OS X project contains 111 agents across 14 clusters. Not all agents have the same level of implementation depth:

- **Real agents**: Fully implemented with LLM integration, Bridge connector access, event emission, and production-quality logic. Examples: `MetricAnalyzerAgent` (LLM-powered analysis), browser/coding agents (Bridge-powered).
- **Simulated agents**: Return hardcoded or randomized data to demonstrate the agent's contract and interface, but do not perform real work. Examples: many certification auditors, business/office cluster agents.
- **Stub agents**: Minimal implementation that only returns a success result with placeholder data.

This variation is intentional — the system was designed for progressive enhancement where agents start as simulations and are upgraded to real implementations as connectors and LLM integrations are built out.

However, without a clear strategy, it's unclear which agents should be prioritized for real implementation and how to ensure the system works correctly at each depth level.

## Decision

We adopt a **tiered depth strategy** with clear criteria for each tier:

### Tier 1: Production-Ready (Must Be Real)

These agents are critical to the system's core functionality and **must** have real LLM and/or Bridge integration:

| Agent | Reason | Required Services |
|---|---|---|
| MetricAnalyzerAgent | Core self-evolution loop | LLM |
| PatchGeneratorAgent | Generates code patches | LLM + Sandbox |
| RefactorProposerAgent | Proposes refactoring | LLM + Sandbox |
| AutoCertifierAgent | Quality gate | LLM + Sandbox |
| AgentOrchestratorService | 7-step pipeline | Registry + Event Bus |
| AgentRegistryService | Agent discovery | — |

**Criteria for Tier 1:**
- Directly affects system behavior (self-evolution agents)
- Used in the critical execution path (orchestrator, registry)
- Human-facing output quality matters (certification results)

### Tier 2: Enhanced (Should Be Real)

These agents provide significant value with LLM/Bridge integration but the system can function without them:

| Agent | Reason | Required Services |
|---|---|---|
| Browser cluster agents | Web automation | Bridge |
| Coding cluster agents | Code generation | LLM + Bridge |
| Security cluster agents | Threat analysis | LLM |
| Certification auditors | Quality assessment | LLM |

**Criteria for Tier 2:**
- Improves output quality significantly with LLM
- Bridge connectors enable real-world actions
- Users expect these agents to work end-to-end

### Tier 3: Simulation (Nice to Have)

These agents provide structural completeness and can remain simulated without impacting system correctness:

| Agent | Reason |
|---|---|
| Business cluster agents | Business process automation (not critical) |
| Office cluster agents | Document management (not critical) |
| Marketing cluster agents | Marketing automation (not critical) |
| Infrastructure cluster agents | Infrastructure management (can be manual) |

**Criteria for Tier 3:**
- Not in the critical execution path
- Users can accomplish the same task manually
- Simulation provides sufficient contract testing

### Progressive Enhancement Pattern

All agents, regardless of tier, follow the same pattern:

```typescript
async execute(context: AgentContext): Promise<AgentResult> {
  // 1. Try real implementation (LLM/Bridge)
  const llmResult = await this.executeWithLLM(systemPrompt, userPrompt);
  if (llmResult) {
    return { success: true, data: parsed, metadata: { source: 'llm' } };
  }

  // 2. Fall back to simulation
  this.logger.log('LLM unavailable — falling back to heuristic analysis');
  return { success: true, data: simulatedData, metadata: { source: 'fallback' } };
}
```

This ensures:
- Agents work without LLM API keys (development/testing).
- Real LLM is used when available (production).
- The `generatedBy` metadata field enables observability.

## Consequences

### Positive

- **Clear prioritization**: Teams know which agents to invest in first.
- **Always functional**: The system works at every depth level — no agent is "broken" when LLM is unavailable.
- **Progressive enhancement**: Agents get better as connectors are built out, without breaking existing functionality.
- **Testable at every level**: Simulation agents can be tested for contract compliance, real agents for output quality.

### Negative

- **Simulation gap**: Tier 3 agents may give users the impression of functionality that doesn't exist.
- **Inconsistent quality**: Results from simulation agents are significantly less useful than LLM-powered results.
- **Maintenance burden**: Each agent has both a simulation path and a real path to maintain.

### Mitigation

- All agent results include `generatedBy` ('llm' | 'fallback' | 'heuristic') for transparency.
- UI/CLI surfaces should indicate when agents are running in simulation mode.
- Tier 2 and Tier 3 agents should be upgraded as LLM provider coverage improves.
- The `AgentHealthService` reports which agents have LLM/Bridge access for monitoring.
