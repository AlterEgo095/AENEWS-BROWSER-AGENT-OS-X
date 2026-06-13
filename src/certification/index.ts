/**
 * AENEWS Agent OS X - Certification Barrel Export
 * Re-exports all public types, services, and the certification module.
 */

// ─── Types ────────────────────────────────────────────────────────
export * from './types';

// ─── Services ─────────────────────────────────────────────────────
export { EqiCalculatorService } from './eqi-calculator.service';
export { CertificationRunnerService } from './certification-runner.service';
export { ArchitectCertificationService } from './architect/architect-certification.service';
export { AgentIntegrityCertificationService } from './integrity/agent-integrity-certification.service';
export { OrchestrationCertificationService } from './orchestration/orchestration-certification.service';
export { BrowserCertificationService } from './browser/browser-certification.service';
export { PerformanceCertificationService } from './performance/performance-certification.service';

// ─── Module ───────────────────────────────────────────────────────
export { CertificationModule } from './certification.module';

// ─── Controller ───────────────────────────────────────────────────
export { CertificationController } from './certification.controller';
