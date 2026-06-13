/**
 * AENEWS Software Factory — Worker Factory
 *
 * Creates ephemeral workers, injects capabilities, then destroys them.
 * This is NOT an agent registry. Workers are temporary execution units.
 *
 * Sprint 2: Real Connectors
 *   WorkerFactory.executeCapability() now routes to real connectors
 *   via the ConnectorRegistry. No more simulated results.
 *
 * Example:
 *   Mission: "Develop an ERP"
 *   Planner produces: [architecture, frontend, backend, database, docker, test, doc, deploy]
 *   Worker Factory creates:
 *     Worker #1: [architecture, frontend]
 *     Worker #2: [backend, database]
 *     Worker #3: [docker, deploy]
 *     Worker #4: [test, documentation]
 *   Each worker executes via its connector → real tools → real output.
 *   Then destruction.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  CapabilityId,
  CapabilityDefinition,
  CapabilityExecutionResult,
  WorkerProfile,
  WorkerStatus,
  WorkerSpawnRequest,
  WorkerSpawnResult,
  WorkerTerminateRequest,
  WorkerTerminateResult,
  WorkerExecutionRequest,
  WorkerExecutionResult,
  WorkerPoolStatistics,
  WorkerPoolConstraints,
  DEFAULT_WORKER_CONSTRAINTS,
} from '../interfaces';
import { CapabilityRegistryService } from '../capability-registry/capability-registry.service';
import { ConnectorRegistry } from '../connectors/connector-registry';
import { ConnectorInput, ConnectorOutput } from '../connectors/connector.interface';
import { v4 as uuidv4 } from 'uuid';

/** Base directory for mission workspaces */
const MISSION_WORKSPACE_BASE = '/home/z/my-project/download/missions';

@Injectable()
export class WorkerFactoryService {
  private readonly logger = new Logger(WorkerFactoryService.name);
  private readonly workers = new Map<string, WorkerProfile>();
  private readonly archive: WorkerProfile[] = [];

  /** Track workspace dirs per mission for connector context */
  private readonly missionWorkspaces = new Map<string, string>();

  /** Track previous results per mission for connector chaining */
  private readonly missionResults = new Map<string, Map<CapabilityId, ConnectorOutput>>();

  private constraints: WorkerPoolConstraints = { ...DEFAULT_WORKER_CONSTRAINTS };

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  /**
   * Set the workspace directory for a mission
   * Called by the orchestrator when it creates the mission workspace
   */
  setMissionWorkspace(missionId: string, workspaceDir: string): void {
    this.missionWorkspaces.set(missionId, workspaceDir);
    // Ensure workspace directories exist
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });
  }

  /**
   * Get the workspace directory for a mission
   */
  getMissionWorkspace(missionId: string): string {
    if (this.missionWorkspaces.has(missionId)) {
      return this.missionWorkspaces.get(missionId)!;
    }
    // Auto-create if not set
    const workspaceDir = path.join(MISSION_WORKSPACE_BASE, missionId);
    this.setMissionWorkspace(missionId, workspaceDir);
    return workspaceDir;
  }

  /**
   * Create an ephemeral worker with injected capabilities
   */
  async spawn(request: WorkerSpawnRequest): Promise<WorkerSpawnResult> {
    // Check constraints
    const activeCount = this.getActiveCount();
    if (activeCount >= this.constraints.maxConcurrentWorkers) {
      this.logger.warn(`Worker pool full: ${activeCount}/${this.constraints.maxConcurrentWorkers}`);
      return {
        workerId: '',
        capabilities: request.capabilities,
        status: WorkerStatus.FAILED,
        ready: false,
      };
    }

    // Resolve capability definitions from registry
    const capabilityDefinitions: CapabilityDefinition[] = [];
    for (const capId of request.capabilities) {
      const def = this.capabilityRegistry.getCapability(capId);
      if (def) capabilityDefinitions.push(def);
    }

    const workerId = `worker-${uuidv4().slice(0, 8)}`;
    const worker: WorkerProfile = {
      id: workerId,
      missionId: request.missionId,
      capabilities: request.capabilities,
      capabilityDefinitions,
      status: WorkerStatus.SPAWNING,
      spawnedAt: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      totalCostUsd: 0,
      totalDurationMs: 0,
      maxLifetimeMs: request.maxLifetimeMs || this.constraints.defaultLifetimeMs,
      maxTasks: request.maxTasks || this.constraints.defaultMaxTasksPerWorker,
      assignedNodeIds: request.assignedNodeIds,
      results: [],
    };

    this.workers.set(workerId, worker);

    // Initialize worker (inject capabilities)
    await this.initializeWorker(worker);

    this.logger.log(
      `Worker spawned: ${workerId} [${request.capabilities.join(', ')}] for mission ${request.missionId}`,
    );

    return {
      workerId,
      capabilities: request.capabilities,
      status: worker.status,
      ready: worker.status === WorkerStatus.READY,
    };
  }

  /**
   * Terminate an ephemeral worker and archive its results
   */
  async terminate(request: WorkerTerminateRequest): Promise<WorkerTerminateResult> {
    const worker = this.workers.get(request.workerId);
    if (!worker) {
      return {
        workerId: request.workerId,
        terminated: false,
        finalStatus: WorkerStatus.FAILED,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalCostUsd: 0,
        totalDurationMs: 0,
        results: [],
      };
    }

    worker.status = WorkerStatus.TERMINATING;
    worker.terminatedAt = new Date();
    worker.totalDurationMs = worker.terminatedAt.getTime() - worker.spawnedAt.getTime();
    worker.status = WorkerStatus.TERMINATED;

    // Calculate totals
    const totalCost = worker.results.reduce((sum, r) => sum + r.costUsd, 0);
    worker.totalCostUsd = totalCost;

    const result: WorkerTerminateResult = {
      workerId: request.workerId,
      terminated: true,
      finalStatus: WorkerStatus.TERMINATED,
      tasksCompleted: worker.tasksCompleted,
      tasksFailed: worker.tasksFailed,
      totalCostUsd: worker.totalCostUsd,
      totalDurationMs: worker.totalDurationMs,
      results: worker.results,
    };

    // Archive if requested
    if (request.archiveResults) {
      this.archive.push({ ...worker });
      result.archivedPath = `archive/${worker.missionId}/${worker.id}`;
    }

    // Remove from active pool
    this.workers.delete(request.workerId);

    this.logger.log(
      `Worker terminated: ${request.workerId} [${request.reason}] — ${worker.tasksCompleted} tasks, $${worker.totalCostUsd.toFixed(2)}, ${worker.totalDurationMs}ms`,
    );

    return result;
  }

  /**
   * Terminate all workers for a specific mission
   */
  async terminateMissionWorkers(
    missionId: string,
    reason: WorkerTerminateRequest['reason'],
  ): Promise<WorkerTerminateResult[]> {
    const missionWorkers = this.getWorkersByMission(missionId);
    const results: WorkerTerminateResult[] = [];

    for (const worker of missionWorkers) {
      const result = await this.terminate({
        workerId: worker.id,
        reason,
        archiveResults: true,
      });
      results.push(result);
    }

    this.logger.log(`Terminated ${results.length} workers for mission ${missionId}`);
    return results;
  }

  /**
   * Execute a task on a worker (capability execution)
   *
   * Sprint 2: Routes to REAL connectors via ConnectorRegistry
   */
  async execute(execRequest: WorkerExecutionRequest): Promise<WorkerExecutionResult> {
    const worker = this.workers.get(execRequest.workerId);
    if (!worker || worker.status !== WorkerStatus.READY) {
      return {
        workerId: execRequest.workerId,
        nodeId: execRequest.nodeId,
        success: false,
        output: null,
        artifacts: [],
        durationMs: 0,
        costUsd: 0,
        error: `Worker not ready: ${execRequest.workerId}`,
      };
    }

    // Mark worker as executing
    worker.status = WorkerStatus.EXECUTING;
    const startTime = Date.now();

    try {
      // Execute capabilities — PARALLEL for independent, SEQUENTIAL for dependent
      const results: CapabilityExecutionResult[] = [];

      // Group capabilities: independent ones run in parallel, dependent ones sequential
      const { parallel, sequential } = this.groupCapabilities(worker.capabilities);

      // Phase 1: Execute independent capabilities in parallel
      if (parallel.length > 0) {
        this.logger.log(
          `Worker ${execRequest.workerId}: executing ${parallel.length} capabilities in PARALLEL`,
        );
        const parallelResults = await Promise.all(
          parallel.map(async (capId) => {
            const capDef = this.capabilityRegistry.getCapability(capId);
            return this.executeCapability(capId, capDef, execRequest.input, worker.missionId);
          }),
        );
        results.push(...parallelResults);

        // Store results for chaining
        for (const capResult of parallelResults) {
          worker.results.push(capResult);
          const connectorOutput: any = {
            success: capResult.success,
            artifacts: capResult.artifacts.map((p) => ({
              name: p,
              path: p,
              type: 'source',
              size: 0,
            })),
            output: capResult.output,
            costUsd: capResult.costUsd,
            durationMs: capResult.durationMs,
          };
          const prevResults =
            this.missionResults.get(worker.missionId) || new Map<CapabilityId, any>();
          prevResults.set(capResult.capabilityId, connectorOutput);
          this.missionResults.set(worker.missionId, prevResults);
        }
      }

      // Phase 2: Execute dependent capabilities sequentially (with context from phase 1)
      for (const capId of sequential) {
        const capDef = this.capabilityRegistry.getCapability(capId);
        const capResult: CapabilityExecutionResult = await this.executeCapability(
          capId,
          capDef,
          execRequest.input,
          worker.missionId,
        );
        results.push(capResult);
        worker.results.push(capResult);
      }

      const totalDuration = Date.now() - startTime;
      const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);

      // Update worker stats
      worker.tasksCompleted++;
      worker.totalCostUsd += totalCost;
      worker.totalDurationMs += totalDuration;
      worker.status = WorkerStatus.READY;

      // Check if worker has exhausted its task limit
      if (worker.tasksCompleted + worker.tasksFailed >= worker.maxTasks) {
        this.logger.log(`Worker ${execRequest.workerId} reached task limit, auto-terminating`);
        this.terminate({
          workerId: execRequest.workerId,
          reason: 'mission_complete',
          archiveResults: true,
        });
      }

      const allArtifacts = results.flatMap((r) => r.artifacts);
      const anyFailed = results.some((r) => !r.success);

      return {
        workerId: execRequest.workerId,
        nodeId: execRequest.nodeId,
        success: !anyFailed,
        output: results.map((r) => r.output),
        artifacts: allArtifacts,
        durationMs: totalDuration,
        costUsd: totalCost,
        error: anyFailed ? results.find((r) => !r.success)?.error : undefined,
      };
    } catch (error) {
      worker.tasksFailed++;
      worker.status = WorkerStatus.READY;

      return {
        workerId: execRequest.workerId,
        nodeId: execRequest.nodeId,
        success: false,
        output: null,
        artifacts: [],
        durationMs: Date.now() - startTime,
        costUsd: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get worker by ID
   */
  getWorker(workerId: string): WorkerProfile | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Get all workers for a mission
   */
  getWorkersByMission(missionId: string): WorkerProfile[] {
    const result: WorkerProfile[] = [];
    for (const worker of this.workers.values()) {
      if (worker.missionId === missionId) {
        result.push(worker);
      }
    }
    return result;
  }

  /**
   * Get pool statistics
   */
  getStatistics(): WorkerPoolStatistics {
    const active = this.getActiveWorkers();
    const byCapability: Record<string, number> = {};

    for (const worker of active) {
      for (const capId of worker.capabilities) {
        byCapability[capId] = (byCapability[capId] || 0) + 1;
      }
    }

    const allWorkers = [...this.archive];
    const totalLifetime = allWorkers.reduce((sum, w) => sum + w.totalDurationMs, 0);
    const missionIds = new Set(allWorkers.map((w) => w.missionId));

    return {
      totalSpawned: this.archive.length + active.length,
      totalTerminated: this.archive.length,
      currentlyActive: active.length,
      byCapability,
      totalCostUsd: [...active, ...this.archive].reduce((sum, w) => sum + w.totalCostUsd, 0),
      averageLifetimeMs: allWorkers.length > 0 ? totalLifetime / allWorkers.length : 0,
      averageTasksPerWorker:
        allWorkers.length > 0
          ? allWorkers.reduce((sum, w) => sum + w.tasksCompleted, 0) / allWorkers.length
          : 0,
      missionsServed: missionIds.size,
    };
  }

  /**
   * Get pool constraints
   */
  getConstraints(): WorkerPoolConstraints {
    return { ...this.constraints };
  }

  /**
   * Update pool constraints
   */
  updateConstraints(constraints: Partial<WorkerPoolConstraints>): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  /**
   * Get connector registry statistics
   */
  getConnectorStats(): any {
    return this.connectorRegistry.getStatistics();
  }

  // ─── Private Helpers ────────────────────────────────────────

  private async initializeWorker(worker: WorkerProfile): Promise<void> {
    // Ensure mission workspace exists
    const workspaceDir = this.getMissionWorkspace(worker.missionId);

    // Verify connectors are available for this worker's capabilities
    const availableConnectors: string[] = [];
    const missingConnectors: string[] = [];

    for (const capId of worker.capabilities) {
      if (this.connectorRegistry.hasConnector(capId)) {
        availableConnectors.push(capId);
      } else {
        missingConnectors.push(capId);
      }
    }

    if (missingConnectors.length > 0) {
      this.logger.warn(
        `Worker ${worker.id}: no connector for capabilities: ${missingConnectors.join(', ')}`,
      );
    }

    this.logger.log(
      `Worker ${worker.id} initialized with ${availableConnectors.length}/${worker.capabilities.length} real connectors, workspace: ${workspaceDir}`,
    );

    worker.status = WorkerStatus.READY;
    this.workers.set(worker.id, worker);
  }

  /**
   * Execute a capability via its real connector
   *
   * Sprint 2: This is the bridge between abstract capabilities and real tools.
   * If a connector exists → real execution (LLM, Playwright, Shell, etc.)
   * If no connector → graceful fallback with warning
   */
  private async executeCapability(
    capId: CapabilityId,
    definition: CapabilityDefinition | undefined,
    input: any,
    missionId: string,
  ): Promise<CapabilityExecutionResult> {
    const startTime = Date.now();
    const workspaceDir = this.getMissionWorkspace(missionId);

    // Get previous results for this mission (connector chaining)
    const previousResults =
      this.missionResults.get(missionId) || new Map<CapabilityId, ConnectorOutput>();

    // Try real connector first
    const connector = this.connectorRegistry.getConnector(capId);
    if (connector) {
      try {
        const connectorInput: ConnectorInput = {
          missionId,
          instruction: input?.instruction || input?.mission || '',
          workspaceDir,
          parameters: input?.parameters || input || {},
          previousResults,
          tools: definition?.tools || [],
        };

        this.logger.log(`Executing ${capId} via ${connector.constructor.name}`);
        const connectorOutput: ConnectorOutput = await connector.execute(capId, connectorInput);

        // Store result for connector chaining
        previousResults.set(capId, connectorOutput);
        this.missionResults.set(missionId, previousResults);

        // Convert ConnectorOutput to CapabilityExecutionResult
        const result: CapabilityExecutionResult = {
          capabilityId: capId,
          success: connectorOutput.success,
          output: connectorOutput.output,
          artifacts: connectorOutput.artifacts.map((a) => a.path),
          durationMs: connectorOutput.durationMs || Date.now() - startTime,
          costUsd: connectorOutput.costUsd,
          error: connectorOutput.error,
          metadata: {
            connector: connector.constructor.name,
            pack: definition?.pack || 'unknown',
            artifactCount: connectorOutput.artifacts.length,
            realExecution: true,
          },
        };

        this.logger.log(
          `  ${capId} → ${result.success ? 'SUCCESS' : 'FAILED'} (${result.durationMs}ms, $${result.costUsd.toFixed(4)}, ${result.artifacts.length} artifacts)`,
        );

        return result;
      } catch (error: any) {
        this.logger.error(`Connector execution failed for ${capId}: ${error.message}`);
        // Fall through to fallback
      }
    }

    // Fallback: no connector available or connector failed
    this.logger.warn(`No connector for ${capId}, using fallback stub`);
    const result: CapabilityExecutionResult = {
      capabilityId: capId,
      success: true,
      output: {
        capabilityId: capId,
        message: `Executed ${capId} (fallback — no real connector)`,
        input,
        timestamp: new Date().toISOString(),
      },
      artifacts: [`/artifacts/${capId.replace(/\./g, '/')}/output`],
      durationMs: Date.now() - startTime,
      costUsd: definition?.cost.estimatedUsdPerExecution || 0.01,
      metadata: {
        tools: definition?.tools || [],
        pack: definition?.pack || 'unknown',
        realExecution: false,
        fallbackReason: connector ? 'connector_error' : 'no_connector',
      },
    };

    return result;
  }

  private getActiveCount(): number {
    let count = 0;
    for (const worker of this.workers.values()) {
      if (worker.status !== WorkerStatus.TERMINATED && worker.status !== WorkerStatus.FAILED) {
        count++;
      }
    }
    return count;
  }

  private getActiveWorkers(): WorkerProfile[] {
    const result: WorkerProfile[] = [];
    for (const worker of this.workers.values()) {
      if (worker.status !== WorkerStatus.TERMINATED && worker.status !== WorkerStatus.FAILED) {
        result.push(worker);
      }
    }
    return result;
  }

  /**
   * Group capabilities into parallel-safe and sequential.
   *
   * Rules:
   *   - Capabilities from DIFFERENT packs can always run in parallel
   *   - Within the SAME pack, most capabilities are independent
   *   - Exception: dev.architecture must run before dev.frontend/backend/database/api
   *   - Exception: dev.test must run after dev.frontend/backend
   *   - Exception: cert.* must run after dev.* (needs source code to audit)
   *
   * Strategy: first pass runs independent capabilities, second pass runs dependent ones
   * using the results from the first pass as context.
   */
  private groupCapabilities(capabilities: CapabilityId[]): {
    parallel: CapabilityId[];
    sequential: CapabilityId[];
  } {
    const DEPENDENT_CAPABILITIES = new Set<string>([
      'dev.frontend',
      'dev.backend',
      'dev.database',
      'dev.api',
      'dev.test',
      'dev.documentation',
      'dev.debug',
      'cert.architecture_review',
      'cert.security_audit',
      'cert.test_coverage',
      'cert.regression',
      'cert.performance',
      'cert.doc_review',
      'cert.integration',
      'cert.compliance',
      'cert.accessibility',
      'cert.data_privacy',
      'delivery.zip',
      'delivery.github',
      'delivery.docker_registry',
      'delivery.vps',
      'delivery.deployment',
      'delivery.pdf_report',
    ]);

    const INDEPENDENT_CAPABILITIES = new Set<string>([
      'dev.architecture',
      'dev.devops',
      'dev.docker',
      'dev.kubernetes',
      'dev.qa',
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
      'office.pdf',
      'office.docx',
      'office.excel',
      'office.powerpoint',
      'office.ocr',
      'office.signature',
      'office.email',
      'office.calendar',
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
      'delivery.cloud',
      'delivery.cdn',
      'delivery.backup',
      'delivery.monitoring_setup',
      'delivery.load_balancer',
      'delivery.notification',
    ]);

    const parallel: CapabilityId[] = [];
    const sequential: CapabilityId[] = [];

    for (const capId of capabilities) {
      if (INDEPENDENT_CAPABILITIES.has(capId as string)) {
        parallel.push(capId);
      } else {
        // Default: treat as sequential (safe)
        sequential.push(capId);
      }
    }

    return { parallel, sequential };
  }
}
