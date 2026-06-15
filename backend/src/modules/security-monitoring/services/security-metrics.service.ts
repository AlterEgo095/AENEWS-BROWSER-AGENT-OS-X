/**
 * AENEWS Agent OS X — Security Metrics Service
 *
 * Extends the base MetricsService with security-specific Prometheus metrics:
 *
 *   - aenews_security_blocked_requests_total
 *   - aenews_security_threat_detections_total (by type, severity)
 *   - aenews_security_auth_failures_total (by reason)
 *   - aenews_security_auth_success_total
 *   - aenews_security_circuit_breaker_state (by circuit)
 *   - aenews_security_token_rotations_total
 *   - aenews_security_account_lockouts_total
 *   - aenews_security_risk_score_histogram
 *   - aenews_security_input_sanitized_total
 *   - aenews_security_suspicious_ips_tracked
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import * as promClient from 'prom-client';
import { MetricsService } from '../../observability/services/metrics.service';

const PREFIX = 'aenews_security_';

@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);

  // ─── Counters ────────────────────────────────────────────────
  private readonly blockedRequestsTotal: promClient.Counter;
  private readonly threatDetectionsTotal: promClient.Counter;
  private readonly authFailuresTotal: promClient.Counter;
  private readonly authSuccessTotal: promClient.Counter;
  private readonly tokenRotationsTotal: promClient.Counter;
  private readonly accountLockoutsTotal: promClient.Counter;
  private readonly inputSanitizedTotal: promClient.Counter;

  // ─── Histograms ──────────────────────────────────────────────
  private readonly riskScoreHistogram: promClient.Histogram;

  // ─── Gauges ──────────────────────────────────────────────────
  private readonly circuitBreakerState: promClient.Gauge;
  private readonly suspiciousIpsTracked: promClient.Gauge;

  constructor(@Optional() private readonly metricsService?: MetricsService) {
    const registry = this.metricsService?.getRegistry() || new promClient.Registry();

    this.blockedRequestsTotal = new promClient.Counter({
      name: `${PREFIX}blocked_requests_total`,
      help: 'Total number of requests blocked by security gateway',
      labelNames: ['reason', 'path', 'method'],
      registers: [registry],
    });

    this.threatDetectionsTotal = new promClient.Counter({
      name: `${PREFIX}threat_detections_total`,
      help: 'Total number of security threats detected',
      labelNames: ['type', 'severity', 'agent'],
      registers: [registry],
    });

    this.authFailuresTotal = new promClient.Counter({
      name: `${PREFIX}auth_failures_total`,
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'ip'],
      registers: [registry],
    });

    this.authSuccessTotal = new promClient.Counter({
      name: `${PREFIX}auth_success_total`,
      help: 'Total number of successful authentications',
      labelNames: ['method'], // 'jwt', 'refresh', 'api_key'
      registers: [registry],
    });

    this.tokenRotationsTotal = new promClient.Counter({
      name: `${PREFIX}token_rotations_total`,
      help: 'Total number of refresh token rotations',
      labelNames: ['status'], // 'success', 'reuse_detected', 'expired'
      registers: [registry],
    });

    this.accountLockoutsTotal = new promClient.Counter({
      name: `${PREFIX}account_lockouts_total`,
      help: 'Total number of account lockouts',
      labelNames: ['reason'], // 'brute_force', 'admin_action', 'suspicious_activity'
      registers: [registry],
    });

    this.inputSanitizedTotal = new promClient.Counter({
      name: `${PREFIX}input_sanitized_total`,
      help: 'Total number of inputs that were sanitized',
      labelNames: ['threat_type', 'agent'],
      registers: [registry],
    });

    this.riskScoreHistogram = new promClient.Histogram({
      name: `${PREFIX}risk_score_histogram`,
      help: 'Distribution of risk scores from security checks',
      labelNames: ['path'],
      buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      registers: [registry],
    });

    this.circuitBreakerState = new promClient.Gauge({
      name: `${PREFIX}circuit_breaker_state`,
      help: 'Current state of circuit breakers (0=closed, 0.5=half_open, 1=open)',
      labelNames: ['circuit'],
      registers: [registry],
    });

    this.suspiciousIpsTracked = new promClient.Gauge({
      name: `${PREFIX}suspicious_ips_tracked`,
      help: 'Number of IPs currently tracked as suspicious',
      registers: [registry],
    });

    this.logger.log('SecurityMetricsService initialized with 10 security-specific metrics');
  }

  // ─── Recording Methods ───────────────────────────────────────

  recordBlockedRequest(reason: string, path: string, method: string): void {
    this.blockedRequestsTotal.labels(reason, path, method).inc();
  }

  recordThreatDetection(type: string, severity: string, agent: string): void {
    this.threatDetectionsTotal.labels(type, severity, agent).inc();
  }

  recordAuthFailure(reason: string, ip: string): void {
    this.authFailuresTotal.labels(reason, this.anonymizeIp(ip)).inc();
  }

  recordAuthSuccess(method: string): void {
    this.authSuccessTotal.labels(method).inc();
  }

  recordTokenRotation(status: 'success' | 'reuse_detected' | 'expired'): void {
    this.tokenRotationsTotal.labels(status).inc();
  }

  recordAccountLockout(reason: string): void {
    this.accountLockoutsTotal.labels(reason).inc();
  }

  recordInputSanitized(threatType: string, agent: string): void {
    this.inputSanitizedTotal.labels(threatType, agent).inc();
  }

  recordRiskScore(path: string, score: number): void {
    this.riskScoreHistogram.labels(path).observe(score);
  }

  setCircuitBreakerState(circuit: string, state: 'closed' | 'half_open' | 'open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'half_open' ? 0.5 : 1;
    this.circuitBreakerState.labels(circuit).set(stateValue);
  }

  setSuspiciousIpCount(count: number): void {
    this.suspiciousIpsTracked.set(count);
  }

  // ─── Helper Methods ──────────────────────────────────────────

  /**
   * Anonymize IP for privacy-compliant metrics.
   * 192.168.1.42 → 192.168.1.0
   */
  private anonymizeIp(ip: string): string {
    if (!ip || ip === 'unknown') return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    // IPv6 - mask last segment
    if (ip.includes(':')) {
      const segments = ip.split(':');
      segments[segments.length - 1] = '0';
      return segments.join(':');
    }
    return 'unknown';
  }
}
