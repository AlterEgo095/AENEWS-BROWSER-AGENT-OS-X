/**
 * AENEWS Software Factory — Worker Factory
 * 
 * Creates ephemeral workers, injects capabilities, then destroys them.
 * This is NOT an agent registry. Workers are temporary execution units.
 * 
 * Example:
 *   Mission: "Develop an ERP"
 *   Planner produces: [architecture, frontend, backend, database, docker, test, doc, deploy]
 *   Worker Factory creates:
 *     Worker #1: [architecture, frontend]
 *     Worker #2: [backend, database]
 *     Worker #3: [docker, deploy]
 *     Worker #4: [test, documentation]
 *   Then destruction.
 */

import { Injectable, Logger } from '@nestjs/common';
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
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkerFactoryService {
  private readonly logger = new Logger(WorkerFactoryService.name);
  private readonly workers = new Map<string, WorkerProfile>();
  private readonly archive: WorkerProfile[] = [];

  private constraints: WorkerPoolConstraints = { ...DEFAULT_WORKER_CONSTRAINTS };

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

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
  async terminateMissionWorkers(missionId: string, reason: WorkerTerminateRequest['reason']): Promise<WorkerTerminateResult[]> {
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
      // Execute each capability in the worker
      const results: CapabilityExecutionResult[] = [];
      for (const capId of worker.capabilities) {
        const capDef = this.capabilityRegistry.getCapability(capId);
        const capResult: CapabilityExecutionResult = await this.executeCapability(capId, capDef, execRequest.input);
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
        this.terminate({ workerId: execRequest.workerId, reason: 'mission_complete', archiveResults: true });
      }

      const allArtifacts = results.flatMap(r => r.artifacts);
      const anyFailed = results.some(r => !r.success);

      return {
        workerId: execRequest.workerId,
        nodeId: execRequest.nodeId,
        success: !anyFailed,
        output: results.map(r => r.output),
        artifacts: allArtifacts,
        durationMs: totalDuration,
        costUsd: totalCost,
        error: anyFailed ? results.find(r => !r.success)?.error : undefined,
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
    const missionIds = new Set(allWorkers.map(w => w.missionId));

    return {
      totalSpawned: this.archive.length + active.length,
      totalTerminated: this.archive.length,
      currentlyActive: active.length,
      byCapability,
      totalCostUsd: [...active, ...this.archive].reduce((sum, w) => sum + w.totalCostUsd, 0),
      averageLifetimeMs: allWorkers.length > 0 ? totalLifetime / allWorkers.length : 0,
      averageTasksPerWorker: allWorkers.length > 0
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

  // ─── Private Helpers ────────────────────────────────────────

  private async initializeWorker(worker: WorkerProfile): Promise<void> {
    // In a real implementation, this would:
    // 1. Allocate compute resources
    // 2. Inject capability tools and permissions
    // 3. Set up execution sandbox
    // Currently simulated as instant readiness
    worker.status = WorkerStatus.READY;
    this.workers.set(worker.id, worker);
  }

  private async executeCapability(
    capId: CapabilityId,
    definition: CapabilityDefinition | undefined,
    input: any,
  ): Promise<CapabilityExecutionResult> {
    const startTime = Date.now();

    // Simulated execution — in real implementation, this would invoke the actual tool
    const result: CapabilityExecutionResult = {
      capabilityId: capId,
      success: true,
      output: {
        capabilityId: capId,
        message: `Executed ${capId}`,
        input,
        timestamp: new Date().toISOString(),
      },
      artifacts: [`/artifacts/${capId.replace(/\./g, '/')}/output`],
      durationMs: Date.now() - startTime,
      costUsd: definition?.cost.estimatedUsdPerExecution || 0.01,
      metadata: {
        tools: definition?.tools || [],
        pack: definition?.pack || 'unknown',
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
}
