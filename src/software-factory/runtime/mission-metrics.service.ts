/**
 * AENEWS Software Factory — Mission Metrics Tracker
 *
 * KPI #1 = Mission Success Rate (MSR)
 *   MVP → 70%, Beta → 85%, Enterprise → 95%, Elite → 99%
 *
 * This service tracks every mission execution and provides:
 *   - MSR (Mission Success Rate)
 *   - Average duration, cost, quality score
 *   - Per-category breakdowns
 *   - Phase-level timing and success rates
 *   - Persisted metrics to disk (JSON)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────

export interface MissionMetric {
  missionId: string;
  instruction: string;
  category: MissionCategory;
  success: boolean;
  certified: boolean;
  qualityScore: number;
  artifactCount: number;
  totalSizeBytes: number;
  durationMs: number;
  costUsd: number;
  retries: number;
  errors: string[];
  phases: PhaseMetric[];
  timestamp: string;
}

export interface PhaseMetric {
  name: string;
  durationMs: number;
  success: boolean;
}

export enum MissionCategory {
  WEB_APP = 'web_app',
  LANDING_PAGE = 'landing_page',
  API = 'api',
  SAAS = 'saas',
  ECOMMERCE = 'ecommerce',
  AUTOMATION = 'automation',
  DOCUMENT = 'document',
  AUDIT = 'audit',
  DEPLOYMENT = 'deployment',
  CHATBOT = 'chatbot',
  PORTFOLIO = 'portfolio',
  TOOL = 'tool',
  OTHER = 'other',
}

export interface AggregateMetrics {
  totalMissions: number;
  successes: number;
  certified: number;
  msr: number; // Mission Success Rate (0-1)
  certificationRate: number; // (0-1)
  avgDurationMs: number;
  avgCostUsd: number;
  avgQualityScore: number;
  totalRetries: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  byCategory: Record<string, CategoryMetrics>;
  recentTrend: TrendMetrics;
  targetMsr: number;
  msrGap: number; // targetMsr - msr
}

export interface CategoryMetrics {
  total: number;
  successes: number;
  certified: number;
  msr: number;
  avgDurationMs: number;
  avgCostUsd: number;
  avgQualityScore: number;
}

export interface TrendMetrics {
  last10Msr: number;
  last25Msr: number;
  last50Msr: number;
  improving: boolean;
}

export interface MsrTarget {
  label: string;
  target: number;
}

export const MSR_TARGETS: MsrTarget[] = [
  { label: 'MVP', target: 0.7 },
  { label: 'Beta', target: 0.85 },
  { label: 'Enterprise', target: 0.95 },
  { label: 'Elite', target: 0.99 },
];

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class MissionMetricsService {
  private readonly logger = new Logger(MissionMetricsService.name);
  private readonly metrics: MissionMetric[] = [];
  private readonly metricsFile: string;
  private loaded = false;

  constructor() {
    const metricsDir = '/home/z/my-project/download/missions/metrics';
    fs.mkdirSync(metricsDir, { recursive: true });
    this.metricsFile = path.join(metricsDir, 'mission-metrics.json');
    this.loadFromDisk();
  }

  // ═══════════════════════════════════════════════════════════
  //  RECORD — Track a mission result
  // ═══════════════════════════════════════════════════════════

  record(metric: Omit<MissionMetric, 'timestamp'>): void {
    const fullMetric: MissionMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
    };
    this.metrics.push(fullMetric);
    this.persistToDisk();

    this.logger.log(
      `Metrics recorded: ${metric.missionId} — ` +
        `${metric.success ? 'SUCCESS' : 'FAILED'} — ` +
        `Score: ${metric.qualityScore} — ` +
        `${metric.durationMs}ms — $${metric.costUsd.toFixed(3)} — ` +
        `MSR: ${(this.getMSR() * 100).toFixed(1)}%`,
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  MSR — Mission Success Rate (THE KPI)
  // ═══════════════════════════════════════════════════════════

  getMSR(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.filter((m) => m.success).length / this.metrics.length;
  }

  getCertificationRate(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.filter((m) => m.certified).length / this.metrics.length;
  }

  getCurrentMsrTarget(): MsrTarget {
    const msr = this.getMSR();
    for (const target of MSR_TARGETS) {
      if (msr < target.target) return target;
    }
    return MSR_TARGETS[MSR_TARGETS.length - 1];
  }

  // ═══════════════════════════════════════════════════════════
  //  AGGREGATE — Full metrics dashboard
  // ═══════════════════════════════════════════════════════════

  getAggregate(): AggregateMetrics {
    const total = this.metrics.length;
    const successes = this.metrics.filter((m) => m.success).length;
    const certified = this.metrics.filter((m) => m.certified).length;

    const durations = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
    const p95 =
      durations.length > 0
        ? durations[Math.min(Math.floor(durations.length * 0.95), durations.length - 1)]
        : 0;
    const p99 =
      durations.length > 0
        ? durations[Math.min(Math.floor(durations.length * 0.99), durations.length - 1)]
        : 0;

    const target = this.getCurrentMsrTarget();

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
      p50DurationMs: p50,
      p95DurationMs: p95,
      p99DurationMs: p99,
      byCategory: this.getCategoryBreakdown(),
      recentTrend: this.getTrend(),
      targetMsr: target.target,
      msrGap: target.target - (total > 0 ? successes / total : 0),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  CATEGORY BREAKDOWN
  // ═══════════════════════════════════════════════════════════

  private getCategoryBreakdown(): Record<string, CategoryMetrics> {
    const categories: Record<string, { metrics: MissionMetric[] }> = {};

    for (const metric of this.metrics) {
      if (!categories[metric.category]) {
        categories[metric.category] = { metrics: [] };
      }
      categories[metric.category].metrics.push(metric);
    }

    const result: Record<string, CategoryMetrics> = {};
    for (const [cat, data] of Object.entries(categories)) {
      const m = data.metrics;
      result[cat] = {
        total: m.length,
        successes: m.filter((x) => x.success).length,
        certified: m.filter((x) => x.certified).length,
        msr: m.length > 0 ? m.filter((x) => x.success).length / m.length : 0,
        avgDurationMs:
          m.length > 0 ? Math.round(m.reduce((s, x) => s + x.durationMs, 0) / m.length) : 0,
        avgCostUsd: m.length > 0 ? m.reduce((s, x) => s + x.costUsd, 0) / m.length : 0,
        avgQualityScore: m.length > 0 ? m.reduce((s, x) => s + x.qualityScore, 0) / m.length : 0,
      };
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  //  TREND — Recent performance trend
  // ═══════════════════════════════════════════════════════════

  private getTrend(): TrendMetrics {
    const last10 = this.metrics.slice(-10);
    const last25 = this.metrics.slice(-25);
    const last50 = this.metrics.slice(-50);

    const msr10 = last10.length > 0 ? last10.filter((m) => m.success).length / last10.length : 0;
    const msr25 = last25.length > 0 ? last25.filter((m) => m.success).length / last25.length : 0;
    const msr50 = last50.length > 0 ? last50.filter((m) => m.success).length / last50.length : 0;

    // Improving if recent window (10) is better than older window (25-50)
    const improving = last10.length >= 5 && msr10 >= msr50;

    return { last10Msr: msr10, last25Msr: msr25, last50Msr: msr50, improving };
  }

  // ═══════════════════════════════════════════════════════════
  //  QUERY — Search/filter metrics
  // ═══════════════════════════════════════════════════════════

  getRecent(count: number = 20): MissionMetric[] {
    return this.metrics.slice(-count);
  }

  getByCategory(category: MissionCategory): MissionMetric[] {
    return this.metrics.filter((m) => m.category === category);
  }

  getFailures(): MissionMetric[] {
    return this.metrics.filter((m) => !m.success);
  }

  getSlowest(count: number = 10): MissionMetric[] {
    return [...this.metrics].sort((a, b) => b.durationMs - a.durationMs).slice(0, count);
  }

  getLowestQuality(count: number = 10): MissionMetric[] {
    return [...this.metrics].sort((a, b) => a.qualityScore - b.qualityScore).slice(0, count);
  }

  getTotalCount(): number {
    return this.metrics.length;
  }

  getAllMetrics(): MissionMetric[] {
    return [...this.metrics];
  }

  // ═══════════════════════════════════════════════════════════
  //  PERSISTENCE — Save/load metrics to disk
  // ═══════════════════════════════════════════════════════════

  private persistToDisk(): void {
    try {
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.warn(`Failed to persist metrics: ${err.message}`);
    }
  }

  private loadFromDisk(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.metrics.push(...parsed);
          this.logger.log(`Loaded ${parsed.length} historical metrics from disk`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to load metrics from disk: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CLASSIFY — Determine mission category from instruction
  // ═══════════════════════════════════════════════════════════

  static classifyMission(instruction: string): MissionCategory {
    const lower = instruction.toLowerCase();

    // E-commerce
    if (
      lower.includes('e-commerce') ||
      lower.includes('boutique') ||
      lower.includes('shop') ||
      lower.includes('store')
    ) {
      return MissionCategory.ECOMMERCE;
    }

    // SaaS
    if (
      lower.includes('saas') ||
      lower.includes('subscription') ||
      lower.includes('rh') ||
      lower.includes('scolaire') ||
      lower.includes('crm') ||
      lower.includes('erp')
    ) {
      return MissionCategory.SAAS;
    }

    // Landing page
    if (
      lower.includes('landing') ||
      lower.includes('page') ||
      lower.includes('portfolio') ||
      lower.includes('cv') ||
      lower.includes('vitrine')
    ) {
      return MissionCategory.LANDING_PAGE;
    }

    // Portfolio
    if (
      lower.includes('portfolio') ||
      lower.includes('cv') ||
      lower.includes('resume') ||
      lower.includes('personal site')
    ) {
      return MissionCategory.PORTFOLIO;
    }

    // API
    if (
      lower.includes('api') ||
      lower.includes('rest') ||
      lower.includes('graphql') ||
      lower.includes('endpoint') ||
      lower.includes('microservice')
    ) {
      return MissionCategory.API;
    }

    // Chatbot
    if (
      lower.includes('chatbot') ||
      lower.includes('chat') ||
      lower.includes('bot') ||
      lower.includes('assistant')
    ) {
      return MissionCategory.CHATBOT;
    }

    // Automation
    if (
      lower.includes('automat') ||
      lower.includes('scraper') ||
      lower.includes('crawler') ||
      lower.includes('pipeline')
    ) {
      return MissionCategory.AUTOMATION;
    }

    // Audit
    if (
      lower.includes('audit') ||
      lower.includes('seo') ||
      lower.includes('analyz') ||
      lower.includes('report') ||
      lower.includes('scan')
    ) {
      return MissionCategory.AUDIT;
    }

    // Deployment
    if (
      lower.includes('deploy') ||
      lower.includes('docker') ||
      lower.includes('vps') ||
      lower.includes('infra') ||
      lower.includes('ci/cd')
    ) {
      return MissionCategory.DEPLOYMENT;
    }

    // Document
    if (
      lower.includes('document') ||
      lower.includes('pdf') ||
      lower.includes('ppt') ||
      lower.includes('readme') ||
      lower.includes('doc')
    ) {
      return MissionCategory.DOCUMENT;
    }

    // Web app (catch-all for app-like)
    if (
      lower.includes('app') ||
      lower.includes('application') ||
      lower.includes('todo') ||
      lower.includes('list') ||
      lower.includes('manager') ||
      lower.includes('dashboard')
    ) {
      return MissionCategory.WEB_APP;
    }

    // Tool
    if (
      lower.includes('tool') ||
      lower.includes('cli') ||
      lower.includes('script') ||
      lower.includes('generator') ||
      lower.includes('converter')
    ) {
      return MissionCategory.TOOL;
    }

    return MissionCategory.OTHER;
  }
}
