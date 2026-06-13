/**
 * AENEWS Software Factory — Mission Memory Service
 * 
 * Simplified memory: Context + RAG + Archive
 * Stores mission state, plans, results for the duration of execution.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface MissionContext {
  instruction: string;
  contractId: string;
  quality: string;
  budget: number;
  deadline: Date;
  [key: string]: any;
}

export interface MemoryEntry {
  id: string;
  missionId: string;
  category: 'context' | 'plan' | 'research' | 'build' | 'test' | 'audit' | 'certification' | 'delivery';
  key: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MissionMemoryService {
  private readonly logger = new Logger(MissionMemoryService.name);
  private readonly contexts = new Map<string, MissionContext>();
  private readonly entries = new Map<string, MemoryEntry[]>();

  /**
   * Store mission context
   */
  storeContext(missionId: string, context: MissionContext): void {
    this.contexts.set(missionId, context);
    this.addEntry(missionId, 'context', 'mission_context', context);
    this.logger.log(`Context stored for mission ${missionId}`);
  }

  /**
   * Get mission context
   */
  getContext(missionId: string): MissionContext | undefined {
    return this.contexts.get(missionId);
  }

  /**
   * Store execution plan
   */
  storePlan(missionId: string, plan: any): void {
    this.addEntry(missionId, 'plan', 'execution_plan', plan);
    this.logger.log(`Plan stored for mission ${missionId}`);
  }

  /**
   * Get execution plan
   */
  getPlan(missionId: string): any {
    return this.getLatestEntry(missionId, 'plan', 'execution_plan');
  }

  /**
   * Store research results
   */
  storeResearch(missionId: string, research: any): void {
    this.addEntry(missionId, 'research', 'research_results', research);
    this.logger.log(`Research stored for mission ${missionId}`);
  }

  /**
   * Get research results
   */
  getResearch(missionId: string): any {
    return this.getLatestEntry(missionId, 'research', 'research_results');
  }

  /**
   * Store build results
   */
  storeBuildResults(missionId: string, results: any): void {
    this.addEntry(missionId, 'build', 'build_results', results);
    this.logger.log(`Build results stored for mission ${missionId}`);
  }

  /**
   * Get build results
   */
  getBuildResults(missionId: string): any {
    return this.getLatestEntry(missionId, 'build', 'build_results');
  }

  /**
   * Store test results
   */
  storeTestResults(missionId: string, results: any): void {
    this.addEntry(missionId, 'test', 'test_results', results);
    this.logger.log(`Test results stored for mission ${missionId}`);
  }

  /**
   * Get test results
   */
  getTestResults(missionId: string): any {
    return this.getLatestEntry(missionId, 'test', 'test_results');
  }

  /**
   * Store audit results
   */
  storeAuditResults(missionId: string, results: any): void {
    this.addEntry(missionId, 'audit', 'audit_results', results);
    this.logger.log(`Audit results stored for mission ${missionId}`);
  }

  /**
   * Get audit results
   */
  getAuditResults(missionId: string): any {
    return this.getLatestEntry(missionId, 'audit', 'audit_results');
  }

  /**
   * Store certification results
   */
  storeCertification(missionId: string, results: any): void {
    this.addEntry(missionId, 'certification', 'certification_results', results);
    this.logger.log(`Certification stored for mission ${missionId}`);
  }

  /**
   * Get certification results
   */
  getCertification(missionId: string): any {
    return this.getLatestEntry(missionId, 'certification', 'certification_results');
  }

  /**
   * Get all results for a mission (aggregated)
   */
  getAllResults(missionId: string): Record<string, any> {
    const results: Record<string, any> = {};
    const missionEntries = this.entries.get(missionId) || [];

    for (const entry of missionEntries) {
      results[entry.category] = entry.data;
    }

    return results;
  }

  /**
   * Export all memory for a mission (for archiving)
   */
  exportMission(missionId: string): {
    context: MissionContext | undefined;
    entries: MemoryEntry[];
  } {
    return {
      context: this.contexts.get(missionId),
      entries: this.entries.get(missionId) || [],
    };
  }

  /**
   * Clear memory for a mission (after archiving)
   */
  clearMission(missionId: string): void {
    this.contexts.delete(missionId);
    this.entries.delete(missionId);
    this.logger.log(`Memory cleared for mission ${missionId}`);
  }

  // --- Private helpers ---

  private addEntry(missionId: string, category: MemoryEntry['category'], key: string, data: any): void {
    const entry: MemoryEntry = {
      id: `mem-${uuidv4().slice(0, 8)}`,
      missionId,
      category,
      key,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const missionEntries = this.entries.get(missionId) || [];
    missionEntries.push(entry);
    this.entries.set(missionId, missionEntries);
  }

  private getLatestEntry(missionId: string, category: string, key: string): any {
    const missionEntries = this.entries.get(missionId) || [];
    const matching = missionEntries.filter(e => e.category === category && e.key === key);
    return matching.length > 0 ? matching[matching.length - 1].data : undefined;
  }
}
