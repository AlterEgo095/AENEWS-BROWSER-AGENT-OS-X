/**
 * AENEWS Agent OS X - Certification Module
 * NestJS module that provides all certification services.
 * Now includes Dependency Analyzer for circular dependency detection.
 */

import { Module } from '@nestjs/common';
import { EqiCalculatorService } from './eqi-calculator.service';
import { ArchitectCertificationService } from './architect/architect-certification.service';
import { DependencyAnalyzerService } from './architect/dependency-analyzer.service';
import { AgentIntegrityCertificationService } from './integrity/agent-integrity-certification.service';
import { OrchestrationCertificationService } from './orchestration/orchestration-certification.service';
import { BrowserCertificationService } from './browser/browser-certification.service';
import { PerformanceCertificationService } from './performance/performance-certification.service';
import { CommunicationCertificationService } from './communication/communication-certification.service';
import { MemoryCertificationService } from './memory/memory-certification.service';
import { ResilienceCertificationService } from './resilience/resilience-certification.service';
import { SecurityCertificationService } from './security/security-certification.service';
import { CertificationRunnerService } from './certification-runner.service';
import { CertificationController } from './certification.controller';

@Module({
  providers: [
    EqiCalculatorService,
    DependencyAnalyzerService,
    ArchitectCertificationService,
    AgentIntegrityCertificationService,
    OrchestrationCertificationService,
    BrowserCertificationService,
    PerformanceCertificationService,
    CommunicationCertificationService,
    MemoryCertificationService,
    ResilienceCertificationService,
    SecurityCertificationService,
    CertificationRunnerService,
  ],
  controllers: [CertificationController],
  exports: [
    EqiCalculatorService,
    DependencyAnalyzerService,
    ArchitectCertificationService,
    AgentIntegrityCertificationService,
    OrchestrationCertificationService,
    BrowserCertificationService,
    PerformanceCertificationService,
    CommunicationCertificationService,
    MemoryCertificationService,
    ResilienceCertificationService,
    SecurityCertificationService,
    CertificationRunnerService,
  ],
})
export class CertificationModule {}
