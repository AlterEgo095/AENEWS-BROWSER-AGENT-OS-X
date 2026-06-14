/**
 * AENEWS Agent OS X — Dead Host Cooldown Service
 *
 * Tracks failed LLM provider hosts and applies cooldown periods
 * to prevent repeated requests to unhealthy endpoints.
 *
 * Features:
 *   - Per-host failure tracking with consecutive failure counts
 *   - Automatic cooldown after threshold (2 consecutive failures)
 *   - Short cooldown duration (20s) for quick recovery
 *   - Thread-safe Map operations
 *   - Automatic cooldown expiry checks
 *
 * Integration:
 *   - Inject into LLMService to filter available provider hosts
 *   - Call markFailed() on provider errors, markSuccess() on success
 *   - Use getAvailableHosts() to filter out dead hosts before routing
 */

import { Injectable, Logger } from '@nestjs/common';

interface HostHealthRecord {
  consecutiveFailures: number;
  totalFailures: number;
  cooldownUntil: number;
  lastFailureAt: number | null;
  lastFailureReason: string | null;
}

@Injectable()
export class DeadHostCooldownService {
  private readonly logger = new Logger(DeadHostCooldownService.name);
  private readonly hosts = new Map<string, HostHealthRecord>();

  /** Number of consecutive failures before triggering cooldown */
  private readonly failureThreshold = 2;

  /** Cooldown duration in milliseconds (20s for quick recovery) */
  private readonly cooldownDurationMs = 20_000;

  /**
   * Mark a host as failed. Increments the failure count and applies
   * a cooldown if the consecutive failure threshold is reached.
   */
  markFailed(host: string, reason?: string): void {
    const now = Date.now();
    const record = this.hosts.get(host);

    if (record) {
      record.consecutiveFailures++;
      record.totalFailures++;
      record.lastFailureAt = now;
      record.lastFailureReason = reason || null;

      if (record.consecutiveFailures >= this.failureThreshold) {
        record.cooldownUntil = now + this.cooldownDurationMs;
        this.logger.warn(
          `Host "${host}" entered cooldown for ${this.cooldownDurationMs / 1000}s ` +
            `(consecutive failures: ${record.consecutiveFailures}, reason: ${reason || 'unknown'})`,
        );
      }
    } else {
      this.hosts.set(host, {
        consecutiveFailures: 1,
        totalFailures: 1,
        cooldownUntil: 0, // Not in cooldown yet (below threshold)
        lastFailureAt: now,
        lastFailureReason: reason || null,
      });
    }
  }

  /**
   * Mark a host as successful. Resets the consecutive failure count.
   */
  markSuccess(host: string): void {
    const record = this.hosts.get(host);

    if (record) {
      record.consecutiveFailures = 0;
      record.cooldownUntil = 0;
      record.lastFailureReason = null;
    }
    // If no record exists, the host was healthy — nothing to do
  }

  /**
   * Check if a host is available (not in cooldown).
   * Returns true if the host is healthy or its cooldown has expired.
   */
  isAvailable(host: string): boolean {
    const record = this.hosts.get(host);

    if (!record) {
      return true; // No failures recorded — host is available
    }

    // Check if cooldown has expired
    if (record.cooldownUntil > 0) {
      const now = Date.now();
      if (now >= record.cooldownUntil) {
        // Cooldown expired — reset and allow
        record.cooldownUntil = 0;
        record.consecutiveFailures = 0;
        this.logger.log(`Host "${host}" cooldown expired — back in rotation`);
        return true;
      }
      return false; // Still in cooldown
    }

    return true; // Not in cooldown
  }

  /**
   * Filter a list of hosts, returning only those that are available.
   * Expired cooldowns are automatically cleared.
   */
  getAvailableHosts(hosts: string[]): string[] {
    return hosts.filter((host) => this.isAvailable(host));
  }

  /**
   * Get the health record for a specific host.
   */
  getHostHealth(host: string): HostHealthRecord | null {
    return this.hosts.get(host) || null;
  }

  /**
   * Get all host health records (for monitoring/debugging).
   */
  getAllHostHealth(): Map<string, HostHealthRecord> {
    return new Map(this.hosts);
  }

  /**
   * Get statistics about host health.
   */
  getStats(): {
    totalHosts: number;
    hostsInCooldown: number;
    healthyHosts: number;
    details: Array<{
      host: string;
      consecutiveFailures: number;
      totalFailures: number;
      inCooldown: boolean;
      cooldownRemainingMs: number;
      lastFailureReason: string | null;
    }>;
  } {
    const now = Date.now();
    let hostsInCooldown = 0;
    let healthyHosts = 0;
    const details: Array<{
      host: string;
      consecutiveFailures: number;
      totalFailures: number;
      inCooldown: boolean;
      cooldownRemainingMs: number;
      lastFailureReason: string | null;
    }> = [];

    for (const [host, record] of this.hosts) {
      const inCooldown = record.cooldownUntil > 0 && now < record.cooldownUntil;
      if (inCooldown) {
        hostsInCooldown++;
      } else {
        healthyHosts++;
      }

      details.push({
        host,
        consecutiveFailures: record.consecutiveFailures,
        totalFailures: record.totalFailures,
        inCooldown,
        cooldownRemainingMs: inCooldown ? record.cooldownUntil - now : 0,
        lastFailureReason: record.lastFailureReason,
      });
    }

    return {
      totalHosts: this.hosts.size,
      hostsInCooldown,
      healthyHosts,
      details,
    };
  }

  /**
   * Manually reset a host's health record (for admin/debugging).
   */
  resetHost(host: string): void {
    this.hosts.delete(host);
    this.logger.log(`Host "${host}" health record reset`);
  }

  /**
   * Clear all host health records.
   */
  resetAll(): void {
    this.hosts.clear();
    this.logger.log('All host health records cleared');
  }
}
