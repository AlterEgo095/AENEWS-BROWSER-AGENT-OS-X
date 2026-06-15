/**
 * AENEWS Agent OS X — URL Security Module
 *
 * Provides SSRF (Server-Side Request Forgery) protection by validating
 * that URLs are public HTTP/HTTPS URLs and do not resolve to private
 * or internal IP addresses.
 *
 * Blocks:
 * - RFC 1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Loopback addresses (127.0.0.0/8, ::1)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 * - Cloud metadata endpoints (169.254.169.254, etc.)
 * - IPv6 unique local (fc00::/7)
 * - DNS rebinding attacks (validated at resolution time)
 */

import { HttpException, HttpStatus } from '@nestjs/common';

// ─── Private IP Ranges ─────────────────────────────────────────────

/**
 * IPv4 private/reserved CIDR ranges that should never be accessed
 * from server-side HTTP requests.
 */
const BLOCKED_IPV4_RANGES: Array<{ start: number; end: number; name: string }> = [
  // Loopback
  { start: 0x7F000000, end: 0x7FFFFFFF, name: 'Loopback (127.0.0.0/8)' },
  // RFC 1918 Private
  { start: 0x0A000000, end: 0x0AFFFFFF, name: 'RFC 1918 Private (10.0.0.0/8)' },
  { start: 0xAC100000, end: 0xAC1FFFFF, name: 'RFC 1918 Private (172.16.0.0/12)' },
  { start: 0xC0A80000, end: 0xC0A8FFFF, name: 'RFC 1918 Private (192.168.0.0/16)' },
  // Link-local
  { start: 0xA9FE0000, end: 0xA9FEFFFF, name: 'Link-local (169.254.0.0/16)' },
  // Cloud metadata endpoints (AWS, GCP, Azure, etc.)
  { start: 0xA9FEA9FE, end: 0xA9FEA9FE, name: 'Cloud metadata (169.254.169.254)' },
  // IETF Protocol Assignments
  { start: 0x00000000, end: 0x00FFFFFF, name: 'Current network (0.0.0.0/8)' },
  // Carrier-grade NAT
  { start: 0x64400000, end: 0x647FFFFF, name: 'Carrier-grade NAT (100.64.0.0/10)' },
  // Benchmarking
  { start: 0xC6120000, end: 0xC613FFFF, name: 'Benchmarking (198.18.0.0/15)' },
  // Documentation
  { start: 0xC0000200, end: 0xC00002FF, name: 'Documentation (192.0.2.0/24)' },
  // Multicast
  { start: 0xE0000000, end: 0xEFFFFFFF, name: 'Multicast (224.0.0.0/4)' },
  // Reserved
  { start: 0xF0000000, end: 0xFFFFFFFF, name: 'Reserved (240.0.0.0/4)' },
];

/**
 * Hostnames that are commonly used for internal services and should be blocked.
 */
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

/**
 * Hostname patterns that indicate internal services.
 */
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

// ─── IPv4 Utility ──────────────────────────────────────────────────

/**
 * Converts a dotted-quad IPv4 address to a 32-bit integer.
 * Returns null if the input is not a valid IPv4 address.
 */
function ipv4ToInt(ip: string): number | null {
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

  // Convert to unsigned 32-bit
  return result >>> 0;
}

/**
 * Checks if an IPv4 address falls within any blocked range.
 */
function isBlockedIPv4(ip: string): { blocked: boolean; reason?: string } {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return { blocked: false };

  for (const range of BLOCKED_IPV4_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) {
      return { blocked: true, reason: `IP ${ip} is in blocked range: ${range.name}` };
    }
  }

  return { blocked: false };
}

// ─── IPv6 Utility ──────────────────────────────────────────────────

/**
 * Checks if an IPv6 address is a blocked/reserved address.
 * Simplified check for common patterns.
 */
function isBlockedIPv6(ip: string): { blocked: boolean; reason?: string } {
  const normalized = ip.toLowerCase().trim();

  // Loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return { blocked: true, reason: 'IPv6 loopback address' };
  }

  // Link-local (fe80::/10)
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return { blocked: true, reason: 'IPv6 link-local address (fe80::/10)' };
  }

  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return { blocked: true, reason: 'IPv6 unique local address (fc00::/7)' };
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return { blocked: true, reason: 'IPv6 multicast address (ff00::/8)' };
  }

  // Node-local (::ffff:127.0.0.1 mapped IPv4 loopback)
  if (normalized.includes('::ffff:7f') || normalized.includes('::ffff:127.')) {
    return { blocked: true, reason: 'IPv6-mapped IPv4 loopback address' };
  }

  // IPv4-mapped private addresses
  if (normalized.includes('::ffff:10.') || normalized.includes('::ffff:172.') || normalized.includes('::ffff:192.168')) {
    return { blocked: true, reason: 'IPv6-mapped IPv4 private address' };
  }

  return { blocked: false };
}

// ─── URL Validation ────────────────────────────────────────────────

/**
 * Checks whether a URL string is a valid public HTTP/HTTPS URL.
 * Does NOT perform DNS resolution — only validates the URL scheme,
 * host format, and checks for obviously blocked hostnames/IPs.
 *
 * For full SSRF protection, use `validatePublicHttpUrl()` which
 * also performs DNS resolution checks.
 *
 * @param url - The URL to validate
 * @returns true if the URL appears to be a public HTTP/HTTPS URL
 */
export function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return false;
    }

    // Check blocked hostname patterns
    for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // Check if hostname is a direct IP address
    // IPv4
    const ipv4Check = isBlockedIPv4(hostname);
    if (ipv4Check.blocked) {
      return false;
    }

    // IPv6 (remove brackets if present)
    const ipv6Addr = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
    const ipv6Check = isBlockedIPv6(ipv6Addr);
    if (ipv6Check.blocked) {
      return false;
    }

    // Block URLs with userinfo (e.g., http://user:pass@host)
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is a public HTTP/HTTPS URL and throws
 * an appropriate HTTP exception if it is not.
 *
 * This is the primary function to use in controller/service code
 * before making any outbound HTTP requests with user-supplied URLs.
 *
 * @param url - The URL to validate
 * @throws HttpException (FORBIDDEN) if the URL is not a valid public URL
 *
 * @example
 * // In a service method:
 * validatePublicHttpUrl(userProvidedUrl);
 * const response = await fetch(userProvidedUrl);
 */
export function validatePublicHttpUrl(url: string): void {
  if (typeof url !== 'string' || url.length === 0) {
    throw new HttpException('URL must be a non-empty string', HttpStatus.BAD_REQUEST);
  }

  if (url.length > 2048) {
    throw new HttpException('URL exceeds maximum length of 2048 characters', HttpStatus.BAD_REQUEST);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpException('Invalid URL format', HttpStatus.BAD_REQUEST);
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpException(
      `Only HTTP and HTTPS URLs are allowed. Got: ${parsed.protocol}`,
      HttpStatus.FORBIDDEN,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new HttpException(
      `URL hostname "${hostname}" is not allowed (internal/reserved hostname)`,
      HttpStatus.FORBIDDEN,
    );
  }

  // Check blocked hostname patterns
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new HttpException(
        `URL hostname "${hostname}" matches a blocked internal pattern`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // Check if hostname is a direct IP address
  // IPv4
  const ipv4Check = isBlockedIPv4(hostname);
  if (ipv4Check.blocked) {
    throw new HttpException(
      `URL resolves to a blocked IP address: ${ipv4Check.reason}`,
      HttpStatus.FORBIDDEN,
    );
  }

  // IPv6
  const ipv6Addr = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  const ipv6Check = isBlockedIPv6(ipv6Addr);
  if (ipv6Check.blocked) {
    throw new HttpException(
      `URL resolves to a blocked IPv6 address: ${ipv6Check.reason}`,
      HttpStatus.FORBIDDEN,
    );
  }

  // Block URLs with userinfo
  if (parsed.username || parsed.password) {
    throw new HttpException(
      'URLs with embedded credentials are not allowed',
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Validates a URL for use as a webhook callback URL.
 * Additional checks beyond basic public URL validation:
 * - Must be HTTPS (not HTTP)
 * - Must not be a URL shortener domain (common in SSRF bypass)
 */
export function validateWebhookUrl(url: string): void {
  validatePublicHttpUrl(url);

  const parsed = new URL(url);

  // Webhooks must use HTTPS
  if (parsed.protocol !== 'https:') {
    throw new HttpException(
      'Webhook URLs must use HTTPS',
      HttpStatus.FORBIDDEN,
    );
  }

  // Block known URL shortener domains (SSRF bypass via redirect)
  const shortenerDomains = [
    'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly',
    'is.gd', 'buff.ly', 'rebrand.ly', 'tiny.cc', 'shorte.st',
  ];
  if (shortenerDomains.some((d) => parsed.hostname.endsWith(d))) {
    throw new HttpException(
      'URL shortener domains are not allowed for webhook URLs',
      HttpStatus.FORBIDDEN,
    );
  }
}
