/**
 * AENEWS Agent OS X - Certification Cluster Module
 * Aggregates all 13 certification auditor agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all certification auditor agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { ArchitectureAuditorAgent } from './architecture/architecture-auditor-agent.service';
import { SecurityAuditorAgent } from './security/security-auditor-agent.service';
import { PerformanceAuditorAgent } from './performance/performance-auditor-agent.service';
import { MemoryAuditorAgent } from './memory/memory-auditor-agent.service';
import { PluginAuditorAgent } from './plugin/plugin-auditor-agent.service';
import { BrowserAuditorAgent } from './browser/browser-auditor-agent.service';
import { OrchestratorAuditorAgent } from './orchestrator/orchestrator-auditor-agent.service';
import { DocumentationAuditorAgent } from './documentation/documentation-auditor-agent.service';
import { TestAuditorAgent } from './test/test-auditor-agent.service';
import { RegressionAuditorAgent } from './regression/regression-auditor-agent.service';
import { ComplianceAuditorAgent } from './compliance/compliance-auditor-agent.service';
import { ObservabilityAuditorAgent } from './observability/observability-auditor-agent.service';
import { AIQualityAuditorAgent } from './ai-quality/ai-quality-auditor-agent.service';

@Module({
  imports: [BaseAgentModule],
  providers: [
    // 1. Architecture Auditor — audits architecture integrity, circular deps, coupling
    ArchitectureAuditorAgent,
    // 2. Security Auditor — audits security vulnerabilities, injection prevention, RBAC
    SecurityAuditorAgent,
    // 3. Performance Auditor — audits performance metrics, latency, throughput
    PerformanceAuditorAgent,
    // 4. Memory Auditor — audits memory tiers, gateway, cross-tier retrieval
    MemoryAuditorAgent,
    // 5. Plugin Auditor — audits plugin isolation, sandboxing, compatibility
    PluginAuditorAgent,
    // 6. Browser Auditor — audits browser agents, navigation, sessions
    BrowserAuditorAgent,
    // 7. Orchestrator Auditor — audits orchestration pipeline, decompose→deliver
    OrchestratorAuditorAgent,
    // 8. Documentation Auditor — audits documentation coverage, JSDoc, diagrams
    DocumentationAuditorAgent,
    // 9. Test Auditor — audits test coverage, unit/integration/E2E
    TestAuditorAgent,
    // 10. Regression Auditor — audits regression detection, baselines
    RegressionAuditorAgent,
    // 11. Compliance Auditor — audits regulatory compliance, GDPR, SOC2
    ComplianceAuditorAgent,
    // 12. Observability Auditor — audits metrics, tracing, logging, alerting
    ObservabilityAuditorAgent,
    // 13. AI Quality Auditor — audits AI model quality, hallucination detection, bias
    AIQualityAuditorAgent,
  ],
  exports: [
    ArchitectureAuditorAgent,
    SecurityAuditorAgent,
    PerformanceAuditorAgent,
    MemoryAuditorAgent,
    PluginAuditorAgent,
    BrowserAuditorAgent,
    OrchestratorAuditorAgent,
    DocumentationAuditorAgent,
    TestAuditorAgent,
    RegressionAuditorAgent,
    ComplianceAuditorAgent,
    ObservabilityAuditorAgent,
    AIQualityAuditorAgent,
  ],
})
export class CertificationClusterModule {}
