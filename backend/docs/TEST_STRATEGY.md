# AENEWS Agent OS X — Test Strategy

## Overview

This document defines the testing strategy for the AENEWS Agent OS X project. The strategy covers unit testing, integration testing, and end-to-end testing across all agent clusters, framework services, and infrastructure integrations.

## Testing Levels

### 1. Unit Testing

**Scope**: Individual services, agents, and utilities tested in isolation.

**Approach**:
- Mock all external dependencies (LLM, Bridge, databases, message queues).
- Test each public method with positive, negative, and edge cases.
- Verify return types, error handling, and side effects.

**Tools**:
- Jest (default NestJS test runner)
- `@nestjs/testing` for module/provider mocking
- Custom mock factories for `LLMService`, `AgentBridgeService`, `SandboxService`

**Example structure**:
```
src/modules/agent-framework/services/
  sandbox.service.ts
  sandbox.service.spec.ts
```

**Mocking patterns**:
```typescript
// Mock LLMService
const mockLLMService = {
  isAnyAvailable: jest.fn().ReturnValue(true),
  chatWithSystem: jest.fn().ResolvedValue({ content: '{"key": "value"}', usage: { totalTokens: 100 }, model: 'gpt-4' }),
};

// Mock SandboxService
const mockSandboxService = {
  executeInSandbox: jest.fn().ResolvedValue({ success: true, durationMs: 50, timedOut: false }),
  proposeChange: jest.fn().ReturnValue({ id: 'change-1', status: 'PROPOSED' }),
  executeDryRun: jest.fn().ResolvedValue({ success: true, durationMs: 100, timedOut: false }),
  validateChange: jest.fn().ResolvedValue({ valid: true, checks: [], recommendation: 'apply' }),
};
```

### 2. Integration Testing

**Scope**: Module-level tests with real NestJS container but mocked infrastructure.

**Approach**:
- Use `Test.createTestingModule()` to build a partial NestJS container.
- Register real services but mock infrastructure providers (Redis, PostgreSQL, RabbitMQ).
- Verify service interactions, dependency injection, and module initialization.

**Example**:
```typescript
describe('AgentFrameworkModule Integration', () => {
  let module: TestingModule;
  let sandboxService: SandboxService;
  let approvalGuard: HumanApprovalGuard;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AgentFrameworkModule],
    })
      .overrideProvider(LLMService)
      .useValue(mockLLMService)
      .compile();

    sandboxService = module.get<SandboxService>(SandboxService);
    approvalGuard = module.get<HumanApprovalGuard>(HumanApprovalGuard);
  });
});
```

### 3. E2E Testing

**Scope**: Full pipeline tests with real infrastructure.

**Approach**:
- Start the full NestJS application with test configuration.
- Use real PostgreSQL, Redis, and RabbitMQ (test containers or Docker Compose).
- Execute missions and verify end-to-end agent dispatch, execution, and result delivery.

**Critical E2E scenarios**:
- Mission execution: Create mission → dispatch → agent execution → result
- Self-evolution loop: Metric analysis → weakness detection → refactor proposal → patch generation → certification
- Approval flow: Propose change → block without approval → allow with approval → verify audit log

---

## Critical Path Tests (MUST Have 100% Coverage)

These are the components where correctness is non-negotiable. They must have 100% branch coverage.

### 1. AgentOrchestrator 7-Step Pipeline

The orchestrator executes a 7-step pipeline: Decompose → Plan → Execute → Critique → Repair → Validate → Deliver.

**Test cases**:
- Happy path: All 7 steps succeed
- Plan failure: Plan step returns no viable strategy
- Execution failure: Agent execution fails, triggers repair
- Critique rejection: Critique step identifies issues, triggers repair
- Repair success: Repair step fixes issues, validation passes
- Repair failure: Repair step cannot fix, pipeline fails gracefully
- Validation failure: Final validation rejects result
- Timeout: Pipeline exceeds time limit

### 2. AgentRegistry.findBestAgent()

The registry's agent selection algorithm must correctly identify the best agent for a given task.

**Test cases**:
- Exact match: Agent with matching capability found
- Multiple matches: Best agent selected by priority/score
- No match: Returns null/undefined gracefully
- Fuzzy match: Partial capability match with scoring
- Cluster filtering: Only agents from specified cluster
- Availability check: Only agents in IDLE status

### 3. LLMService Provider Selection + Fallback

LLM provider selection must correctly fall back between providers.

**Test cases**:
- Primary available: OpenAI selected as primary
- Primary down, fallback available: Anthropic selected
- Both available: Primary (OpenAI) selected
- Neither available: `isAnyAvailable()` returns false, simulation mode
- Primary rate limited: Fallback to Anthropic
- Provider-specific features: JSON mode support varies
- Timeout: LLM call exceeds timeout, graceful fallback

### 4. HumanApprovalGuard

The approval guard must correctly gate self-evolution actions.

**Test cases**:
- Decorated handler without approval: BLOCKED
- Decorated handler with approval header: ALLOWED
- Decorated handler with body approval: ALLOWED
- Non-decorated handler: ALLOWED (no approval needed)
- Exempt action (analyze-metrics): ALLOWED without approval
- Required action (generate-patch) without decorator: BLOCKED
- Guard disabled: Action ALLOWED with WARNING logged
- Audit trail: Every evaluation recorded
- Programmatic check: `checkApproval()` works for non-HTTP execution
- Severity levels: low/medium/high correctly reflected in audit

### 5. SandboxService

The sandbox must safely execute code and validate changes.

**Test cases**:
- **executeInSandbox()**:
  - Valid code executes successfully
  - Invalid code returns error result
  - Timeout returns timedOut: true
  - Restricted globals (require, process) are blocked
  - Context variables are available in sandbox

- **proposeChange()**:
  - Change created with correct status (PROPOSED)
  - Before-state snapshot captured for rollback
  - Change ID is unique
  - Tags and metadata preserved

- **executeDryRun()**:
  - Dry-run passes for valid change
  - Dry-run fails for invalid change
  - Cannot dry-run a change in wrong status
  - Status transitions: PROPOSED → DRY_RUN → DRY_RUN_PASSED/FAILED

- **validateChange()**:
  - All validation checks run for each change type
  - Critical failures result in rejection
  - Non-critical warnings result in approval
  - Validation requires DRY_RUN_PASSED status

- **approveChange()**:
  - Approval requires PENDING_APPROVAL status
  - Approval guard check integrated
  - Status transitions: PENDING_APPROVAL → APPROVED

- **applyChange()**:
  - Application requires APPROVED status
  - Failure triggers automatic rollback
  - Status transitions: APPROVED → APPLIED

- **rollback()**:
  - Rollback restores before-state
  - Only APPLIED or FAILED changes can be rolled back
  - Unknown change ID handled gracefully
  - Status transitions: APPLIED → ROLLED_BACK

- **runPipeline()**:
  - Full pipeline: propose → dry-run → validate → approve → apply
  - Pipeline stops at first failure
  - Auto-approve option works correctly

---

## Agent Test Tiers

### Tier 1 — Must Test (Production-Critical)

| Agent/Service | Key Test Areas |
|---|---|
| MetricAnalyzerAgent | LLM integration, fallback, event emission |
| PatchGeneratorAgent | Sandbox integration, approval gating, patch validation |
| RefactorProposerAgent | Sandbox integration, dry-run, plan generation |
| AutoCertifierAgent | EQI verification, approval flow, sandbox logging |
| AgentOrchestratorService | 7-step pipeline, error recovery |
| AgentRegistryService | Agent discovery, capability matching |
| LLMService | Provider selection, fallback, timeout |
| HumanApprovalGuard | Approval gating, audit trail, disabled mode |
| SandboxService | Full change pipeline, validation, rollback |

**Coverage target**: 100% for critical paths, ≥90% overall.

### Tier 2 — Should Test (High-Value)

| Agent/Service | Key Test Areas |
|---|---|
| Browser cluster agents | Bridge integration, action execution |
| Coding cluster agents | LLM + Bridge integration, code generation |
| Security cluster agents | LLM-powered threat analysis |
| Certification auditors | Audit execution, scoring, report generation |
| AgentBridgeService | Connector dispatch, error handling |
| AgentEventBusService | Event emission, subscriber notification |
| AgentCommunicationService | Inter-agent messaging |

**Coverage target**: ≥80% overall.

### Tier 3 — Nice to Have (Structural)

| Agent/Service | Key Test Areas |
|---|---|
| Business cluster agents | Simulation output structure |
| Office cluster agents | Simulation output structure |
| Marketing cluster agents | Simulation output structure |
| Infrastructure cluster agents | Simulation output structure |
| Meta-intelligence cluster agents | Simulation output structure |

**Coverage target**: ≥60% overall (contract testing only).

---

## Test Configuration

### Environment

```bash
# Test environment variables
NODE_ENV=test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aenews_test
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://localhost:5672

# LLM (optional — tests should work without)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Running Tests

```bash
# Unit tests
bun run test

# Unit tests with coverage
bun run test:cov

# Integration tests
bun run test -- --config jest-integration.config.js

# E2E tests
bun run test:e2e

# Specific test file
bun run test -- sandbox.service.spec.ts

# Watch mode
bun run test -- --watch
```

### CI/CD Integration

- Unit tests run on every PR (required to pass).
- Integration tests run on merge to main.
- E2E tests run nightly and before releases.
- Coverage reports uploaded to SonarQube/Codacy.
- Critical path coverage enforced as a merge check.

---

## Test Data Management

### Fixtures

- Agent configurations for each cluster
- Sample LLM responses (JSON and text)
- Sample system changes (code, config, prompt, infra, agent)
- Sample execution contexts and results

### Factory Functions

```typescript
// Test factory for AgentContext
function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    agentId: 'test-agent-001',
    tenantId: 'test-tenant-001',
    config: { action: 'test-action' },
    ...overrides,
  };
}

// Test factory for SystemChange
function createTestChange(overrides?: Partial<SystemChange>): SystemChange {
  return {
    id: `change-test-${Date.now()}`,
    type: SystemChangeType.CODE_MODIFICATION,
    description: 'Test change',
    proposedBy: 'TestAgent',
    proposedAt: new Date().toISOString(),
    status: ChangeStatus.PROPOSED,
    severity: 'medium',
    beforeState: { version: 1 },
    afterState: { version: 2 },
    ...overrides,
  };
}
```

---

## Summary

| Level | Scope | Target Coverage | Frequency |
|---|---|---|---|
| Unit | Individual services/agents | 100% (critical), 90%+ overall | Every PR |
| Integration | Module interactions | 80%+ | Every merge |
| E2E | Full pipelines | Key scenarios covered | Nightly + Release |

The testing strategy prioritizes **correctness of critical paths** (orchestrator, registry, LLM fallback, approval guard, sandbox) while maintaining reasonable coverage across all agent tiers through progressive enhancement.
