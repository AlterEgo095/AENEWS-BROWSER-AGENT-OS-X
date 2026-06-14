/**
 * AENEWS Agent OS X — URL Security Module Unit Tests
 *
 * Tests for isPublicHttpUrl() and validatePublicHttpUrl()
 * SSRF protection validation.
 */

import { isPublicHttpUrl, validatePublicHttpUrl, validateWebhookUrl } from './url-security';
import { HttpException } from '@nestjs/common';

// ─── isPublicHttpUrl ──────────────────────────────────────────────

describe('isPublicHttpUrl', () => {
  // ── Valid public URLs ──────────────────────────────────────────

  describe('accepts valid public URLs', () => {
    it('should accept https://example.com', () => {
      expect(isPublicHttpUrl('https://example.com')).toBe(true);
    });

    it('should accept http://example.com', () => {
      expect(isPublicHttpUrl('http://example.com')).toBe(true);
    });

    it('should accept https://example.com/path?query=1', () => {
      expect(isPublicHttpUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should accept URLs with ports', () => {
      expect(isPublicHttpUrl('https://example.com:8080/api')).toBe(true);
    });

    it('should accept URLs with fragments', () => {
      expect(isPublicHttpUrl('https://example.com/page#section')).toBe(true);
    });

    it('should accept public IP addresses', () => {
      expect(isPublicHttpUrl('https://8.8.8.8/dns')).toBe(true);
    });

    it('should accept URLs with subdomains', () => {
      expect(isPublicHttpUrl('https://api.example.com/v1')).toBe(true);
    });
  });

  // ── RFC 1918 Private Addresses ─────────────────────────────────

  describe('blocks RFC 1918 addresses', () => {
    it('should block 10.0.0.1 (10.x.x.x)', () => {
      expect(isPublicHttpUrl('http://10.0.0.1/')).toBe(false);
    });

    it('should block 10.255.255.255', () => {
      expect(isPublicHttpUrl('http://10.255.255.255/')).toBe(false);
    });

    it('should block 172.16.0.1 (172.16.x.x)', () => {
      expect(isPublicHttpUrl('http://172.16.0.1/')).toBe(false);
    });

    it('should block 172.31.255.255', () => {
      expect(isPublicHttpUrl('http://172.31.255.255/')).toBe(false);
    });

    it('should block 192.168.0.1 (192.168.x.x)', () => {
      expect(isPublicHttpUrl('http://192.168.0.1/')).toBe(false);
    });

    it('should block 192.168.1.1', () => {
      expect(isPublicHttpUrl('http://192.168.1.1/')).toBe(false);
    });

    it('should block 192.168.255.255', () => {
      expect(isPublicHttpUrl('http://192.168.255.255/')).toBe(false);
    });
  });

  // ── Loopback Addresses ─────────────────────────────────────────

  describe('blocks loopback addresses', () => {
    it('should block 127.0.0.1', () => {
      expect(isPublicHttpUrl('http://127.0.0.1/')).toBe(false);
    });

    it('should block 127.0.0.2', () => {
      expect(isPublicHttpUrl('http://127.0.0.2/')).toBe(false);
    });

    it('should block 127.255.255.255', () => {
      expect(isPublicHttpUrl('http://127.255.255.255/')).toBe(false);
    });

    it('should block localhost hostname', () => {
      expect(isPublicHttpUrl('http://localhost/')).toBe(false);
    });

    it('should block localhost.localdomain', () => {
      expect(isPublicHttpUrl('http://localhost.localdomain/')).toBe(false);
    });
  });

  // ── 0.0.0.0 ────────────────────────────────────────────────────

  describe('blocks 0.0.0.0 and current network', () => {
    it('should block 0.0.0.0', () => {
      expect(isPublicHttpUrl('http://0.0.0.0/')).toBe(false);
    });

    it('should block 0.0.0.1', () => {
      expect(isPublicHttpUrl('http://0.0.0.1/')).toBe(false);
    });
  });

  // ── Cloud Metadata Endpoints ───────────────────────────────────

  describe('blocks cloud metadata endpoints', () => {
    it('should block 169.254.169.254 (AWS/GCP/Azure metadata)', () => {
      expect(isPublicHttpUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('should block 169.254.169.254', () => {
      expect(isPublicHttpUrl('http://169.254.169.254/')).toBe(false);
    });

    it('should block 169.254.0.1 (link-local)', () => {
      expect(isPublicHttpUrl('http://169.254.0.1/')).toBe(false);
    });
  });

  // ── Internal Hostnames ─────────────────────────────────────────

  describe('blocks internal hostnames', () => {
    it('should block kubernetes.default', () => {
      expect(isPublicHttpUrl('https://kubernetes.default/api')).toBe(false);
    });

    it('should block kubernetes.default.svc', () => {
      expect(isPublicHttpUrl('https://kubernetes.default.svc/api')).toBe(false);
    });

    it('should block kubernetes.default.svc.cluster.local', () => {
      expect(isPublicHttpUrl('https://kubernetes.default.svc.cluster.local/api')).toBe(false);
    });

    it('should block metadata.google.internal', () => {
      expect(isPublicHttpUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    });

    it('should block host.docker.internal', () => {
      expect(isPublicHttpUrl('http://host.docker.internal/')).toBe(false);
    });

    it('should block *.internal pattern', () => {
      expect(isPublicHttpUrl('http://my-service.internal/api')).toBe(false);
    });

    it('should block *.local pattern', () => {
      expect(isPublicHttpUrl('http://my-service.local/api')).toBe(false);
    });

    it('should block *.svc pattern', () => {
      expect(isPublicHttpUrl('http://my-service.svc/api')).toBe(false);
    });
  });

  // ── URLs with Credentials ──────────────────────────────────────

  describe('blocks URLs with embedded credentials', () => {
    it('should block http://user:pass@host', () => {
      expect(isPublicHttpUrl('http://user:pass@example.com/')).toBe(false);
    });

    it('should block http://user@host (username only)', () => {
      expect(isPublicHttpUrl('http://user@example.com/')).toBe(false);
    });

    it('should block https://token@host', () => {
      expect(isPublicHttpUrl('https://apikey@api.example.com/v1')).toBe(false);
    });
  });

  // ── Invalid/Non-HTTP Schemes ───────────────────────────────────

  describe('rejects non-HTTP schemes', () => {
    it('should reject ftp:// URLs', () => {
      expect(isPublicHttpUrl('ftp://example.com/')).toBe(false);
    });

    it('should reject file:// URLs', () => {
      expect(isPublicHttpUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject javascript: URLs', () => {
      expect(isPublicHttpUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isPublicHttpUrl('data:text/html,<h1>test</h1>')).toBe(false);
    });

    it('should reject gopher:// URLs', () => {
      expect(isPublicHttpUrl('gopher://example.com/')).toBe(false);
    });
  });

  // ── Invalid URLs ───────────────────────────────────────────────

  describe('rejects invalid URLs', () => {
    it('should reject empty string', () => {
      expect(isPublicHttpUrl('')).toBe(false);
    });

    it('should reject random text', () => {
      expect(isPublicHttpUrl('not-a-url')).toBe(false);
    });

    it('should reject just a hostname', () => {
      expect(isPublicHttpUrl('example.com')).toBe(false);
    });
  });

  // ── IPv6 ───────────────────────────────────────────────────────

  describe('blocks IPv6 reserved addresses', () => {
    it('should block [::1] loopback', () => {
      expect(isPublicHttpUrl('http://[::1]/')).toBe(false);
    });

    it('should block [fe80::1] link-local', () => {
      expect(isPublicHttpUrl('http://[fe80::1]/')).toBe(false);
    });

    it('should block [fc00::1] unique local', () => {
      expect(isPublicHttpUrl('http://[fc00::1]/')).toBe(false);
    });

    it('should block [fd00::1] unique local', () => {
      expect(isPublicHttpUrl('http://[fd00::1]/')).toBe(false);
    });

    it('should block [ff00::1] multicast', () => {
      expect(isPublicHttpUrl('http://[ff00::1]/')).toBe(false);
    });
  });
});

// ─── validatePublicHttpUrl ────────────────────────────────────────

describe('validatePublicHttpUrl', () => {
  it('should not throw for valid public URLs', () => {
    expect(() => validatePublicHttpUrl('https://example.com/api')).not.toThrow();
  });

  it('should throw BAD_REQUEST for empty string', () => {
    expect(() => validatePublicHttpUrl('')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('');
    } catch (e: any) {
      expect(e.getStatus()).toBe(400);
    }
  });

  it('should throw BAD_REQUEST for non-string', () => {
    expect(() => validatePublicHttpUrl(42 as any)).toThrow(HttpException);
  });

  it('should throw BAD_REQUEST for URL exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    expect(() => validatePublicHttpUrl(longUrl)).toThrow(HttpException);
    try {
      validatePublicHttpUrl(longUrl);
    } catch (e: any) {
      expect(e.getStatus()).toBe(400);
    }
  });

  it('should throw BAD_REQUEST for malformed URL', () => {
    expect(() => validatePublicHttpUrl('not-a-url')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('not-a-url');
    } catch (e: any) {
      expect(e.getStatus()).toBe(400);
    }
  });

  it('should throw FORBIDDEN for non-HTTP scheme', () => {
    expect(() => validatePublicHttpUrl('ftp://example.com/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('ftp://example.com/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
    }
  });

  it('should throw FORBIDDEN for private IP 192.168.1.1', () => {
    expect(() => validatePublicHttpUrl('http://192.168.1.1/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('http://192.168.1.1/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('blocked IP');
    }
  });

  it('should throw FORBIDDEN for localhost', () => {
    expect(() => validatePublicHttpUrl('http://localhost/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('http://localhost/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('internal/reserved hostname');
    }
  });

  it('should throw FORBIDDEN for cloud metadata 169.254.169.254', () => {
    expect(() => validatePublicHttpUrl('http://169.254.169.254/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('http://169.254.169.254/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
    }
  });

  it('should throw FORBIDDEN for kubernetes.default', () => {
    expect(() => validatePublicHttpUrl('https://kubernetes.default/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('https://kubernetes.default/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('internal/reserved');
    }
  });

  it('should throw FORBIDDEN for URL with credentials', () => {
    expect(() => validatePublicHttpUrl('http://user:pass@example.com/')).toThrow(HttpException);
    try {
      validatePublicHttpUrl('http://user:pass@example.com/');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('credentials');
    }
  });
});

// ─── validateWebhookUrl ───────────────────────────────────────────

describe('validateWebhookUrl', () => {
  it('should not throw for valid HTTPS webhook URL', () => {
    expect(() => validateWebhookUrl('https://example.com/webhook')).not.toThrow();
  });

  it('should throw FORBIDDEN for HTTP webhook URL (must be HTTPS)', () => {
    expect(() => validateWebhookUrl('http://example.com/webhook')).toThrow(HttpException);
    try {
      validateWebhookUrl('http://example.com/webhook');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('HTTPS');
    }
  });

  it('should throw FORBIDDEN for URL shortener domains', () => {
    expect(() => validateWebhookUrl('https://bit.ly/abc123')).toThrow(HttpException);
    try {
      validateWebhookUrl('https://bit.ly/abc123');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toContain('shortener');
    }
  });

  it('should reject tinyurl.com', () => {
    expect(() => validateWebhookUrl('https://tinyurl.com/abc')).toThrow(HttpException);
  });

  it('should reject t.co', () => {
    expect(() => validateWebhookUrl('https://t.co/abc')).toThrow(HttpException);
  });
});
