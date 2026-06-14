/**
 * AENEWS Software Factory — Batch Runner (Connector-based)
 *
 * Executes N missions sequentially, measures MSR, and produces a report.
 * This is the Sprint 1 validation tool: "The pipeline must run 100 times without error."
 *
 * Now delegates all LLM calls, file parsing, template generation, etc.
 * to the connector system instead of duplicating that logic here.
 *
 * Usage:
 *   npx ts-node src/software-factory/runtime/batch-runner.ts [--count 10] [--mission-id 12] [--easy]
 *
 * Options:
 *   --count N        Run N missions (default: 5)
 *   --mission-id N   Run specific reference mission by ID
 *   --easy           Only run easy missions
 *   --medium         Only run medium missions
 *   --hard           Only run hard missions
 *   --pack NAME      Only run missions from a specific pack
 *   --delay MS       Delay between missions in ms (default: 3000)
 *   --output FILE    Save report to file
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RuntimeLogger } from './runtime-logger';

const log = new RuntimeLogger('BatchRunner');

import { ReferenceMissions, ReferenceMission } from './reference-missions';
import {
  MissionMetricsService,
  MissionCategory,
  MissionMetric,
  AggregateMetrics,
  MSR_TARGETS,
} from './mission-metrics.service';

import { DevelopmentConnector } from '../connectors/development-connector';
import { BrowserConnector } from '../connectors/browser-connector';
import { CertificationConnector } from '../connectors/certification-connector';
import { DeliveryConnector } from '../connectors/delivery-connector';
import { OfficeConnector } from '../connectors/office-connector';
import { BusinessConnector } from '../connectors/business-connector';
import {
  ICapabilityConnector,
  ConnectorInput,
  ConnectorOutput,
} from '../connectors/connector.interface';
import { DevCapability, CertCapability, DeliveryCapability, CapabilityId } from '../interfaces';

// ─── Types (simplified, no NestJS) ────────────────────────────

interface RuntimeArtifact {
  name: string;
  type: 'source' | 'test' | 'document' | 'config' | 'archive' | 'report';
  path: string;
  size: number;
  content?: string;
}

interface RuntimeResult {
  missionId: string;
  success: boolean;
  artifacts: RuntimeArtifact[];
  workspaceDir: string;
  qualityScore: number;
  certified: boolean;
  totalDurationMs: number;
  totalCostUsd: number;
  errors: string[];
}

interface PhaseTiming {
  name: string;
  durationMs: number;
  success: boolean;
}

// ─── THE BATCH RUNNER ─────────────────────────────────────────

class BatchRunner {
  private readonly baseWorkspace = '/home/z/my-project/download/missions';
  private connectorCallCount = 0;
  private metrics: MissionMetric[] = [];

  /** Local connector registry — maps capability IDs to connector instances */
  private readonly connectors = new Map<string, ICapabilityConnector>();

  constructor() {
    fs.mkdirSync(this.baseWorkspace, { recursive: true });

    // Instantiate connectors directly (standalone — no NestJS DI)
    const devConnector = new DevelopmentConnector();
    const browserConnector = new BrowserConnector();
    const certConnector = new CertificationConnector();
    const deliveryConnector = new DeliveryConnector();
    const officeConnector = new OfficeConnector();
    const businessConnector = new BusinessConnector();

    this.registerConnector(devConnector);
    this.registerConnector(browserConnector);
    this.registerConnector(certConnector);
    this.registerConnector(deliveryConnector);
    this.registerConnector(officeConnector);
    this.registerConnector(businessConnector);
  }

  /**
   * Register a connector by iterating its supported capability IDs.
   * We register all known capability IDs from each pack so the
   * local registry can dispatch to the right connector.
   */
  private registerConnector(connector: ICapabilityConnector): void {
    const capabilityIds = this.getCapabilityIdsForPack(connector.supportedPack);
    for (const capId of capabilityIds) {
      this.connectors.set(capId, connector);
    }
  }

  /**
   * Get all capability ID strings for a given pack.
   * This avoids needing a separate registry module.
   */
  private getCapabilityIdsForPack(pack: string): string[] {
    switch (pack) {
      case 'DEVELOPMENT':
        return Object.values(DevCapability);
      case 'BROWSER':
        return [
          'browser.login',
          'browser.navigation',
          'browser.search',
          'browser.form',
          'browser.upload',
          'browser.download',
          'browser.screenshot',
          'browser.vision',
          'browser.session',
          'browser.cookie',
          'browser.popup',
          'browser.ocr',
        ];
      case 'CERTIFICATION':
        return Object.values(CertCapability);
      case 'DELIVERY':
        return Object.values(DeliveryCapability);
      case 'OFFICE':
        return [
          'office.pdf',
          'office.docx',
          'office.excel',
          'office.powerpoint',
          'office.ocr',
          'office.signature',
          'office.email',
          'office.calendar',
        ];
      case 'BUSINESS':
        return [
          'business.seo',
          'business.marketing',
          'business.copywriting',
          'business.branding',
          'business.crm',
          'business.analytics',
          'business.finance',
          'business.sales',
          'business.legal',
          'business.partnership',
        ];
      default:
        return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async rateLimitDelay(): Promise<void> {
    const delayMs = this.connectorCallCount > 5 ? 3000 : 1500;
    await this.delay(delayMs);
  }

  /**
   * Execute a capability via the connector system
   */
  private async executeViaConnector(
    capabilityId: CapabilityId,
    input: ConnectorInput,
  ): Promise<ConnectorOutput> {
    const connector = this.connectors.get(capabilityId as string);
    if (!connector || !connector.supports(capabilityId)) {
      return {
        success: false,
        artifacts: [],
        output: { skipped: true },
        costUsd: 0,
        durationMs: 0,
        error: `No connector for ${capabilityId}`,
      };
    }
    this.connectorCallCount++;
    return connector.execute(capabilityId, input);
  }

  /**
   * Build a ConnectorInput with common fields
   */
  private buildConnectorInput(
    missionId: string,
    instruction: string,
    workspaceDir: string,
    previousResults: Map<CapabilityId, ConnectorOutput>,
    parameters: Record<string, any> = {},
  ): ConnectorInput {
    return {
      missionId,
      instruction,
      workspaceDir,
      parameters,
      previousResults,
      tools: [],
    };
  }

  /**
   * Convert ConnectorOutput artifacts to RuntimeArtifact format
   */
  private convertArtifacts(connectorArtifacts: any[]): RuntimeArtifact[] {
    return connectorArtifacts.map((a) => ({
      name: a.name,
      type: a.type as RuntimeArtifact['type'],
      path: a.path,
      size: a.size,
      content: a.content,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  //  BATCH RUN
  // ═══════════════════════════════════════════════════════════

  /**
   * Run a batch of reference missions and measure MSR
   */
  async runBatch(options: {
    count?: number;
    missionIds?: number[];
    difficulty?: 'easy' | 'medium' | 'hard';
    pack?: string;
    delayMs?: number;
  }): Promise<AggregateMetrics> {
    const count = options.count || 5;
    const delayMs = options.delayMs || 3000;

    // Select missions
    let missions: ReferenceMission[];
    if (options.missionIds && options.missionIds.length > 0) {
      missions = ReferenceMissions.ALL.filter((m) => options.missionIds!.includes(m.id));
    } else if (options.difficulty) {
      missions = ReferenceMissions.getByDifficulty(options.difficulty);
    } else if (options.pack) {
      missions = ReferenceMissions.getByPack(options.pack as any);
    } else {
      // Pick a diverse set
      missions = ReferenceMissions.getRandom(count);
    }

    // Limit to count
    missions = missions.slice(0, count);

    log.info(`\n${'═'.repeat(80)}`);
    log.info(`  AENEWS SOFTWARE FACTORY — BATCH RUN (Connector-based)`);
    log.info(`  Missions: ${missions.length} | Delay: ${delayMs}ms`);
    log.info(`${'═'.repeat(80)}\n`);

    const startTime = Date.now();

    for (let i = 0; i < missions.length; i++) {
      const mission = missions[i];
      log.info(
        `\n[${i + 1}/${missions.length}] Mission #${mission.id}: "${mission.instruction.slice(0, 60)}..."`,
      );
      log.info(
        `  Category: ${mission.category} | Pack: ${mission.capabilityPack} | Difficulty: ${mission.difficulty}`,
      );

      const result = await this.executeMission(mission.instruction);

      // Record metric
      const metric: MissionMetric = {
        missionId: result.missionId,
        instruction: mission.instruction,
        category: mission.category,
        success: result.success,
        certified: result.certified,
        qualityScore: result.qualityScore,
        artifactCount: result.artifacts.length,
        totalSizeBytes: result.artifacts.reduce((s, a) => s + a.size, 0),
        durationMs: result.totalDurationMs,
        costUsd: result.totalCostUsd,
        retries: result.errors.length > 0 ? 1 : 0,
        errors: result.errors,
        phases: [],
        timestamp: new Date().toISOString(),
      };
      this.metrics.push(metric);

      const status = result.certified
        ? '✅ CERTIFIED'
        : result.success
          ? '⚠️ SUCCESS (uncertified)'
          : '❌ FAILED';
      log.info(
        `  → ${status} | Score: ${result.qualityScore}/100 | ${(result.totalDurationMs / 1000).toFixed(1)}s | $${result.totalCostUsd.toFixed(3)}`,
      );
      log.info(`  → ${result.artifacts.length} artifacts | ${result.errors.length} errors`);

      // Print running MSR
      const runningMsr = this.metrics.filter((m) => m.success).length / this.metrics.length;
      log.info(
        `  → Running MSR: ${(runningMsr * 100).toFixed(1)}% (${this.metrics.filter((m) => m.success).length}/${this.metrics.length})`,
      );

      // Delay between missions to avoid rate limiting
      if (i < missions.length - 1) {
        log.info(`  ⏳ Waiting ${delayMs / 1000}s before next mission...`);
        await this.delay(delayMs);
      }
    }

    const totalBatchDuration = Date.now() - startTime;

    // Print final report
    this.printReport(totalBatchDuration);

    // Save metrics to disk
    this.saveMetrics();

    return this.computeAggregate();
  }

  // ═══════════════════════════════════════════════════════════
  //  EXECUTE MISSION — via connectors
  // ═══════════════════════════════════════════════════════════

  /**
   * Execute a single mission using the connector pipeline:
   *   1. Analyze   → dev.architecture connector
   *   2. Build     → dev.frontend, dev.backend, dev.database, dev.docker (based on plan)
   *   3. Test      → dev.test + dev.qa connectors
   *   4. Audit     → Quick checks (no LLM for speed in batch mode)
   *   5. Certify   → Score computation
   *   6. Document  → dev.documentation connector
   *   7. ZIP       → delivery.zip connector
   *   8. Quality Gate → if score < 60, run dev.debug then re-test (1 attempt only)
   */
  async executeMission(instruction: string): Promise<RuntimeResult> {
    const missionId = `mission-${uuidv4().slice(0, 8)}`;
    const startTime = Date.now();
    let totalCost = 0;

    const workspaceDir = path.join(this.baseWorkspace, missionId);
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });

    const artifacts: RuntimeArtifact[] = [];
    const errors: string[] = [];
    const previousResults = new Map<CapabilityId, ConnectorOutput>();

    // ─── Phase 1: Analyze → dev.architecture connector ────────
    let analysisPlan: any;
    try {
      await this.rateLimitDelay();
      const archInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
      );
      const archResult = await this.executeViaConnector(DevCapability.ARCHITECTURE, archInput);
      totalCost += archResult.costUsd;
      previousResults.set(DevCapability.ARCHITECTURE, archResult);

      if (archResult.success && archResult.output?.architecture) {
        // Try to parse a JSON plan from the architecture output
        try {
          const jsonMatch = archResult.output.architecture.match(/\{[\s\S]*\}/);
          analysisPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          /* not JSON, that's fine */
        }
      }

      // Add architecture artifacts
      artifacts.push(...this.convertArtifacts(archResult.artifacts));
    } catch (err: any) {
      errors.push(`Analysis: ${err.message}`);
    }

    // Use fallback plan if analysis failed
    if (!analysisPlan) {
      analysisPlan = this.fallbackPlan(instruction);
    }

    // ─── Phase 2: Build → dev.frontend, dev.backend, dev.database, dev.docker ───
    const hasBackend = /api|backend|server|database|erp|crm|todo|chat|auth/i.test(instruction);
    const hasDatabase = /database|db|sql|sqlite|mongo|postgres|stock|erp|crm/i.test(instruction);
    const buildCapabilities: CapabilityId[] = [DevCapability.FRONTEND];
    if (hasBackend) buildCapabilities.push(DevCapability.BACKEND);
    if (hasDatabase) buildCapabilities.push(DevCapability.DATABASE);

    for (const capId of buildCapabilities) {
      try {
        await this.rateLimitDelay();
        const buildInput = this.buildConnectorInput(
          missionId,
          instruction,
          workspaceDir,
          previousResults,
          { plan: analysisPlan },
        );
        const buildResult = await this.executeViaConnector(capId, buildInput);
        totalCost += buildResult.costUsd;
        previousResults.set(capId, buildResult);

        if (buildResult.success) {
          artifacts.push(...this.convertArtifacts(buildResult.artifacts));
        } else {
          errors.push(`Build ${capId}: ${buildResult.error || 'connector returned failure'}`);
        }
      } catch (err: any) {
        errors.push(`Build ${capId}: ${err.message}`);
        // Continue with partial results — don't crash the batch
      }
    }

    // Docker → dev.docker connector
    try {
      await this.rateLimitDelay();
      const dockerInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
        { plan: analysisPlan },
      );
      const dockerResult = await this.executeViaConnector(DevCapability.DOCKER, dockerInput);
      totalCost += dockerResult.costUsd;
      previousResults.set(DevCapability.DOCKER, dockerResult);
      if (dockerResult.success) {
        artifacts.push(...this.convertArtifacts(dockerResult.artifacts));
      }
    } catch (err: any) {
      errors.push(`Docker: ${err.message}`);
    }

    // ─── Phase 3: Test → dev.test + dev.qa connectors ────────
    let testPassed = true;
    let testResults: any[] = [];

    // dev.test — generates test code
    try {
      await this.rateLimitDelay();
      const testInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
      );
      const testResult = await this.executeViaConnector(DevCapability.TEST, testInput);
      totalCost += testResult.costUsd;
      previousResults.set(DevCapability.TEST, testResult);
      if (testResult.success) {
        artifacts.push(...this.convertArtifacts(testResult.artifacts));
      }
    } catch (err: any) {
      errors.push(`Test generation: ${err.message}`);
    }

    // dev.qa — runs tests + LLM analysis
    try {
      await this.rateLimitDelay();
      const qaInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
      );
      const qaResult = await this.executeViaConnector(DevCapability.QA, qaInput);
      totalCost += qaResult.costUsd;
      previousResults.set(DevCapability.QA, qaResult);

      if (qaResult.success) {
        artifacts.push(...this.convertArtifacts(qaResult.artifacts));
      } else {
        testPassed = false;
        if (qaResult.output?.results) {
          testResults = qaResult.output.results;
        }
      }
    } catch (err: any) {
      errors.push(`QA: ${err.message}`);
      testPassed = false;
    }

    // ─── Phase 4: Audit → Quick checks (no LLM for speed) ────
    let auditPassed = true;
    const auditFindings: string[] = [];
    if (artifacts.filter((a) => a.type === 'source').length === 0) {
      auditFindings.push('No source files');
      auditPassed = false;
    }
    for (const a of artifacts) {
      if (a.size < 10 && a.type === 'source') {
        auditFindings.push(`${a.name} too small`);
      }
    }

    // ─── Phase 5: Certify → Score computation ────────────────
    const certResult = this.certify(artifacts, testPassed, auditFindings);

    // ─── Phase 6: Document → dev.documentation connector ─────
    try {
      await this.rateLimitDelay();
      const docInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
      );
      const docResult = await this.executeViaConnector(DevCapability.DOCUMENTATION, docInput);
      totalCost += docResult.costUsd;
      previousResults.set(DevCapability.DOCUMENTATION, docResult);
      if (docResult.success) {
        // Only add doc artifacts that aren't already present (avoid duplicates)
        const existingNames = new Set(artifacts.map((a) => a.name));
        for (const art of this.convertArtifacts(docResult.artifacts)) {
          if (!existingNames.has(art.name)) {
            artifacts.push(art);
          }
        }
      }
    } catch (err: any) {
      errors.push(`Documentation: ${err.message}`);
    }

    // ─── Phase 7: ZIP → delivery.zip connector ───────────────
    try {
      const zipInput = this.buildConnectorInput(
        missionId,
        instruction,
        workspaceDir,
        previousResults,
        { outputPath: path.join(this.baseWorkspace, `${missionId}.zip`) },
      );
      const zipResult = await this.executeViaConnector(DeliveryCapability.ZIP, zipInput);
      totalCost += zipResult.costUsd;
      previousResults.set(DeliveryCapability.ZIP, zipResult);
      if (zipResult.success) {
        artifacts.push(...this.convertArtifacts(zipResult.artifacts));
      }
    } catch (err: any) {
      errors.push(`ZIP: ${err.message}`);
      // ZIP is optional in batch mode
    }

    // ─── Phase 8: Quality Gate → retry once if score < 60 ────
    let finalScore = certResult.qualityScore;
    let finalCertified = certResult.certified;

    if (finalScore < 60) {
      log.info(`  🔄 Quality gate: score ${finalScore} < 60, attempting debug + re-test...`);

      // Run dev.debug connector
      try {
        await this.rateLimitDelay();
        const debugInput = this.buildConnectorInput(
          missionId,
          instruction,
          workspaceDir,
          previousResults,
          {
            error: errors.join('; ') || 'Low quality score',
            lastError: errors.join('; ') || 'Low quality score',
          },
        );
        const debugResult = await this.executeViaConnector(DevCapability.DEBUG, debugInput);
        totalCost += debugResult.costUsd;
        previousResults.set(DevCapability.DEBUG, debugResult);
        if (debugResult.success) {
          artifacts.push(...this.convertArtifacts(debugResult.artifacts));
        }
      } catch (err: any) {
        errors.push(`Debug: ${err.message}`);
      }

      // Re-test after debug
      try {
        await this.rateLimitDelay();
        const reTestInput = this.buildConnectorInput(
          missionId,
          instruction,
          workspaceDir,
          previousResults,
        );
        const reTestResult = await this.executeViaConnector(DevCapability.QA, reTestInput);
        totalCost += reTestResult.costUsd;

        if (reTestResult.success) {
          testPassed = true;
          if (reTestResult.artifacts?.length) {
            artifacts.push(...this.convertArtifacts(reTestResult.artifacts));
          }
        }
      } catch (err: any) {
        errors.push(`Re-test: ${err.message}`);
      }

      // Re-certify
      const reCert = this.certify(artifacts, testPassed, auditFindings);
      finalScore = reCert.qualityScore;
      finalCertified = reCert.certified;
    }

    const totalDuration = Date.now() - startTime;
    const success = errors.length === 0 || artifacts.filter((a) => a.type === 'source').length > 0;

    return {
      missionId,
      success,
      artifacts,
      workspaceDir,
      qualityScore: finalScore,
      certified: finalCertified,
      totalDurationMs: totalDuration,
      totalCostUsd: totalCost,
      errors,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  CERTIFICATION (local scoring, no connector needed)
  // ═══════════════════════════════════════════════════════════

  private certify(
    artifacts: RuntimeArtifact[],
    testPassed: boolean,
    auditFindings: string[],
  ): { certified: boolean; qualityScore: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 100;

    if (!testPassed) {
      score -= 30;
      reasons.push('Tests failed');
    }
    if (auditFindings.some((f) => f.includes('No source'))) {
      score -= 40;
      reasons.push('No source code');
    }
    if (auditFindings.some((f) => f.includes('too small'))) {
      score -= 10;
      reasons.push('Small files');
    }
    if (!artifacts.some((a) => a.type === 'test')) {
      score -= 10;
      reasons.push('No tests');
    }
    if (!artifacts.some((a) => a.type === 'document')) {
      score -= 5;
      reasons.push('No documentation');
    }
    if (!artifacts.some((a) => a.type === 'config')) {
      score -= 5;
      reasons.push('No config files');
    }

    return { certified: score >= 60, qualityScore: Math.max(0, score), reasons };
  }

  // ═══════════════════════════════════════════════════════════
  //  FALLBACK PLAN (kept — connectors don't generate this)
  // ═══════════════════════════════════════════════════════════

  private fallbackPlan(instruction: string): any {
    const lower = instruction.toLowerCase();
    const isWebApp = /app|application|web|site|page|saas|erp|todo|list/i.test(lower);
    const hasBackend = /api|backend|server|database|erp|crm|todo/i.test(lower);
    return {
      objective: instruction,
      techStack: isWebApp ? ['HTML', 'CSS', 'JavaScript', 'Node.js'] : ['JavaScript'],
      phases: [
        {
          name: 'Architecture',
          tasks: ['Define structure'],
          capabilities: ['dev.architecture'],
          estimatedMinutes: 10,
        },
        {
          name: 'Frontend',
          tasks: ['Build UI'],
          capabilities: ['dev.frontend'],
          estimatedMinutes: 30,
        },
        ...(hasBackend
          ? [
              {
                name: 'Backend',
                tasks: ['Build API'],
                capabilities: ['dev.backend'],
                estimatedMinutes: 45,
              },
            ]
          : []),
        {
          name: 'Testing',
          tasks: ['Write tests'],
          capabilities: ['dev.test'],
          estimatedMinutes: 15,
        },
      ],
      requiredCapabilities: hasBackend
        ? ['dev.architecture', 'dev.frontend', 'dev.backend', 'dev.test']
        : ['dev.architecture', 'dev.frontend', 'dev.test'],
      deliverables: ['index.html', 'style.css', 'app.js', 'README.md', 'Dockerfile'],
      complexity: hasBackend ? 'medium' : 'low',
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  REPORT
  // ═══════════════════════════════════════════════════════════

  private printReport(totalBatchDurationMs: number): void {
    const total = this.metrics.length;
    const successes = this.metrics.filter((m) => m.success).length;
    const certified = this.metrics.filter((m) => m.certified).length;
    const msr = total > 0 ? successes / total : 0;
    const certRate = total > 0 ? certified / total : 0;

    const avgDuration =
      total > 0 ? Math.round(this.metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0;
    const avgCost = total > 0 ? this.metrics.reduce((s, m) => s + m.costUsd, 0) / total : 0;
    const avgQuality = total > 0 ? this.metrics.reduce((s, m) => s + m.qualityScore, 0) / total : 0;

    const currentTarget =
      MSR_TARGETS.find((t) => msr < t.target) || MSR_TARGETS[MSR_TARGETS.length - 1];

    log.info(`\n${'═'.repeat(80)}`);
    log.info(`  AENEWS SOFTWARE FACTORY — BATCH RUN RESULTS`);
    log.info(`${'═'.repeat(80)}`);
    log.info(`  Total Missions:          ${total}`);
    log.info(`  Successful:              ${successes}`);
    log.info(`  Certified:               ${certified}`);
    log.info(`${'─'.repeat(80)}`);
    log.info(`  MSR (Mission Success):   ${(msr * 100).toFixed(1)}%  ← KPI #1`);
    log.info(`  Certification Rate:      ${(certRate * 100).toFixed(1)}%`);
    log.info(
      `  Current Target:          ${(currentTarget.target * 100).toFixed(0)}% (${currentTarget.label})`,
    );
    log.info(`  Gap to Target:           ${((currentTarget.target - msr) * 100).toFixed(1)}%`);
    log.info(`${'─'.repeat(80)}`);
    log.info(`  Avg Duration:            ${(avgDuration / 1000).toFixed(1)}s`);
    log.info(`  Avg Cost:                $${avgCost.toFixed(3)}`);
    log.info(`  Avg Quality Score:       ${avgQuality.toFixed(1)}/100`);
    log.info(`  Total Batch Duration:    ${(totalBatchDurationMs / 1000 / 60).toFixed(1)}min`);
    log.info(`${'─'.repeat(80)}`);

    // Per-mission details
    log.info(`  Mission Details:`);
    for (const m of this.metrics) {
      const status = m.certified ? '✅' : m.success ? '⚠️' : '❌';
      log.info(
        `    ${status} #${m.missionId} — "${m.instruction.slice(0, 45)}..." — Score: ${m.qualityScore} — ${(m.durationMs / 1000).toFixed(1)}s — ${m.artifactCount} files`,
      );
    }

    // Category breakdown
    const categories: Record<string, { total: number; success: number }> = {};
    for (const m of this.metrics) {
      if (!categories[m.category]) categories[m.category] = { total: 0, success: 0 };
      categories[m.category].total++;
      if (m.success) categories[m.category].success++;
    }

    log.info(`${'─'.repeat(80)}`);
    log.info(`  Category Breakdown:`);
    for (const [cat, data] of Object.entries(categories)) {
      log.info(
        `    ${cat}: ${data.success}/${data.total} (${((data.success / data.total) * 100).toFixed(0)}%)`,
      );
    }

    log.info(`${'═'.repeat(80)}\n`);

    // Verdict
    if (msr >= 0.99) {
      log.info(`  🏆 ELITE LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 99%`);
    } else if (msr >= 0.95) {
      log.info(`  🥇 ENTERPRISE LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 95%`);
    } else if (msr >= 0.85) {
      log.info(`  🥈 BETA LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 85%`);
    } else if (msr >= 0.7) {
      log.info(`  🥉 MVP LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 70%`);
    } else {
      log.info(`  ⚠️  BELOW MVP — MSR ${(msr * 100).toFixed(1)}% < 70% — Need to improve!`);
    }
    log.info();
  }

  private saveMetrics(): void {
    const metricsDir = path.join(this.baseWorkspace, 'metrics');
    fs.mkdirSync(metricsDir, { recursive: true });
    const metricsFile = path.join(metricsDir, `batch-${Date.now()}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2), 'utf-8');
    log.info(`  Metrics saved to: ${metricsFile}`);
  }

  private computeAggregate(): AggregateMetrics {
    const total = this.metrics.length;
    const successes = this.metrics.filter((m) => m.success).length;
    const certified = this.metrics.filter((m) => m.certified).length;

    return {
      totalMissions: total,
      successes,
      certified,
      msr: total > 0 ? successes / total : 0,
      certificationRate: total > 0 ? certified / total : 0,
      avgDurationMs:
        total > 0 ? Math.round(this.metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0,
      avgCostUsd: total > 0 ? this.metrics.reduce((s, m) => s + m.costUsd, 0) / total : 0,
      avgQualityScore: total > 0 ? this.metrics.reduce((s, m) => s + m.qualityScore, 0) / total : 0,
      totalRetries: this.metrics.reduce((s, m) => s + m.retries, 0),
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      byCategory: {},
      recentTrend: { last10Msr: 0, last25Msr: 0, last50Msr: 0, improving: false },
      targetMsr: 0.7,
      msrGap: 0.7 - (total > 0 ? successes / total : 0),
    };
  }
}

// ═══════════════════════════════════════════════════════════
//  CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  let count = 5;
  const missionIds: number[] = [];
  let difficulty: 'easy' | 'medium' | 'hard' | undefined;
  let pack: string | undefined;
  let delayMs = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--mission-id' && args[i + 1]) {
      missionIds.push(parseInt(args[i + 1]));
      i++;
    } else if (args[i] === '--easy') {
      difficulty = 'easy';
    } else if (args[i] === '--medium') {
      difficulty = 'medium';
    } else if (args[i] === '--hard') {
      difficulty = 'hard';
    } else if (args[i] === '--pack' && args[i + 1]) {
      pack = args[i + 1];
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      delayMs = parseInt(args[i + 1]);
      i++;
    }
  }

  const runner = new BatchRunner();

  try {
    await runner.runBatch({
      count,
      missionIds: missionIds.length > 0 ? missionIds : undefined,
      difficulty,
      pack,
      delayMs,
    });
  } catch (err: any) {
    log.error(`Batch run failed: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    log.error(err);
    process.exit(1);
  });
}

export { BatchRunner };
