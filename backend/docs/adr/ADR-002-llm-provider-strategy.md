# ADR-002: LLM Provider Strategy

## Status

Accepted

## Context

AENEWS Agent OS X agents require LLM intelligence to perform tasks like code analysis, metric interpretation, refactoring proposals, and certification decisions. The system must support multiple LLM providers because:

1. **Availability**: A single provider may experience outages or rate limits.
2. **Cost optimization**: Different providers have different pricing models; some tasks may be better suited to cheaper/faster models.
3. **Quality**: Different providers excel at different tasks (e.g., code generation vs. natural language reasoning).
4. **Vendor independence**: Locking into a single provider creates strategic risk.

The system currently has two LLM providers configured:
- **OpenAI** (GPT-4 / GPT-3.5) — general-purpose, strong code generation
- **Anthropic** (Claude) — strong reasoning and analysis

## Decision

We implement a **dual-provider strategy with fallback and graceful degradation**:

### Architecture

```
Agent (executeWithLLM)
  → LLMService
    → Provider Selection (priority-based)
      → Primary: OpenAI (if API key available)
      → Fallback: Anthropic (if API key available)
      → Last resort: Simulation mode (no API keys)
```

### Provider Selection Logic

1. **Primary provider**: OpenAI is preferred for code generation and patch creation tasks.
2. **Fallback provider**: Anthropic is used when OpenAI is unavailable (rate limit, outage, no API key).
3. **Graceful degradation**: If no LLM provider is available, agents return heuristic/simulation-based results. This is not an error — it's a designed fallback mode.

### Implementation Details

- `LLMService.isAnyAvailable()` — checks if at least one provider has valid API credentials.
- `LLMService.chatWithSystem()` — sends a chat completion request using the primary provider, falling back to the secondary on failure.
- Each provider implements `LLMProviderInterface` with `chat()`, `isAvailable()`, and `getModel()` methods.
- Provider selection respects `responseFormat` hints (JSON mode support varies by provider).
- Token usage is tracked and emitted via `AgentEventType.TOOL_EXECUTED` for observability.

### Configuration

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# LLM Configuration
LLM_DEFAULT_PROVIDER=openai
LLM_FALLBACK_PROVIDER=anthropic
LLM_TIMEOUT_MS=25000
```

## Consequences

### Positive

- **Works without API keys**: The system boots and runs in simulation mode, making development and testing easy.
- **Real LLM when configured**: Adding API keys immediately upgrades agent intelligence without code changes.
- **Automatic failover**: If OpenAI goes down, Anthropic takes over transparently.
- **Cost control**: Can route different tasks to different providers based on cost/quality tradeoffs.

### Negative

- **Non-deterministic results**: The same agent may produce different results depending on which provider is active, making testing harder.
- **Simulation gap**: Heuristic fallback results are significantly less sophisticated than LLM-powered results.
- **Configuration complexity**: Two sets of API keys and provider-specific settings must be managed.

### Mitigation

- Integration tests should verify both LLM and simulation paths.
- Agent results include a `generatedBy` field ('llm' | 'fallback' | 'heuristic') for observability.
- Provider selection can be overridden per-agent or per-action for fine-grained control.
