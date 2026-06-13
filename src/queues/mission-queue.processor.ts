/**
 * AENEWS Agent OS X - Mission Queue Processor
 *
 * Bull queue processor for asynchronous mission execution.
 * Missions are submitted to Redis queue and processed by workers
 * with concurrency control, retry logic, and progress tracking.
 *
 * Queue: "mission:queue"
 * Concurrency: 3 (configurable)
 * Retry: 2 attempts with exponential backoff
 */

import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MissionRuntimeEngine } from '../software-factory/runtime/mission-runtime.engine';
import { MissionMetricsService, MissionCategory } from '../software-factory/runtime/mission-metrics.service';
import { RealtimeGateway, RealtimeEventType } from '../realtime/realtime.gateway';
import { EventBusService } from '../agents/events/event-bus.service';
import { AgentEventType } from '../agents/interfaces/agent-event.interface';

// ─── Job Data ──────────────────────────────────────────────────────
export interface MissionJobData {
  missionId: string;
  instruction: string;
  description?: string;
  quality?: string;
  budgetMaxUsd?: number;
  deadline?: string;
  priority?: number;
  submittedBy?: string;
  tenantId?: string;
}

// ─── Job Result ────────────────────────────────────────────────────
export interface MissionJobResult {
  missionId: string;
  success: boolean;
  certified: boolean;
  qualityScore: number;
  totalDurationMs: number;
  totalCostUsd: number;
  artifactCount: number;
  errors: string[];
}

@Processor('mission:queue')
export class MissionQueueProcessor {
  private readonly logger = new Logger(MissionQueueProcessor.name);

  constructor(
    private readonly runtimeEngine: MissionRuntimeEngine,
    private readonly metricsService: MissionMetricsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly eventBus: EventBusService,
  ) {}

  @Process({ name: 'execute' })
  async processMission(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId, instruction, description, quality, budgetMaxUsd, deadline } = job.data;

    this.logger.log(`Processing mission ${missionId} (job ${job.id})`);

    // Report progress: starting
    await job.progress(5);
    this.realtimeGateway.pushMissionEvent(missionId, RealtimeEventType.MISSION_RUNNING, {
      phase: 'initializing',
      progress: 5,
      instruction: instruction.substring(0, 100),
    });

    try {
      // Execute the mission via Runtime Engine
      await job.progress(10);
      const result = await this.runtimeEngine.executeMission({
        instruction,
        description,
        quality: quality as any || 'standard',
        budgetMaxUsd,
        deadline: deadline ? new Date(deadline) : undefined,
      });

      // Track progress through execution
      await job.progress(80);

      // Record metrics
      this.metricsService.record({
        missionId,
        category: this.categorizeMission(instruction),
        instruction,
        success: result.success,
        certified: result.certified,
        qualityScore: result.qualityScore,
        durationMs: result.totalDurationMs,
        costUsd: result.totalCostUsd || 0,
        artifactCount: result.artifacts.length,
        totalSizeBytes: 0,
        retries: 0,
        errors: result.errors || [],
        phases: [],
      });

      await job.progress(100);

      // Push real-time completion event
      const eventType = result.success
        ? RealtimeEventType.MISSION_COMPLETED
        : RealtimeEventType.MISSION_FAILED;

      this.realtimeGateway.pushMissionEvent(missionId, eventType, {
        qualityScore: result.qualityScore,
        certified: result.certified,
        totalDurationMs: result.totalDurationMs,
        totalCostUsd: result.totalCostUsd,
        artifactCount: result.artifacts.length,
        errors: result.errors,
      });

      // Emit event bus event
      await this.eventBus.publish({
        type: result.success
          ? AgentEventType.ORCHESTRATION_COMPLETED
          : AgentEventType.ORCHESTRATION_FAILED,
        sourceAgentId: 'mission-queue-processor',
        payload: {
          missionId,
          success: result.success,
          certified: result.certified,
          qualityScore: result.qualityScore,
        },
        priority: result.success ? 1 : 2,
        correlationId: missionId,
        metadata: { jobId: job.id?.toString() },
      });

      return {
        missionId,
        success: result.success,
        certified: result.certified,
        qualityScore: result.qualityScore,
        totalDurationMs: result.totalDurationMs,
        totalCostUsd: result.totalCostUsd,
        artifactCount: result.artifacts.length,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`Mission ${missionId} failed: ${(error as Error).message}`);

      // Record failure
      this.metricsService.record({
        missionId,
        category: this.categorizeMission(instruction),
        instruction,
        success: false,
        certified: false,
        qualityScore: 0,
        durationMs: Date.now() - (job.timestamp || Date.now()),
        costUsd: 0,
        artifactCount: 0,
        totalSizeBytes: 0,
        retries: 0,
        errors: [(error as Error).message],
        phases: [],
      });

      // Push real-time failure event
      this.realtimeGateway.pushMissionEvent(missionId, RealtimeEventType.MISSION_FAILED, {
        error: (error as Error).message,
        phase: 'execution',
      });

      throw error; // Let Bull handle retry
    }
  }

  @OnQueueActive()
  onActive(job: Job<MissionJobData>): void {
    this.logger.log(`Mission job ${job.id} started for mission ${job.data.missionId}`);
    this.realtimeGateway.pushMissionEvent(
      job.data.missionId,
      RealtimeEventType.MISSION_RUNNING,
      { phase: 'queued', jobId: job.id },
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<MissionJobData>, result: MissionJobResult): void {
    this.logger.log(
      `Mission job ${job.id} completed: mission ${result.missionId} ` +
        `(score: ${result.qualityScore}, certified: ${result.certified})`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<MissionJobData>, error: Error): void {
    this.logger.error(
      `Mission job ${job.id} failed for mission ${job.data.missionId}: ${error.message}`,
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private categorizeMission(instruction: string): MissionCategory {
    const lower = instruction.toLowerCase();
    if (lower.includes('website') || lower.includes('web app') || lower.includes('frontend'))
      return MissionCategory.WEB_APP;
    if (lower.includes('scrape') || lower.includes('browse') || lower.includes('screenshot'))
      return MissionCategory.AUTOMATION;
    if (lower.includes('report') || lower.includes('document') || lower.includes('pdf'))
      return MissionCategory.DOCUMENT;
    if (lower.includes('market') || lower.includes('seo') || lower.includes('brand'))
      return MissionCategory.SAAS;
    if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci'))
      return MissionCategory.DEPLOYMENT;
    return MissionCategory.WEB_APP;
  }
}
