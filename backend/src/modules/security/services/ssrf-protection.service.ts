/**
 * AENEWS Agent OS X — SSRF Protection Service
 *
 * Validates outbound URLs before any server-side HTTP request to prevent
 * Server-Side Request Forgery (SSRF) attacks.  Inspired by the Odysseus
 * project's URL-security hardening.
 *
 * ## Protection Layers
 *
 * 1. **Scheme validation** — only `http:` and `https:` are permitted.
 * 2. **Hostname blocklist** — localhost, Docker, Kubernetes, and cloud
 *    metadata hostnames are rejected.
 * 3. **IPv4 range check** — RFC 1918 private, loopback, link-local,
 *    cloud metadata, carrier-grade NAT, multicast, and reserved ranges.
 * 4. **IPv6 range check** — loopback, link-local, unique local, multicast,
 *    and IPv4-mapped private addresses.
 * 5. **DNS rebinding detection** — resolves the hostname at request time
 *    and validates the resolved IP against the same blocklists.
 * 6. **Credential-in-URL rejection** — blocks `user:pass@host` forms.
 * 7. **Fail-safe** — on any error during validation the URL is **blocked**.
 *
 * @module security/ssrf-protection
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import * as dns from 'dns';
import { SecurityMetricsService } from '../../security-monitoring/services/security-metrics.service';

// ═══════════════════════════════════════════════════════════════════════
//  IPv4 BLOCKED RANGES
// ═══════════════════════════════════════════════════════════════════════

interface Ipv4Range {
  start: number;
  end: number;
  name: string;
}

const BLOCKED_IPV4_RANGES: Ipv4Range[] = [
  { start: 0x7F000000, end: 0x7FFFFFFF, name: 'Loopback (127.0.0.0/8)' },
  { start: 0x0A000000, end: 0x0AFFFFFF, name: 'RFC 1918 Private (10.0.0.0/8)' },
  { start: 0xAC100000, end: 0xAC1FFFFF, name: 'RFC 1918 Private (172.16.0.0/12)' },
  { start: 0xC0A80000, end: 0xC0A8FFFF, name: 'RFC 1918 Private (192.168.0.0/16)' },
  { start: 0xA9FE0000, end: 0xA9FEFFFF, name: 'Link-local (169.254.0.0/16)' },
  { start: 0xA9FEA9FE, end: 0xA9FEA9FE, name: 'Cloud metadata (169.254.169.254)' },
  { start: 0x00000000, end: 0x00FFFFFF, name: 'Current network (0.0.0.0/8)' },
  { start: 0x64400000, end: 0x647FFFFF, name: 'Carrier-grade NAT (100.64.0.0/10)' },
  { start: 0xC6120000, end: 0xC613FFFF, name: 'Benchmarking (198.18.0.0/15)' },
  { start: 0xC0000200, end: 0xC00002FF, name: 'Documentation (192.0.2.0/24)' },
  { start: 0xE0000000, end: 0xEFFFFFFF, name: 'Multicast (224.0.0.0/4)' },
  { start: 0xF0000000, end: 0xFFFFFFFF, name: 'Reserved (240.0.0.0/4)' },
];

// ═══════════════════════════════════════════════════════════════════════
//  BLOCKED HOSTNAMES
// ═══════════════════════════════════════════════════════════════════════

const BLOCKED_HOSTNAMES: Set<string> = new Set([
  'localhost',
  'localhost.localdomain',
  'localdomain',
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
  'dockercfg',
  'host.docker.internal',
  'gateway.docker.internal',
  'kubernetes',
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
]);

const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^.*\.internal$/i,
  /^.*\.local$/i,
  /^.*\.svc$/i,
  /^.*\.svc\.cluster\.local$/i,
  /^.*\.docker\.internal$/i,
  /^.*\.kube-system$/i,
  /^.*\.consul$/i,
  /^.*\.nomad$/i,
  /^.*\.mesos$/i,
  /^ip6-localhost$/i,
  /^ip6-loopback$/i,
];

// ═══════════════════════════════════════════════════════════════════════
//  RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Result of SSRF URL validation.
 */
export interface SsrfValidationResult {
  /** Whether the URL is safe for outbound requests */
  safe: boolean;
  /** If unsafe, the reason why the URL was blocked */
  reason?: string;
  /** The resolved IP addresses (if DNS resolution was performed) */
  resolvedIps?: string[];
}

// ═══════════════════════════════════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════════════════════════════════

/**
 * SsrfProtectionService
 *
 * NestJS injectable that validates URLs before any outbound HTTP request.
 * Prevents SSRF by blocking private/internal IP ranges, cloud metadata
 * endpoints, localhost variations, and performing DNS rebinding detection.
 *
 * @example
 * ```ts
 * constructor(private readonly ssrfProtection: SsrfProtectionService) {}
 *
 * async fetchExternalData(url: string) {
 *   const result = await this.ssrfProtection.validateUrl(url);
 *   if (!result.safe) {
 *     throw new ForbiddenException(`SSRF risk: ${result.reason}`);
 *   }
 *   return fetch(url);
 * }
 * ```
 */
@Injectable()
export class SsrfProtectionService {
  private readonly logger = new Logger(SsrfProtectionService.name);

  constructor(
    @Optional() private readonly metricsService?: SecurityMetricsService,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Validate a URL for SSRF risks — both syntactic checks and DNS
   * rebinding detection (resolves the hostname and checks the IPs).
   *
   * This is the **primary method** to call before making any outbound
   * HTTP request with a user-supplied URL.
   *
   * @param url - The URL to validate
   * @returns SsrfValidationResult with `safe` boolean and optional `reason`
   */
  async validateUrl(url: string): Promise<SsrfValidationResult> {
    // Fail-safe: block on any unexpected error
    try {
      // ── Basic type / length checks ──────────────────────────────
      if (typeof url !== 'string' || url.length === 0) {
        return this.block('URL must be a non-empty string');
      }

      if (url.length > 2048) {
        return this.block('URL exceeds maximum length of 2048 characters');
      }

      // ── Parse URL ───────────────────────────────────────────────
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return this.block('Invalid URL format');
      }

      // ── Scheme validation ───────────────────────────────────────
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return this.block(`Only HTTP and HTTPS URLs are allowed. Got: ${parsed.protocol}`);
      }

      // ── Credential-in-URL rejection ─────────────────────────────
      if (parsed.username || parsed.password) {
        return this.block('URLs with embedded credentials are not allowed');
      }

      const hostname = parsed.hostname.toLowerCase();

      // ── Blocked hostnames ───────────────────────────────────────
      if (BLOCKED_HOSTNAMES.has(hostname)) {
        return this.block(`Hostname "${hostname}" is blocked (internal/reserved hostname)`);
      }

      for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
        if (pattern.test(hostname)) {
          return this.block(`Hostname "${hostname}" matches blocked internal pattern`);
        }
      }

      // ── Direct IP address checks (before DNS resolution) ───────
      const directIpResult = this.checkIpAddress(hostname);
      if (!directIpResult.safe) {
        return directIpResult;
      }

      // ── DNS rebinding detection ─────────────────────────────────
      // Skip DNS resolution if the hostname is already a bare IP
      if (!this.isIpAddress(hostname)) {
        const dnsResult = await this.checkDnsResolution(hostname);
        if (!dnsResult.safe) {
          return dnsResult;
        }

        return {
          safe: true,
          resolvedIps: dnsResult.resolvedIps,
        };
      }

      return { safe: true };
    } catch (error) {
      // Fail-safe: block on any unexpected error
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SSRF validation error (blocking by default): ${message}`);
      this.recordMetric('validation_error');
      return this.block(`SSRF validation error: ${message}`);
    }
  }

  /**
   * Synchronous URL validation — performs all checks **except** DNS
   * rebinding detection.  Use this when async is not possible, but
   * prefer `validateUrl()` for full protection.
   *
   * @param url - The URL to validate
   * @returns SsrfValidationResult with `safe` boolean and optional `reason`
   */
  validateUrlSync(url: string): SsrfValidationResult {
    try {
      if (typeof url !== 'string' || url.length === 0) {
        return this.block('URL must be a non-empty string');
      }

      if (url.length > 2048) {
        return this.block('URL exceeds maximum length of 2048 characters');
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return this.block('Invalid URL format');
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return this.block(`Only HTTP and HTTPS URLs are allowed. Got: ${parsed.protocol}`);
      }

      if (parsed.username || parsed.password) {
        return this.block('URLs with embedded credentials are not allowed');
      }

      const hostname = parsed.hostname.toLowerCase();

      if (BLOCKED_HOSTNAMES.has(hostname)) {
        return this.block(`Hostname "${hostname}" is blocked (internal/reserved hostname)`);
      }

      for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
        if (pattern.test(hostname)) {
          return this.block(`Hostname "${hostname}" matches blocked internal pattern`);
        }
      }

      const directIpResult = this.checkIpAddress(hostname);
      if (!directIpResult.safe) {
        return directIpResult;
      }

      return { safe: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SSRF sync validation error (blocking by default): ${message}`);
      this.recordMetric('validation_error');
      return this.block(`SSRF validation error: ${message}`);
    }
  }

  // ─── IP Address Checks ──────────────────────────────────────────

  /**
   * Check a hostname that may be an IP address against the blocklists.
   */
  private checkIpAddress(hostname: string): SsrfValidationResult {
    // IPv4 direct check
    const ipv4Check = this.isBlockedIPv4(hostname);
    if (ipv4Check.blocked) {
      this.recordMetric('blocked_ipv4');
      return this.block(ipv4Check.reason!);
    }

    // IPv6 check (remove brackets used in URLs like [::1])
    const ipv6Addr = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
    const ipv6Check = this.isBlockedIPv6(ipv6Addr);
    if (ipv6Check.blocked) {
      this.recordMetric('blocked_ipv6');
      return this.block(ipv6Check.reason!);
    }

    return { safe: true };
  }

  /**
   * Resolve a hostname via DNS and check every resolved IP against
   * the blocklists.  This prevents DNS rebinding attacks where a
   * hostname resolves to an internal IP at request time.
   */
  private async checkDnsResolution(hostname: string): Promise<SsrfValidationResult & { resolvedIps?: string[] }> {
    try {
      const addresses = await this.resolveHostname(hostname);

      if (addresses.length === 0) {
        // No DNS results — could be a rebinding trick; block
        return this.block(`Hostname "${hostname}" did not resolve to any IP address`);
      }

      for (const addr of addresses) {
        const ipv4Check = this.isBlockedIPv4(addr);
        if (ipv4Check.blocked) {
          this.recordMetric('dns_rebinding_ipv4');
          this.logger.warn(
            `DNS rebinding detected: hostname "${hostname}" resolved to blocked IP ${addr} (${ipv4Check.reason})`,
          );
          return this.block(`Hostname "${hostname}" resolves to blocked IP: ${ipv4Check.reason}`);
        }

        const ipv6Check = this.isBlockedIPv6(addr);
        if (ipv6Check.blocked) {
          this.recordMetric('dns_rebinding_ipv6');
          this.logger.warn(
            `DNS rebinding detected: hostname "${hostname}" resolved to blocked IPv6 ${addr} (${ipv6Check.reason})`,
          );
          return this.block(`Hostname "${hostname}" resolves to blocked IPv6: ${ipv6Check.reason}`);
        }
      }

      return { safe: true, resolvedIps: addresses };
    } catch (error) {
      // DNS resolution failed — block by default (fail-safe)
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`DNS resolution failed for "${hostname}" (blocking): ${message}`);
      this.recordMetric('dns_resolution_failed');
      return this.block(`DNS resolution failed for hostname "${hostname}"`);
    }
  }

  // ─── DNS Resolution ─────────────────────────────────────────────

  /**
   * Resolve a hostname using Node.js `dns.promises.resolve4` and
   * `dns.promises.resolve6`. Returns all A and AAAA records.
   */
  private async resolveHostname(hostname: string): Promise<string[]> {
    const addresses: string[] = [];

    try {
      const v4 = await dns.promises.resolve4(hostname);
      addresses.push(...v4);
    } catch {
      // May not have A records
    }

    try {
      const v6 = await dns.promises.resolve6(hostname);
      addresses.push(...v6);
    } catch {
      // May not have AAAA records
    }

    return addresses;
  }

  // ─── IPv4 Utilities ─────────────────────────────────────────────

  /**
   * Convert a dotted-quad IPv4 address to a 32-bit unsigned integer.
   * Returns `null` if the input is not a valid IPv4 address.
   */
  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    let result = 0;
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255 || part !== String(num)) {
        return null;
      }
      result = (result << 8) | num;
    }

    return result >>> 0;
  }

  /**
   * Check whether an IPv4 address falls within any blocked range.
   */
  private isBlockedIPv4(ip: string): { blocked: boolean; reason?: string } {
    const ipInt = this.ipv4ToInt(ip);
    if (ipInt === null) return { blocked: false };

    for (const range of BLOCKED_IPV4_RANGES) {
      if (ipInt >= range.start && ipInt <= range.end) {
        return { blocked: true, reason: `IP ${ip} is in blocked range: ${range.name}` };
      }
    }

    return { blocked: false };
  }

  // ─── IPv6 Utilities ─────────────────────────────────────────────

  /**
   * Check whether an IPv6 address is blocked/reserved.
   */
  private isBlockedIPv6(ip: string): { blocked: boolean; reason?: string } {
    const normalized = ip.toLowerCase().trim();

    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
      return { blocked: true, reason: 'IPv6 loopback address (::1)' };
    }

    if (/^fe[89ab]/i.test(normalized)) {
      return { blocked: true, reason: 'IPv6 link-local address (fe80::/10)' };
    }

    if (/^[fF][cCdD]/.test(normalized)) {
      return { blocked: true, reason: 'IPv6 unique local address (fc00::/7)' };
    }

    if (/^ff/i.test(normalized)) {
      return { blocked: true, reason: 'IPv6 multicast address (ff00::/8)' };
    }

    if (normalized.includes('::ffff:7f') || normalized.includes('::ffff:127.')) {
      return { blocked: true, reason: 'IPv6-mapped IPv4 loopback address' };
    }

    if (normalized.includes('::ffff:10.') || normalized.includes('::ffff:172.') || normalized.includes('::ffff:192.168')) {
      return { blocked: true, reason: 'IPv6-mapped IPv4 private address' };
    }

    return { blocked: false };
  }

  // ─── General Utilities ──────────────────────────────────────────

  /**
   * Check whether a string looks like an IP address (v4 or v6).
   */
  private isIpAddress(hostname: string): boolean {
    // IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return true;
    }
    // IPv6 in brackets (URL form)
    const unwrapped = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
    if (/:/.test(unwrapped)) {
      return true;
    }
    return false;
  }

  /**
   * Create a blocked result with a reason.
   */
  private block(reason: string): SsrfValidationResult {
    this.logger.warn(`SSRF protection blocked URL: ${reason}`);
    this.recordMetric('blocked');
    return { safe: false, reason };
  }

  /**
   * Record a security metric (best-effort, never throws).
   */
  private recordMetric(label: string): void {
    try {
      this.metricsService?.recordBlockedRequest('ssrf', label, 'VALIDATE');
    } catch {
      // Swallow — metrics must never break the guard
    }
  }
}
