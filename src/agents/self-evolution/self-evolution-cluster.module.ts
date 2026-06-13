/**
 * AENEWS Agent OS X - Self-Evolution Cluster Module
 * Aggregates all 5 Self-Evolution agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all self-evolution agent services for dependency injection.
 *
 * Self-Improvement Loop:
 *   MetricAnalyzer → WeaknessDetector → RefactorProposer → PatchGenerator → AutoCertifier
 *       ↑                                                                          │
 *       └───────────────────── EQI Baseline Update (if merged) ───────────────────┘
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { AgentConnectorBridgeModule } from '../bridge';
import { MetricAnalyzerAgent } from './metric-analyzer.agent';
import { WeaknessDetectorAgent } from './weakness-detector.agent';
import { RefactorProposerAgent } from './refactor-proposer.agent';
import { PatchGeneratorAgent } from './patch-generator.agent';
import { AutoCertifierAgent } from './auto-certifier.agent';

@Module({
  imports: [BaseAgentModule, AgentConnectorBridgeModule],
  providers: [
    // 1. Metric Analyzer — analyzes production metrics, collects baselines, detects anomalies
    MetricAnalyzerAgent,
    // 2. Weakness Detector — detects weak points from metrics and certification results
    WeaknessDetectorAgent,
    // 3. Refactor Proposer — proposes refactoring strategies with impact analysis
    RefactorProposerAgent,
    // 4. Patch Generator — generates code patches in isolated branches
    PatchGeneratorAgent,
    // 5. Auto Certifier — runs certification T∞, only merges if EQI increases
    AutoCertifierAgent,
  ],
  exports: [
    MetricAnalyzerAgent,
    WeaknessDetectorAgent,
    RefactorProposerAgent,
    PatchGeneratorAgent,
    AutoCertifierAgent,
  ],
})
export class SelfEvolutionClusterModule {}
