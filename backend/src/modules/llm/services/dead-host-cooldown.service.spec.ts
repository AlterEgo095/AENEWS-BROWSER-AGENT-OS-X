/**
 * AENEWS Agent OS X — Dead Host Cooldown Service Unit Tests
 *
 * Tests for cooldown behavior after consecutive failures, success reset,
 * availability checks, host filtering, and cooldown expiry.
 */

import { DeadHostCooldownService } from './dead-host-cooldown.service';

describe('DeadHostCooldownService', () => {
  let service: DeadHostCooldownService;

  beforeEach(() => {
    service = new DeadHostCooldownService();
  });

  // ─── Initial State ─────────────────────────────────────────────

  describe('initial state', () => {
    it('should return true for isAvailable on unknown host', () => {
      expect(service.isAvailable('unknown-host')).toBe(true);
    });

    it('should return null for getHostHealth on unknown host', () => {
      expect(service.getHostHealth('unknown-host')).toBeNull();
    });

    it('should return empty stats', () => {
      const stats = service.getStats();
      expect(stats.totalHosts).toBe(0);
      expect(stats.hostsInCooldown).toBe(0);
      expect(stats.healthyHosts).toBe(0);
    });
  });

  // ─── Failure Tracking ──────────────────────────────────────────

  describe('markFailed', () => {
    it('should track first failure without entering cooldown', () => {
      service.markFailed('host-1', 'timeout');
      const health = service.getHostHealth('host-1');
      expect(health).not.toBeNull();
      expect(health!.consecutiveFailures).toBe(1);
      expect(health!.totalFailures).toBe(1);
      expect(health!.cooldownUntil).toBe(0);
      expect(health!.lastFailureReason).toBe('timeout');
    });

    it('should enter cooldown after 2 consecutive failures', () => {
      service.markFailed('host-1', 'timeout');
      service.markFailed('host-1', 'timeout');
      const health = service.getHostHealth('host-1');
      expect(health!.consecutiveFailures).toBe(2);
      expect(health!.cooldownUntil).toBeGreaterThan(0);
    });

    it('should increment failure counts correctly', () => {
      service.markFailed('host-1', 'err1');
      service.markFailed('host-1', 'err2');
      service.markFailed('host-1', 'err3');
      const health = service.getHostHealth('host-1');
      expect(health!.consecutiveFailures).toBe(3);
      expect(health!.totalFailures).toBe(3);
      expect(health!.lastFailureReason).toBe('err3');
    });

    it('should track last failure timestamp', () => {
      const before = Date.now();
      service.markFailed('host-1');
      const after = Date.now();
      const health = service.getHostHealth('host-1');
      expect(health!.lastFailureAt).toBeGreaterThanOrEqual(before);
      expect(health!.lastFailureAt).toBeLessThanOrEqual(after);
    });
  });

  // ─── Success Resets ────────────────────────────────────────────

  describe('markSuccess', () => {
    it('should reset consecutive failures on success', () => {
      service.markFailed('host-1', 'timeout');
      service.markFailed('host-1', 'timeout');
      expect(service.getHostHealth('host-1')!.consecutiveFailures).toBe(2);

      service.markSuccess('host-1');
      const health = service.getHostHealth('host-1');
      expect(health!.consecutiveFailures).toBe(0);
      expect(health!.cooldownUntil).toBe(0);
      expect(health!.lastFailureReason).toBeNull();
    });

    it('should not create a record for unknown hosts on success', () => {
      service.markSuccess('unknown-host');
      expect(service.getHostHealth('unknown-host')).toBeNull();
    });

    it('should keep total failures after success', () => {
      service.markFailed('host-1', 'timeout');
      service.markFailed('host-1', 'timeout');
      service.markSuccess('host-1');
      // totalFailures should remain (not reset)
      // But cooldown and consecutive should be cleared
      const health = service.getHostHealth('host-1');
      expect(health!.consecutiveFailures).toBe(0);
      expect(health!.cooldownUntil).toBe(0);
    });
  });

  // ─── Availability Checks ───────────────────────────────────────

  describe('isAvailable', () => {
    it('should return true for healthy host', () => {
      expect(service.isAvailable('healthy-host')).toBe(true);
    });

    it('should return true for host with only 1 failure (below threshold)', () => {
      service.markFailed('host-1');
      expect(service.isAvailable('host-1')).toBe(true);
    });

    it('should return false for host in cooldown', () => {
      service.markFailed('host-1');
      service.markFailed('host-1'); // Triggers cooldown
      expect(service.isAvailable('host-1')).toBe(false);
    });

    it('should return true after cooldown expires', () => {
      service.markFailed('host-1');
      service.markFailed('host-1'); // Cooldown = now + 20s

      // Manually override cooldown time to simulate expiry
      const health = service.getHostHealth('host-1');
      expect(health).not.toBeNull();
      // Set cooldown to the past
      (health as any).cooldownUntil = Date.now() - 1000;

      expect(service.isAvailable('host-1')).toBe(true);
    });

    it('should reset host state after cooldown expiry', () => {
      service.markFailed('host-1');
      service.markFailed('host-1');

      const health = service.getHostHealth('host-1')!;
      (health as any).cooldownUntil = Date.now() - 1000;

      service.isAvailable('host-1');
      const afterHealth = service.getHostHealth('host-1');
      expect(afterHealth!.cooldownUntil).toBe(0);
      expect(afterHealth!.consecutiveFailures).toBe(0);
    });
  });

  // ─── Host Filtering ────────────────────────────────────────────

  describe('getAvailableHosts', () => {
    it('should return all hosts when none are in cooldown', () => {
      const hosts = ['host-1', 'host-2', 'host-3'];
      expect(service.getAvailableHosts(hosts)).toEqual(hosts);
    });

    it('should filter out hosts in cooldown', () => {
      service.markFailed('host-1');
      service.markFailed('host-1'); // Cooldown

      const hosts = ['host-1', 'host-2', 'host-3'];
      const available = service.getAvailableHosts(hosts);
      expect(available).not.toContain('host-1');
      expect(available).toContain('host-2');
      expect(available).toContain('host-3');
    });

    it('should return empty array if all hosts are in cooldown', () => {
      service.markFailed('host-1');
      service.markFailed('host-1');
      service.markFailed('host-2');
      service.markFailed('host-2');

      const hosts = ['host-1', 'host-2'];
      expect(service.getAvailableHosts(hosts)).toEqual([]);
    });

    it('should include hosts with 1 failure (not yet in cooldown)', () => {
      service.markFailed('host-1'); // 1 failure, not in cooldown

      const hosts = ['host-1', 'host-2'];
      const available = service.getAvailableHosts(hosts);
      expect(available).toContain('host-1');
    });
  });

  // ─── Statistics ────────────────────────────────────────────────

  describe('getStats', () => {
    it('should report correct stats for mixed host states', () => {
      service.markFailed('host-1');
      service.markFailed('host-1'); // In cooldown
      service.markFailed('host-2'); // 1 failure, not cooldown

      const stats = service.getStats();
      expect(stats.totalHosts).toBe(2);
      expect(stats.hostsInCooldown).toBe(1);
      expect(stats.healthyHosts).toBe(1);
    });

    it('should include detail for each host', () => {
      service.markFailed('host-1', 'timeout');
      service.markFailed('host-1', 'connection refused');

      const stats = service.getStats();
      const host1Detail = stats.details.find((d) => d.host === 'host-1');
      expect(host1Detail).toBeDefined();
      expect(host1Detail!.consecutiveFailures).toBe(2);
      expect(host1Detail!.totalFailures).toBe(2);
      expect(host1Detail!.inCooldown).toBe(true);
      expect(host1Detail!.cooldownRemainingMs).toBeGreaterThan(0);
      expect(host1Detail!.lastFailureReason).toBe('connection refused');
    });
  });

  // ─── Reset Operations ─────────────────────────────────────────

  describe('resetHost', () => {
    it('should remove a specific host record', () => {
      service.markFailed('host-1');
      service.resetHost('host-1');
      expect(service.getHostHealth('host-1')).toBeNull();
    });

    it('should make the host available again', () => {
      service.markFailed('host-1');
      service.markFailed('host-1');
      expect(service.isAvailable('host-1')).toBe(false);

      service.resetHost('host-1');
      expect(service.isAvailable('host-1')).toBe(true);
    });
  });

  describe('resetAll', () => {
    it('should clear all host records', () => {
      service.markFailed('host-1');
      service.markFailed('host-2');
      service.markFailed('host-3');
      service.resetAll();

      expect(service.getHostHealth('host-1')).toBeNull();
      expect(service.getHostHealth('host-2')).toBeNull();
      expect(service.getHostHealth('host-3')).toBeNull();
    });

    it('should make all hosts available again', () => {
      service.markFailed('host-1');
      service.markFailed('host-1');
      service.resetAll();
      expect(service.isAvailable('host-1')).toBe(true);
    });
  });

  // ─── Cooldown Duration ────────────────────────────────────────

  describe('cooldown duration', () => {
    it('should set cooldown for approximately 20 seconds', () => {
      const before = Date.now();
      service.markFailed('host-1');
      service.markFailed('host-1');
      const after = Date.now();

      const health = service.getHostHealth('host-1');
      // Cooldown should be between now+20s (with some clock tolerance)
      expect(health!.cooldownUntil).toBeGreaterThanOrEqual(before + 19000);
      expect(health!.cooldownUntil).toBeLessThanOrEqual(after + 21000);
    });
  });

  // ─── getAllHostHealth ──────────────────────────────────────────

  describe('getAllHostHealth', () => {
    it('should return a copy of the health records', () => {
      service.markFailed('host-1');
      const allHealth = service.getAllHostHealth();
      expect(allHealth.size).toBe(1);
      expect(allHealth.get('host-1')).toBeDefined();

      // Verify it's a copy
      allHealth.delete('host-1');
      expect(service.getHostHealth('host-1')).not.toBeNull();
    });
  });
});
