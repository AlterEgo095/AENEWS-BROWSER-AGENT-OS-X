/**
 * AENEWS Agent OS X — Threat Intelligence Service
 *
 * Tracks and analyzes suspicious IP addresses, patterns, and behaviors
 * for proactive threat detection and blocking.
 *
 * Features:
 *   - IP reputation scoring (0-100)
 *   - Behavioral anomaly detection
 *   - Automatic suspicious IP tracking
 *   - Threat feed integration (placeholder)
 *   - Geo-location based risk assessment
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityMetricsService } from './security-metrics.service';
import { EventService } from '../../event/event.service';

export interface IpReputation {
  ip: string;
  score: number;          // 0 = trusted, 100 = malicious
  flags: ThreatFlag[];
  firstSeen: number;      // epoch ms
  lastSeen: number;       // epoch ms
  requestCount: number;
  blockedCount: number;
  threatCount: number;
  autoBlocked: boolean;
}

export enum ThreatFlag {
  BRUTE_FORCE = 'brute_force',
  SCANNING = 'scanning',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  PROMPT_INJECTION = 'prompt_injection',
  PATH_TRAVERSAL = 'path_traversal',
  RATE_LIMIT_ABUSE = 'rate_limit_abuse',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  DDoS_PARTICIPANT = 'ddos_participant',
  SUSPICIOUS_GEO = 'suspicious_geo',
}

export interface ThreatAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  ip: string;
  timestamp: number;
  evidence: Record<string, any>;
  acknowledged: boolean;
}

@Injectable()
export class ThreatIntelligenceService {
  private readonly logger = new Logger(ThreatIntelligenceService.name);

  private readonly ipReputations: Map<string, IpReputation> = new Map();
  private readonly recentAlerts: ThreatAlert[] = [];
  private readonly maxAlerts = 1000;

  private readonly thresholds: {
    autoBlockScore: number;          // Score threshold for auto-blocking (default: 80)
    bruteForceThreshold: number;     // Failed auth attempts before flagging
    scanningThreshold: number;       // 404s before flagging as scanning
    rateAbuseThreshold: number;      // Rate limit hits before flagging
  };

  /** Request tracking per IP for pattern detection */
  private readonly ipRequestTracker: Map<string, {
    authFailures: number;
    notFoundErrors: number;
    rateLimitHits: number;
    threatDetections: number;
    windowStart: number;
  }> = new Map();

  private readonly trackingWindowMs: number;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly securityMetrics?: SecurityMetricsService,
    @Optional() private readonly eventService?: EventService,
  ) {
    this.thresholds = {
      autoBlockScore: this.configService?.get<number>('security.threat.autoBlockScore') ?? 80,
      bruteForceThreshold: this.configService?.get<number>('security.threat.bruteForceThreshold') ?? 10,
      scanningThreshold: this.configService?.get<number>('security.threat.scanningThreshold') ?? 20,
      rateAbuseThreshold: this.configService?.get<number>('security.threat.rateAbuseThreshold') ?? 5,
    };

    this.trackingWindowMs = (this.configService?.get<number>('security.threat.trackingWindowMin') ?? 15) * 60 * 1000;

    this.logger.log(`ThreatIntelligenceService initialized: autoBlock=${this.thresholds.autoBlockScore}, bruteForce=${this.thresholds.bruteForceThreshold}`);
  }

  /**
   * Record an event for an IP and update its reputation.
   */
  async recordIpEvent(ip: string, eventType: 'auth_failure' | 'not_found' | 'rate_limit' | 'threat' | 'blocked_request'): Promise<IpReputation> {
    const tracker = this.getOrCreateTracker(ip);
    const now = Date.now();

    // Reset window if expired
    if (now - tracker.windowStart > this.trackingWindowMs) {
      tracker.authFailures = 0;
      tracker.notFoundErrors = 0;
      tracker.rateLimitHits = 0;
      tracker.threatDetections = 0;
      tracker.windowStart = now;
    }

    // Update counters
    switch (eventType) {
      case 'auth_failure': tracker.authFailures++; break;
      case 'not_found': tracker.notFoundErrors++; break;
      case 'rate_limit': tracker.rateLimitHits++; break;
      case 'threat': tracker.threatDetections++; break;
      case 'blocked_request': tracker.threatDetections++; break;
    }

    // Update reputation
    let reputation = this.getOrCreateReputation(ip);
    reputation.lastSeen = now;
    reputation.requestCount++;
    reputation.score = this.calculateReputationScore(tracker, reputation);

    // Check for threat flags
    if (tracker.authFailures >= this.thresholds.bruteForceThreshold) {
      await this.addFlag(ip, ThreatFlag.BRUTE_FORCE);
    }
    if (tracker.notFoundErrors >= this.thresholds.scanningThreshold) {
      await this.addFlag(ip, ThreatFlag.SCANNING);
    }
    if (tracker.rateLimitHits >= this.thresholds.rateAbuseThreshold) {
      await this.addFlag(ip, ThreatFlag.RATE_LIMIT_ABUSE);
    }

    // Check for credential stuffing (many auth failures from same IP)
    if (tracker.authFailures >= this.thresholds.bruteForceThreshold * 2) {
      await this.addFlag(ip, ThreatFlag.CREDENTIAL_STUFFING);
    }

    // Auto-block if score too high
    if (reputation.score >= this.thresholds.autoBlockScore && !reputation.autoBlocked) {
      reputation.autoBlocked = true;
      this.logger.error(`AUTO-BLOCKED IP ${ip}: reputation score ${reputation.score}`);

      await this.createAlert('critical', 'ip_auto_blocked', `IP ${ip} auto-blocked with score ${reputation.score}`, ip, {
        score: reputation.score,
        flags: reputation.flags,
        tracker: { ...tracker },
      });
    }

    this.ipReputations.set(ip, reputation);

    // Update metrics
    if (this.securityMetrics) {
      this.securityMetrics.setSuspiciousIpCount(
        Array.from(this.ipReputations.values()).filter((r) => r.score >= 50).length,
      );
    }

    return reputation;
  }

  /**
   * Add a threat flag to an IP.
   */
  async addFlag(ip: string, flag: ThreatFlag): Promise<void> {
    const reputation = this.getOrCreateReputation(ip);
    if (!reputation.flags.includes(flag)) {
      reputation.flags.push(flag);
      this.ipReputations.set(ip, reputation);

      await this.createAlert(
        flag === ThreatFlag.BRUTE_FORCE || flag === ThreatFlag.CREDENTIAL_STUFFING ? 'high' : 'medium',
        flag,
        `IP ${ip} flagged: ${flag}`,
        ip,
        { existingFlags: reputation.flags },
      );
    }
  }

  /**
   * Check if an IP is blocked.
   */
  isIpBlocked(ip: string): boolean {
    const reputation = this.ipReputations.get(ip);
    if (!reputation) return false;
    return reputation.autoBlocked || reputation.score >= this.thresholds.autoBlockScore;
  }

  /**
   * Get the reputation score for an IP.
   */
  getIpReputation(ip: string): IpReputation | null {
    return this.ipReputations.get(ip) || null;
  }

  /**
   * Manually block/unblock an IP.
   */
  async setIpBlocked(ip: string, blocked: boolean, adminId: string): Promise<void> {
    const reputation = this.getOrCreateReputation(ip);
    reputation.autoBlocked = blocked;
    if (blocked) {
      reputation.score = 100;
    } else {
      reputation.score = 0;
      reputation.flags = [];
    }
    this.ipReputations.set(ip, reputation);

    this.logger.log(`IP ${ip} ${blocked ? 'BLOCKED' : 'UNBLOCKED'} by admin ${adminId}`);
  }

  /**
   * Get recent threat alerts.
   */
  getAlerts(limit?: number, severity?: string): ThreatAlert[] {
    let alerts = [...this.recentAlerts].reverse();
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    return alerts.slice(0, limit ?? 100);
  }

  /**
   * Acknowledge an alert.
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.recentAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get all tracked IPs with their reputations.
   */
  getAllReputations(): IpReputation[] {
    return Array.from(this.ipReputations.values());
  }

  /**
   * Clean up old tracking data.
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    // Clean up expired trackers
    for (const [ip, tracker] of this.ipRequestTracker.entries()) {
      if (now - tracker.windowStart > this.trackingWindowMs * 2) {
        this.ipRequestTracker.delete(ip);
        cleaned++;
      }
    }

    // Decay reputation scores for IPs not seen recently
    for (const [ip, rep] of this.ipReputations.entries()) {
      if (now - rep.lastSeen > 24 * 60 * 60 * 1000) {
        rep.score = Math.max(0, rep.score - 5);
        rep.flags = rep.flags.length > 0 ? rep.flags.slice(0, -1) : [];
        if (rep.score === 0 && rep.flags.length === 0) {
          this.ipReputations.delete(ip);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // ─── Private Methods ──────────────────────────────────────────

  private getOrCreateTracker(ip: string) {
    let tracker = this.ipRequestTracker.get(ip);
    if (!tracker) {
      tracker = {
        authFailures: 0,
        notFoundErrors: 0,
        rateLimitHits: 0,
        threatDetections: 0,
        windowStart: Date.now(),
      };
      this.ipRequestTracker.set(ip, tracker);
    }
    return tracker;
  }

  private getOrCreateReputation(ip: string): IpReputation {
    let reputation = this.ipReputations.get(ip);
    if (!reputation) {
      reputation = {
        ip,
        score: 0,
        flags: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        requestCount: 0,
        blockedCount: 0,
        threatCount: 0,
        autoBlocked: false,
      };
      this.ipReputations.set(ip, reputation);
    }
    return reputation;
  }

  private calculateReputationScore(
    tracker: { authFailures: number; notFoundErrors: number; rateLimitHits: number; threatDetections: number },
    reputation: IpReputation,
  ): number {
    let score = 0;

    // Auth failures contribute heavily
    score += Math.min(tracker.authFailures * 8, 40);

    // 404 scanning
    score += Math.min(tracker.notFoundErrors * 3, 20);

    // Rate limit abuse
    score += Math.min(tracker.rateLimitHits * 5, 20);

    // Direct threat detections
    score += Math.min(tracker.threatDetections * 10, 30);

    // Previous flags add weight
    score += reputation.flags.length * 5;

    return Math.min(100, score);
  }

  private async createAlert(
    severity: ThreatAlert['severity'],
    type: string,
    description: string,
    ip: string,
    evidence: Record<string, any>,
  ): Promise<void> {
    const alert: ThreatAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      severity,
      type,
      description,
      ip,
      timestamp: Date.now(),
      evidence,
      acknowledged: false,
    };

    this.recentAlerts.push(alert);

    // Keep only the last maxAlerts
    if (this.recentAlerts.length > this.maxAlerts) {
      this.recentAlerts.splice(0, this.recentAlerts.length - this.maxAlerts);
    }

    // Emit event for external alerting (Slack, PagerDuty, etc.)
    if (this.eventService) {
      try {
        await this.eventService.emit({
          type: 'security.threat_alert',
          namespace: 'security',
          payload: alert,
          source: 'ThreatIntelligenceService',
        });
      } catch {
        // Don't let event emission failures block the security flow
      }
    }
  }
}
