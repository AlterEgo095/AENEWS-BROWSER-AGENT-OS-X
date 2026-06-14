/**
 * AENEWS Agent OS X — IP Blacklist Middleware
 *
 * Blocks requests from IP addresses on a configurable blacklist.
 * Complements the existing IpAccessControlMiddleware (whitelist)
 * by providing explicit denial rules.
 *
 * Features:
 *   - Static blacklist loaded from configuration
 *   - Dynamic blacklist management (add/remove at runtime)
 *   - CIDR notation support for range blocking
 *   - Automatic sync with threat intelligence service
 *   - Blacklist entries with TTL (auto-expire)
 *
 * Configuration via environment variables:
 *   - SECURITY_IP_BLACKLIST: Comma-separated IP addresses/CIDRs to block
 */

import { Injectable, NestMiddleware, Logger, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface BlacklistEntry {
  pattern: string;
  addedAt: number;
  expiresAt: number | null; // null = permanent
  reason: string;
}

@Injectable()
export class IpBlacklistMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpBlacklistMiddleware.name);
  private readonly blacklist = new Map<string, BlacklistEntry>();

  constructor(private readonly configService: ConfigService) {
    // Load static blacklist from environment
    const staticBlacklist = (this.configService.get<string>('security.ip.blacklist') || '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    for (const ip of staticBlacklist) {
      this.blacklist.set(ip, {
        pattern: ip,
        addedAt: Date.now(),
        expiresAt: null, // permanent
        reason: 'Static configuration',
      });
    }

    this.logger.log(`IP blacklist initialized with ${this.blacklist.size} entries`);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const clientIp = this.getClientIp(req);

    // Clean expired entries
    this.cleanExpired();

    // Check if IP is blacklisted
    if (this.isBlacklisted(clientIp)) {
      const entry = this.findMatchingEntry(clientIp);
      this.logger.warn(
        `IP BLACKLIST BLOCKED: ${clientIp} → ${req.originalUrl} (reason: ${entry?.reason || 'match'})`,
      );
      throw new ForbiddenException('Access denied');
    }

    next();
  }

  /**
   * Add an IP or CIDR to the blacklist.
   * @param pattern IP address or CIDR notation
   * @param reason Reason for blacklisting
   * @param ttlMs Time-to-live in milliseconds (null = permanent)
   */
  add(pattern: string, reason: string, ttlMs: number | null = null): void {
    this.blacklist.set(pattern, {
      pattern,
      addedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
      reason,
    });
    this.logger.log(`Added IP to blacklist: ${pattern} (reason: ${reason}, ttl: ${ttlMs ? `${ttlMs}ms` : 'permanent'})`);
  }

  /**
   * Remove an IP or CIDR from the blacklist.
   */
  remove(pattern: string): boolean {
    const removed = this.blacklist.delete(pattern);
    if (removed) {
      this.logger.log(`Removed IP from blacklist: ${pattern}`);
    }
    return removed;
  }

  /**
   * Check if an IP is on the blacklist.
   */
  isBlacklisted(ip: string): boolean {
    return this.findMatchingEntry(ip) !== null;
  }

  /**
   * Get all blacklist entries (for admin UI).
   */
  getEntries(): Array<{ pattern: string; addedAt: number; expiresAt: number | null; reason: string }> {
    return Array.from(this.blacklist.values()).map((entry) => ({
      pattern: entry.pattern,
      addedAt: entry.addedAt,
      expiresAt: entry.expiresAt,
      reason: entry.reason,
    }));
  }

  /**
   * Get the number of entries in the blacklist.
   */
  get size(): number {
    return this.blacklist.size;
  }

  // ─── Private Methods ─────────────────────────────────────────

  /**
   * Find the matching blacklist entry for an IP.
   */
  private findMatchingEntry(ip: string): BlacklistEntry | null {
    if (!ip) return null;

    for (const [, entry] of this.blacklist) {
      if (this.matchIp(ip, entry.pattern)) {
        return entry;
      }
    }

    return null;
  }

  /**
   * Match an IP against a pattern (exact or CIDR).
   */
  private matchIp(ip: string, pattern: string): boolean {
    // Exact match
    if (ip === pattern) return true;

    // CIDR notation
    if (pattern.includes('/')) {
      return this.matchCidr(ip, pattern);
    }

    return false;
  }

  /**
   * Simple CIDR matching for IPv4.
   */
  private matchCidr(ip: string, cidr: string): boolean {
    try {
      const [network, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);

      const ipParts = ip.split('.').map(Number);
      const networkParts = network.split('.').map(Number);

      if (ipParts.length !== 4 || networkParts.length !== 4) return false;
      if (ipParts.some(isNaN) || networkParts.some(isNaN)) return false;

      const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
      const networkNum = ((networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3]) >>> 0;
      const mask = ~((1 << (32 - prefix)) - 1) >>> 0;

      return (ipNum & mask) === (networkNum & mask);
    } catch {
      return false;
    }
  }

  /**
   * Get the real client IP, considering proxy headers.
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      const ips = forwarded.split(',').map((s) => s.trim());
      return ips[0];
    }
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) return realIp;
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Remove expired entries from the blacklist.
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.blacklist) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.blacklist.delete(key);
      }
    }
  }
}
