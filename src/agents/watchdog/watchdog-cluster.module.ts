/**
 * AENEWS Agent OS X - Watchdog/Self-Healing Cluster Module
 * Aggregates all 3 Watchdog agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Imports AgentConnectorBridgeModule for LLM and capability access.
 * Provides all watchdog agent services for dependency injection.
 *
 * Self-Healing Pipeline:
 *   ErrorAnalyzer → AutoFixer → CircuitBreakerManager
 *        ↑                            │
 *        └──── Circuit State Feedback ─┘
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { ErrorAnalyzerAgentService } from './error-analyzer-agent.service';
import { AutoFixerAgentService } from './auto-fixer-agent.service';
import { CircuitBreakerManagerAgentService } from './circuit-breaker-manager-agent.service';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Error Analyzer — analyzes error traces, identifies root causes, classifies errors, suggests remediation
    ErrorAnalyzerAgentService,
    // 2. Auto Fixer — applies automated fixes based on error analysis (retry, reassign, simplify, fallback, escalate)
    AutoFixerAgentService,
    // 3. Circuit Breaker Manager — manages circuit breakers across the platform, monitors agent health, coordinates recovery
    CircuitBreakerManagerAgentService,
  ],
  exports: [ErrorAnalyzerAgentService, AutoFixerAgentService, CircuitBreakerManagerAgentService],
})
export class WatchdogClusterModule {}
