# ADR-004: Self-Evolution Safety Model

## Status

Accepted

## Context

The Self-Evolution Cluster can modify system behavior autonomously:

- **PatchGeneratorAgent** generates code patches that alter source files.
- **RefactorProposerAgent** proposes refactoring strategies that, when executed, change system architecture.
- **AutoCertifierAgent** approves or rejects merge requests, effectively controlling what changes reach production.

Without guardrails, a misconfigured or compromised self-evolution agent could:

1. Introduce bugs or security vulnerabilities through generated patches.
2. Approve its own changes without human oversight.
3. Create a feedback loop where declining quality is not detected.
4. Make irreversible changes that are difficult to debug.

The system needs a safety model that:
- Prevents unauthorized persistent changes.
- Provides auditability for all proposed/applied changes.
- Enables rollback when changes cause issues.
- Works even when safety mechanisms are disabled (log warnings).

## Decision

We implement a **three-layer safety model**: decorator-based approval gating, sandbox execution, and full audit trail.

### Layer 1: Human Approval Guard (`HumanApprovalGuard`)

A NestJS guard that prevents self-evolution actions from proceeding without explicit human approval.

**Mechanism:**
- The `@RequiresHumanApproval()` decorator marks agent classes or methods as requiring approval.
- The guard checks for approval signals in HTTP requests (`x-human-approval: true` header or `approved: true` in body).
- For programmatic (non-HTTP) execution, `HumanApprovalGuard.checkApproval()` provides a programmatic API.
- **Actions requiring approval**: code modification, config changes, prompt changes, infrastructure changes, agent deployment.
- **Actions NOT requiring approval**: read-only analysis, metric collection, report generation.

**Graceful degradation:**
- When the guard is disabled (`setEnabled(false)`), it still logs warnings for every action that would have been blocked.
- Safety mechanisms work even when the guard is not actively enforcing.

```typescript
@RequiresHumanApproval({ reason: 'Generates code patches', severity: 'high' })
export class PatchGeneratorAgent extends BaseAgent { ... }
```

### Layer 2: Sandbox Service (`SandboxService`)

A service that provides safe execution environments and validates proposed changes before they are applied.

**Change Pipeline:**

```
1. Propose  → proposeChange()     → Status: PROPOSED
2. Dry-Run  → executeDryRun()     → Status: DRY_RUN_PASSED / DRY_RUN_FAILED
3. Validate → validateChange()    → Status: PENDING_APPROVAL / REJECTED
4. Approve  → approveChange()     → Status: APPROVED
5. Apply    → applyChange()       → Status: APPLIED
6. Rollback → rollback()          → Status: ROLLED_BACK
```

**SystemChange types:**
- `CODE_MODIFICATION` — changes to source code files
- `CONFIG_CHANGE` — changes to configuration files or feature flags
- `PROMPT_CHANGE` — changes to LLM system prompts
- `INFRA_CHANGE` — changes to infrastructure (deployments, scaling)
- `AGENT_DEPLOYMENT` — deployment of new or updated agents

**Validation checks** (type-specific):
- Universal: before/after differ, after-state structure
- Code: file paths present, syntax valid, change size
- Config: structure valid, sensitive data detection
- Prompt: non-empty, length limits
- Infrastructure: severity check, rollback plan
- Agent deployment: identity info, health check config

### Layer 3: Audit Trail

All actions are logged with:

- **Who** proposed the change (agent name)
- **What** the change is (before/after state)
- **When** it was proposed, validated, approved, applied
- **Why** it was approved or rejected
- **Outcome** — applied, rolled back, or failed

The `HumanApprovalGuard` maintains an in-memory audit log of all approval evaluations (allowed or blocked). The `SandboxService` maintains a `Map<SystemChange>` with full lifecycle tracking.

### Agent Integration

Self-evolution agents are updated with:

1. `@RequiresHumanApproval()` decorator on the class level.
2. `setSandboxService()` injection for sandbox access.
3. Sandbox integration in `execute()` for validation before action.

| Agent | Decorator | Sandbox Integration |
|---|---|---|
| PatchGeneratorAgent | `@RequiresHumanApproval({ severity: 'high' })` | Validate patches, propose changes, dry-run application |
| RefactorProposerAgent | `@RequiresHumanApproval({ severity: 'high' })` | Dry-run refactoring, validate plans |
| AutoCertifierAgent | `@RequiresHumanApproval({ severity: 'high' })` | Test certification changes, validate merge approvals |

## Consequences

### Positive

- **No unauthorized changes**: Persistent changes cannot be made without human approval.
- **Safe testing**: Patches and refactoring are validated in sandbox before being proposed.
- **Full auditability**: Every action is logged with before/after state for forensic analysis.
- **Rollback capability**: Changes that cause issues can be rolled back to the before-state.
- **Works when disabled**: Log warnings ensure visibility even if the guard is turned off.

### Negative

- **Slower iteration**: Human-in-the-loop approval adds latency to the self-evolution cycle.
- **Operational overhead**: A human must be available to approve changes during the self-evolution loop.
- **False sense of security**: The sandbox simulation may not catch all real-world issues (it runs in a simplified environment).
- **Audit log growth**: In-memory audit logs must be managed to prevent unbounded growth.

### Mitigation

- For development/testing, the guard can be disabled (with warnings logged).
- Approval can be automated for low-severity changes by setting `severity: 'low'` and auto-approving via the `SandboxService.runPipeline()` convenience method.
- Production deployments should always have the guard enabled.
- Audit logs are bounded at 10,000 entries with automatic trimming.
