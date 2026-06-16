/**
 * AENEWS Agent OS X — IP Access Control Middleware
 *
 * Restricts access to sensitive endpoints (admin, metrics, internal)
 * based on IP address whitelist.
 *
 * Features:
 *   - CIDR notation support (e.g., 10.0.0.0/8)
 *   - Separate whitelists for admin vs. metrics endpoints
 *   - Configurable via environment variables
 *   - Automatic private network detection
 */

import { Injectable, NestMiddleware, Logger, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

export interface IpAccessConfig {
  adminWhitelist: string[];
  metricsWhitelist: string[];
  internalWhitelist: string[];
  enablePrivateNetworkBypass: boolean;
}

@Injectable()
export class IpAccessControlMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpAccessControlMiddleware.name);
  private readonly config: IpAccessConfig;

  constructor(private readonly configService: ConfigService) {
    const adminIps = (this.configService.get<string>('security.ip.adminWhitelist') || '')
      .split(',').map((ip) => ip.trim()).filter(Boolean);

    const metricsIps = (this.configService.get<string>('security.ip.metricsWhitelist') || '')
      .split(',').map((ip) => ip.trim()).filter(Boolean);

    const internalIps = (this.configService.get<string>('security.ip.internalWhitelist') || '')
      .split(',').map((ip) => ip.trim()).filter(Boolean);

    this.config = {
      adminWhitelist: [...adminIps, '127.0.0.1', '::1'],
      metricsWhitelist: [
        ...metricsIps,
        '127.0.0.1', '::1',
        '10.0.0.0/8',      // Private network
        '172.16.0.0/12',   // Private network
        '192.168.0.0/16',  // Private network
      ],
      internalWhitelist: [
        ...internalIps,
        '127.0.0.1', '::1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
      ],
      enablePrivateNetworkBypass: this.configService.get<string>('security.ip.privateBypass') !== 'false',
    };

    this.logger.log(`IP Access Control initialized: admin=${this.config.adminWhitelist.length}, metrics=${this.config.metricsWhitelist.length}, internal=${this.config.internalWhitelist.length} rules`);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const clientIp = this.getClientIp(req);
    const path = req.originalUrl || req.url;

    // Determine which whitelist to apply based on path
    const whitelist = this.getWhitelistForPath(path);

    if (!whitelist) {
      // No restrictions for this path
      next();
      return;
    }

    if (this.isIpAllowed(clientIp, whitelist)) {
      next();
      return;
    }

    this.logger.warn(`IP ACCESS DENIED: ${clientIp} → ${path}`);
    throw new ForbiddenException('Access denied from this IP address');
  }

  /**
   * Check if a path requires IP-based access control.
   */
  private getWhitelistForPath(path: string): string[] | null {
    // Admin endpoints
    if (path.includes('/admin/') || path.includes('/api/v1/admin')) {
      return this.config.adminWhitelist;
    }

    // Metrics/monitoring endpoints
    if (path.includes('/metrics') || path.includes('/prometheus') || path.includes('/grafana')) {
      return this.config.metricsWhitelist;
    }

    // Internal endpoints (health OR debug)
    if (path.includes('/health') || path.includes('/debug')) {
      return this.config.internalWhitelist;
    }

    // No restriction
    return null;
  }

  /**
   * Check if an IP is in the whitelist.
   * Supports CIDR notation.
   */
  private isIpAllowed(ip: string, whitelist: string[]): boolean {
    if (!ip) return false;

    for (const allowed of whitelist) {
      if (this.matchIp(ip, allowed)) {
        return true;
      }
    }

    // Check private network bypass
    if (this.config.enablePrivateNetworkBypass && this.isPrivateIp(ip)) {
      return true;
    }

    return false;
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
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);

    if (ipParts.length !== 4 || networkParts.length !== 4) return false;

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Check if an IP is in a private network range.
   */
  private isPrivateIp(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
      ip.startsWith('fe80:') ||
      ip === '::ffff:127.0.0.1'
    );
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
}
