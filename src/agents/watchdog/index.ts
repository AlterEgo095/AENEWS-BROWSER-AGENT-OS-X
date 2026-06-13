/**
 * AENEWS Agent OS X - Watchdog/Self-Healing Cluster Barrel Exports
 * Re-exports all watchdog agent services, types, and the cluster module.
 *
 * Import from here:
 *   import { ErrorAnalyzerAgentService, AutoFixerAgentService, CircuitBreakerManagerAgentService } from './watchdog';
 */

// ─── Agent Services ───────────────────────────────────────────────
export { ErrorAnalyzerAgentService } from './error-analyzer-agent.service';
export { AutoFixerAgentService } from './auto-fixer-agent.service';
export { CircuitBreakerManagerAgentService } from './circuit-breaker-manager-agent.service';

// ─── Cluster Module ───────────────────────────────────────────────
export { WatchdogClusterModule } from './watchdog-cluster.module';

// ─── Error Analyzer Types ─────────────────────────────────────────
export {
  ErrorCategory,
  ErrorSeverity,
  RemediationStrategy,
  WATCHDOG_ERROR_ANALYZER_CONFIG,
} from './error-analyzer-agent.service';

import type { ErrorAnalysisResult } from './error-analyzer-agent.service';
export type { ErrorAnalysisResult };

// ─── Auto Fixer Types ─────────────────────────────────────────────
export { RepairStrategy, WATCHDOG_AUTO_FIXER_CONFIG } from './auto-fixer-agent.service';

import type { RepairPlan, RepairExecutionResult } from './auto-fixer-agent.service';
export type { RepairPlan, RepairExecutionResult };

// ─── Circuit Breaker Types ────────────────────────────────────────
export {
  CircuitBreakerState,
  GlobalHealthStatus,
  WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG,
} from './circuit-breaker-manager-agent.service';

import type {
  AgentCircuitState,
  AgentFailureRecord,
  RecoveryPlan,
  CircuitBreakerAssessment,
} from './circuit-breaker-manager-agent.service';
export type { AgentCircuitState, AgentFailureRecord, RecoveryPlan, CircuitBreakerAssessment };
