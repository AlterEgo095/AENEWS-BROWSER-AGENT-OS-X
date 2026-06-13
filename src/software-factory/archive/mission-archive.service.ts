/**
 * AENEWS Software Factory — Mission Archive Service
 *
 * Archives completed missions for reproducibility and improvement.
 * Stores: execution trace, timeline, contract, results, agent stats.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface ArchivedMission {
  id: string;
  missionId: string;
  archivedAt: Date;
  execution: any;
  timeline: any;
  contract: any;
  memory: any;
  agentStats: any;
  summary: ArchiveSummary;
}

export interface ArchiveSummary {
  objective: string;
  result: 'success' | 'partial' | 'failed';
  qualityScore: number;
  totalDurationMs: number;
  totalCostUsd: number;
  artifactsDelivered: number;
  certificationPassed: boolean;
  lessonsLearned: string[];
}

@Injectable()
export class MissionArchiveService {
  private readonly logger = new Logger(MissionArchiveService.name);
  private readonly archives = new Map<string, ArchivedMission>();

  /**
   * Archive a completed mission
   */
  async archive(
    missionId: string,
    data: {
      execution: any;
      timeline: any;
      contract: any;
      memory: any;
      agentStats: any;
    },
  ): Promise<ArchivedMission> {
    this.logger.log(`Archiving mission ${missionId}`);

    const execution = data.execution;
    const contract = data.contract;
    const certification = data.memory?.entries?.find(
      (e: any) => e.category === 'certification',
    )?.data;

    const lessonsLearned: string[] = [];

    if (execution?.errors?.length > 0) {
      lessonsLearned.push(`Errors encountered: ${execution.errors.join(', ')}`);
    }
    if (certification?.qualityScore && certification.qualityScore < 80) {
      lessonsLearned.push('Quality score below 80% — improve testing coverage');
    }
    if (contract?.budget?.currentSpendUsd > contract?.budget?.maxApiCostUsd * 0.8) {
      lessonsLearned.push('Budget utilization above 80% — consider optimization');
    }

    if (lessonsLearned.length === 0) {
      lessonsLearned.push('Mission executed smoothly with no major issues');
    }

    const summary: ArchiveSummary = {
      objective: contract?.mission || 'Unknown',
      result: execution?.errors?.length > 0 ? 'partial' : 'success',
      qualityScore: certification?.qualityScore || 0,
      totalDurationMs: data.timeline?.totalDuration || 0,
      totalCostUsd: contract?.budget?.currentSpendUsd || 0,
      artifactsDelivered: execution?.artifacts?.length || 0,
      certificationPassed: certification?.certified || false,
      lessonsLearned,
    };

    const archive: ArchivedMission = {
      id: `archive-${uuidv4().slice(0, 8)}`,
      missionId,
      archivedAt: new Date(),
      execution: data.execution,
      timeline: data.timeline,
      contract: data.contract,
      memory: data.memory,
      agentStats: data.agentStats,
      summary,
    };

    this.archives.set(missionId, archive);
    this.logger.log(
      `Mission ${missionId} archived: ${summary.result} (quality: ${summary.qualityScore}, cost: $${summary.totalCostUsd.toFixed(2)})`,
    );
    return archive;
  }

  /**
   * Get archived mission
   */
  getArchive(missionId: string): ArchivedMission | undefined {
    return this.archives.get(missionId);
  }

  /**
   * List all archived missions
   */
  listArchives(): ArchivedMission[] {
    return Array.from(this.archives.values());
  }

  /**
   * Search archives by criteria
   */
  searchArchives(criteria: {
    result?: 'success' | 'partial' | 'failed';
    minQuality?: number;
    maxCost?: number;
    since?: Date;
  }): ArchivedMission[] {
    return Array.from(this.archives.values()).filter((archive) => {
      if (criteria.result && archive.summary.result !== criteria.result) return false;
      if (criteria.minQuality && archive.summary.qualityScore < criteria.minQuality) return false;
      if (criteria.maxCost && archive.summary.totalCostUsd > criteria.maxCost) return false;
      if (criteria.since && archive.archivedAt < criteria.since) return false;
      return true;
    });
  }

  /**
   * Get statistics across all archived missions
   */
  getStatistics(): {
    totalMissions: number;
    successRate: number;
    averageQualityScore: number;
    averageCost: number;
    averageDurationMs: number;
  } {
    const archives = Array.from(this.archives.values());
    if (archives.length === 0) {
      return {
        totalMissions: 0,
        successRate: 0,
        averageQualityScore: 0,
        averageCost: 0,
        averageDurationMs: 0,
      };
    }

    const successCount = archives.filter((a) => a.summary.result === 'success').length;
    const totalQuality = archives.reduce((sum, a) => sum + a.summary.qualityScore, 0);
    const totalCost = archives.reduce((sum, a) => sum + a.summary.totalCostUsd, 0);
    const totalDuration = archives.reduce((sum, a) => sum + a.summary.totalDurationMs, 0);

    return {
      totalMissions: archives.length,
      successRate: (successCount / archives.length) * 100,
      averageQualityScore: totalQuality / archives.length,
      averageCost: totalCost / archives.length,
      averageDurationMs: totalDuration / archives.length,
    };
  }
}
