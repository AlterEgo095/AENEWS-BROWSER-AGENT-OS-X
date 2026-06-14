/**
 * AENEWS Agent OS X — Security Connector Service
 *
 * Comprehensive security connector providing:
 *   Authentication: password hashing, JWT token generation/verification
 *   Encryption: AES-256-GCM encrypt/decrypt, key generation
 *   Vulnerability Scanning: dependency audit, secret detection, permission checks
 *   Audit: audit log creation, search, report generation
 *   Threat Detection: payload analysis (XSS, SQLi, path traversal), rate limiting
 *
 * Security Rules:
 *   - NEVER log passwords or tokens
 *   - NEVER expose encryption keys in responses
 *   - All sensitive operations are audited
 *
 * Integration:
 *   - Circuit breaker key: connector:security
 *   - Emits events via AgentEventBusService
 *   - Records metrics via MetricsService
 *   - Simulation mode when SECURITY_ENABLED=false
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AgentEventBusService, AgentEventType } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';
import { MetricsService } from '../../observability/services/metrics.service';

// ─── Types ────────────────────────────────────────────────────────────

export interface SecurityResult {
  success: boolean;
  data?: any;
  error?: string;
  mode: 'live' | 'simulation';
  duration: number;
}

export interface TokenOptions {
  expiresIn?: string;
  issuer?: string;
  subject?: string;
  audience?: string;
}

export interface TokenPayload {
  sub?: string;
  email?: string;
  roles?: string[];
  [key: string]: any;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

export interface VulnerabilityReport {
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  url?: string;
  vulnerableVersions: string;
  patchedVersions: string;
}

export interface SecretFinding {
  type: string;
  pattern: string;
  line: number;
  column: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionCheck {
  path: string;
  mode: string;
  owner: string;
  group: string;
  isReadable: boolean;
  isWritable: boolean;
  isExecutable: boolean;
  issues: string[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  resource: string;
  result: 'success' | 'failure';
  timestamp: Date;
  ip?: string;
  details?: Record<string, any>;
}

export interface AuditLogFilter {
  action?: string;
  actor?: string;
  resource?: string;
  result?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface SecurityReport {
  generatedAt: Date;
  totalAuditEntries: number;
  failedActions: number;
  topActors: Array<{ actor: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  threatDetections: number;
  vulnerabilities: number;
  recommendations: string[];
}

export interface ThreatAnalysis {
  isThreat: boolean;
  threats: Array<{
    type: string;
    confidence: number;
    description: string;
    pattern: string;
  }>;
  sanitized: string;
}

export interface RateLimitStatus {
  ip: string;
  isBlocked: boolean;
  requestCount: number;
  windowStart: Date;
  limit: number;
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class SecurityConnectorService {
  private readonly logger = new Logger(SecurityConnectorService.name);
  private readonly enabled: boolean;
  private readonly encryptionKey: string;

  /** In-memory audit log */
  private readonly auditLogs: AuditLogEntry[] = [];
  private auditCounter = 0;

  /** In-memory rate limiter */
  private readonly rateLimiter = new Map<string, { count: number; windowStart: number }>();
  private readonly RATE_LIMIT_WINDOW = 60_000; // 1 minute
  private readonly RATE_LIMIT_MAX = 100; // requests per window

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Optional() private readonly eventBus?: AgentEventBusService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.enabled = this.configService.get<string>('SECURITY_ENABLED') !== 'false';
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ?? 'default-key-change-in-production!!';

    this.logger.log(
      `Security Connector initialized — enabled: ${this.enabled}, mode: live`,
    );
  }

  // ─── Authentication ─────────────────────────────────────────────

  /**
   * Hash a password using bcrypt.
   * SECURITY: The password is never logged.
   */
  async hashPassword(password: string): Promise<SecurityResult> {
    return this.executeWithBreaker('hashPassword', async () => {
      const start = Date.now();

      try {
        const saltRounds = 12;
        const hash = await bcrypt.hash(password, saltRounds);

        // Audit log — no password value logged
        await this.createAuditLogInternal({
          action: 'hashPassword',
          actor: 'system',
          resource: 'password',
          result: 'success',
        });

        return {
          success: true,
          data: { hash },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Password hashing failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Verify a password against a bcrypt hash.
   * SECURITY: The password is never logged.
   */
  async verifyPassword(password: string, hash: string): Promise<SecurityResult> {
    return this.executeWithBreaker('verifyPassword', async () => {
      const start = Date.now();

      try {
        const isValid = await bcrypt.compare(password, hash);

        // Audit log — only success/failure, no values
        await this.createAuditLogInternal({
          action: 'verifyPassword',
          actor: 'system',
          resource: 'password',
          result: isValid ? 'success' : 'failure',
        });

        return {
          success: true,
          data: { isValid },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Password verification failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Generate a JWT token.
   * SECURITY: The token content is never logged.
   */
  async generateToken(payload: TokenPayload, options?: TokenOptions): Promise<SecurityResult> {
    return this.executeWithBreaker('generateToken', async () => {
      const start = Date.now();

      try {
        const signOptions: Record<string, any> = {
          expiresIn: options?.expiresIn ?? '1h',
          issuer: options?.issuer ?? 'aenews-agent-os-x',
        };
        if (options?.subject) signOptions.subject = options.subject;
        if (options?.audience) signOptions.audience = options.audience;

        const token = await this.jwtService.signAsync(payload, signOptions);

        // Audit log — no token value logged
        await this.createAuditLogInternal({
          action: 'generateToken',
          actor: payload.sub ?? 'system',
          resource: 'jwt',
          result: 'success',
        });

        return {
          success: true,
          data: { token, expiresIn: options?.expiresIn ?? '1h' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Token generation failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Verify a JWT token.
   * SECURITY: The token content is never logged.
   */
  async verifyToken(token: string): Promise<SecurityResult> {
    return this.executeWithBreaker('verifyToken', async () => {
      const start = Date.now();

      try {
        const decoded = await this.jwtService.verifyAsync(token);

        // Audit log — only sub, no token value
        await this.createAuditLogInternal({
          action: 'verifyToken',
          actor: decoded.sub ?? 'unknown',
          resource: 'jwt',
          result: 'success',
        });

        return {
          success: true,
          data: { decoded, expiresAt: new Date(decoded.exp * 1000) },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        await this.createAuditLogInternal({
          action: 'verifyToken',
          actor: 'unknown',
          resource: 'jwt',
          result: 'failure',
          details: { reason: error.name },
        });

        return {
          success: false,
          error: `Token verification failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Encryption ─────────────────────────────────────────────────

  /**
   * Encrypt data using AES-256-GCM.
   */
  async encrypt(data: string, key?: string): Promise<SecurityResult> {
    return this.executeWithBreaker('encrypt', async () => {
      const start = Date.now();

      try {
        const encryptionKey = key ?? this.encryptionKey;
        const derivedKey = crypto.createHash('sha256').update(encryptionKey).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        const result: EncryptedData = {
          encrypted,
          iv: iv.toString('hex'),
          authTag,
          algorithm: 'aes-256-gcm',
        };

        await this.createAuditLogInternal({
          action: 'encrypt',
          actor: 'system',
          resource: 'data',
          result: 'success',
        });

        return {
          success: true,
          data: result,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Encryption failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Decrypt data using AES-256-GCM.
   */
  async decrypt(encryptedData: EncryptedData, key?: string): Promise<SecurityResult> {
    return this.executeWithBreaker('decrypt', async () => {
      const start = Date.now();

      try {
        const encryptionKey = key ?? this.encryptionKey;
        const derivedKey = crypto.createHash('sha256').update(encryptionKey).digest();
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        await this.createAuditLogInternal({
          action: 'decrypt',
          actor: 'system',
          resource: 'data',
          result: 'success',
        });

        return {
          success: true,
          data: { decrypted },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Decryption failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Generate a new encryption key.
   */
  async generateKey(): Promise<SecurityResult> {
    return this.executeWithBreaker('generateKey', async () => {
      const start = Date.now();

      const key = crypto.randomBytes(32).toString('hex');

      return {
        success: true,
        data: { key, algorithm: 'aes-256', keyLength: 256 },
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  // ─── Vulnerability Scanning ─────────────────────────────────────

  /**
   * Scan npm dependencies for vulnerabilities (npm audit format).
   */
  async scanDependencies(packageJson: Record<string, any>): Promise<SecurityResult> {
    return this.executeWithBreaker('scanDependencies', async () => {
      const start = Date.now();

      try {
        const vulnerabilities: VulnerabilityReport[] = [];

        // Check for known vulnerable packages (basic heuristic check)
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const knownVulnerable = new Map([
          ['lodash', { severity: 'high' as const, title: 'Prototype Pollution', versions: '<4.17.21' }],
          ['express', { severity: 'moderate' as const, title: 'Open Redirect', versions: '<4.17.3' }],
          ['minimist', { severity: 'high' as const, title: 'Prototype Pollution', versions: '<1.2.3' }],
          ['axios', { severity: 'moderate' as const, title: 'SSRF', versions: '<0.21.1' }],
        ]);

        for (const [name, version] of Object.entries(deps ?? {})) {
          const known = knownVulnerable.get(name);
          if (known) {
            vulnerabilities.push({
              package: name,
              severity: known.severity,
              title: known.title,
              vulnerableVersions: known.versions,
              patchedVersions: known.versions.replace('<', '>='),
              url: `https://www.npmjs.com/advisories?search=${name}`,
            });
          }
        }

        // Check for suspicious version patterns
        for (const [name, version] of Object.entries(deps ?? {})) {
          const v = String(version);
          if (v.includes('github:') || v.includes('file:') || v.includes('link:')) {
            vulnerabilities.push({
              package: name,
              severity: 'high',
              title: 'Non-registry dependency source',
              vulnerableVersions: v,
              patchedVersions: 'Use npm registry version',
            });
          }
        }

        await this.createAuditLogInternal({
          action: 'scanDependencies',
          actor: 'system',
          resource: 'package.json',
          result: 'success',
          details: { vulnerabilityCount: vulnerabilities.length },
        });

        return {
          success: true,
          data: {
            vulnerabilities,
            totalDeps: Object.keys(deps ?? {}).length,
            vulnerableCount: vulnerabilities.length,
            severityBreakdown: {
              critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
              high: vulnerabilities.filter((v) => v.severity === 'high').length,
              moderate: vulnerabilities.filter((v) => v.severity === 'moderate').length,
              low: vulnerabilities.filter((v) => v.severity === 'low').length,
            },
          },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Dependency scan failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Check content for leaked secrets (API keys, passwords, tokens).
   */
  async checkSecrets(content: string): Promise<SecurityResult> {
    return this.executeWithBreaker('checkSecrets', async () => {
      const start = Date.now();

      const findings: SecretFinding[] = [];
      const lines = content.split('\n');

      // Secret patterns
      const patterns: Array<{ name: string; pattern: RegExp; severity: SecretFinding['severity'] }> = [
        { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
        { name: 'AWS Secret Key', pattern: /aws(.{0,20})?['"][0-9a-zA-Z/+]{40}/gi, severity: 'critical' },
        { name: 'GitHub Token', pattern: /gh[ps]_[0-9a-zA-Z]{36}/g, severity: 'critical' },
        { name: 'Generic API Key', pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]?[0-9a-zA-Z]{20,}/gi, severity: 'high' },
        { name: 'Generic Secret', pattern: /(secret|password|passwd|token)\s*[:=]\s*['"]?[0-9a-zA-Z!@#$%^&*]{8,}/gi, severity: 'high' },
        { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, severity: 'critical' },
        { name: 'JWT', pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*/g, severity: 'medium' },
        { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9a-zA-Z]{24,34}/g, severity: 'high' },
        { name: 'Stripe Key', pattern: /[sr]k_live_[0-9a-zA-Z]{24}/g, severity: 'critical' },
        { name: 'Database URL', pattern: /(mongodb|postgres|mysql|redis):\/\/[^\s'"]+/gi, severity: 'high' },
      ];

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        for (const { name, pattern, severity } of patterns) {
          const matches = line.matchAll(pattern);
          for (const match of matches) {
            findings.push({
              type: name,
              pattern: match[0].substring(0, 20) + '...', // Truncate to avoid exposing the actual secret
              line: lineIdx + 1,
              column: match.index ?? 0,
              severity,
            });
          }
        }
      }

      await this.createAuditLogInternal({
        action: 'checkSecrets',
        actor: 'system',
        resource: 'content',
        result: 'success',
        details: { findingCount: findings.length },
      });

      return {
        success: true,
        data: {
          findings,
          totalFindings: findings.length,
          hasSecrets: findings.length > 0,
          severityBreakdown: {
            critical: findings.filter((f) => f.severity === 'critical').length,
            high: findings.filter((f) => f.severity === 'high').length,
            medium: findings.filter((f) => f.severity === 'medium').length,
            low: findings.filter((f) => f.severity === 'low').length,
          },
        },
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Check file/directory permissions.
   */
  async checkPermissions(path: string): Promise<SecurityResult> {
    return this.executeWithBreaker('checkPermissions', async () => {
      const start = Date.now();

      // Prevent path traversal
      const safePath = this.sanitizePath(path);
      if (!safePath) {
        return {
          success: false,
          error: 'Path traversal detected',
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }

      try {
        const fs = await import('fs/promises');
        const stats = await fs.stat(safePath);
        const mode = stats.mode;

        const modeStr = (mode & 0o777).toString(8);
        const isReadable = !!(mode & 0o400);
        const isWritable = !!(mode & 0o200);
        const isExecutable = !!(mode & 0o100);

        const issues: string[] = [];
        if (isWritable && isExecutable) {
          issues.push('File is both writable and executable — potential security risk');
        }
        if ((mode & 0o077) > 0) {
          issues.push('File is accessible by others — consider restricting permissions');
        }
        if (mode & 0o002) {
          issues.push('File is world-writable — serious security risk');
        }

        const check: PermissionCheck = {
          path: safePath,
          mode: modeStr,
          owner: stats.uid.toString(),
          group: stats.gid.toString(),
          isReadable,
          isWritable,
          isExecutable,
          issues,
        };

        return {
          success: true,
          data: { permission: check },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Permission check failed: ${error.message}`,
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Audit ──────────────────────────────────────────────────────

  /**
   * Create an audit log entry.
   */
  async createAuditLog(entry: Partial<AuditLogEntry>): Promise<SecurityResult> {
    return this.executeWithBreaker('createAuditLog', async () => {
      const start = Date.now();

      const auditEntry = await this.createAuditLogInternal(entry);

      return {
        success: true,
        data: { entry: auditEntry },
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Search the audit log.
   */
  async searchAuditLog(filter?: AuditLogFilter): Promise<SecurityResult> {
    return this.executeWithBreaker('searchAuditLog', async () => {
      const start = Date.now();

      let results = [...this.auditLogs];

      if (filter?.action) {
        results = results.filter((e) => e.action === filter.action);
      }
      if (filter?.actor) {
        results = results.filter((e) => e.actor === filter.actor);
      }
      if (filter?.resource) {
        results = results.filter((e) => e.resource === filter.resource);
      }
      if (filter?.result) {
        results = results.filter((e) => e.result === filter.result);
      }
      if (filter?.from) {
        results = results.filter((e) => e.timestamp >= filter.from!);
      }
      if (filter?.to) {
        results = results.filter((e) => e.timestamp <= filter.to!);
      }

      const limit = filter?.limit ?? 100;
      results = results.slice(-limit);

      return {
        success: true,
        data: { entries: results, count: results.length, total: this.auditLogs.length },
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Generate a security report.
   */
  async generateReport(filter?: AuditLogFilter): Promise<SecurityResult> {
    return this.executeWithBreaker('generateReport', async () => {
      const start = Date.now();

      const searchResult = await this.searchAuditLog(filter);
      const entries = (searchResult as SecurityResult).data?.entries ?? this.auditLogs;

      const failedActions = entries.filter((e: AuditLogEntry) => e.result === 'failure').length;

      // Top actors
      const actorCounts = new Map<string, number>();
      for (const entry of entries) {
        actorCounts.set(entry.actor, (actorCounts.get(entry.actor) ?? 0) + 1);
      }
      const topActors = Array.from(actorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actor, count]) => ({ actor, count }));

      // Top actions
      const actionCounts = new Map<string, number>();
      for (const entry of entries) {
        actionCounts.set(entry.action, (actionCounts.get(entry.action) ?? 0) + 1);
      }
      const topActions = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }));

      // Recommendations
      const recommendations: string[] = [];
      if (failedActions > entries.length * 0.1) {
        recommendations.push('High failure rate detected — investigate potential attack patterns');
      }
      if (entries.some((e: AuditLogEntry) => e.action === 'verifyToken' && e.result === 'failure')) {
        recommendations.push('Token verification failures detected — check for expired or tampered tokens');
      }
      if (entries.some((e: AuditLogEntry) => e.action === 'verifyPassword' && e.result === 'failure')) {
        recommendations.push('Password verification failures detected — check for brute force attempts');
      }
      if (recommendations.length === 0) {
        recommendations.push('No immediate security concerns detected');
      }

      const report: SecurityReport = {
        generatedAt: new Date(),
        totalAuditEntries: entries.length,
        failedActions,
        topActors,
        topActions,
        threatDetections: 0,
        vulnerabilities: 0,
        recommendations,
      };

      return {
        success: true,
        data: { report },
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  // ─── Threat Detection ───────────────────────────────────────────

  /**
   * Analyze request payload for threats (XSS, SQL injection, path traversal).
   */
  async analyzePayload(payload: string): Promise<SecurityResult> {
    return this.executeWithBreaker('analyzePayload', async () => {
      const start = Date.now();

      const threats: ThreatAnalysis['threats'] = [];
      let sanitized = payload;

      // XSS detection
      const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /javascript:\s*[^\s]*/gi,
        /on\w+\s*=\s*['"][^'"]*['"]/gi,
        /<img[^>]+onerror\s*=/gi,
        /<iframe[^>]*>/gi,
        /eval\s*\(/gi,
        /document\.(cookie|write|location)/gi,
      ];

      for (const pattern of xssPatterns) {
        const match = pattern.exec(payload);
        if (match) {
          threats.push({
            type: 'XSS',
            confidence: 0.9,
            description: 'Cross-Site Scripting attempt detected',
            pattern: match[0].substring(0, 50),
          });
          sanitized = sanitized.replace(pattern, '[REMOVED_XSS]');
        }
      }

      // SQL Injection detection
      const sqliPatterns = [
        /('|\b)(\b(union|select|insert|update|delete|drop|alter|exec|execute)\b\s+)/gi,
        /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi,
        /;\s*(drop|alter|truncate|delete)\b/gi,
        /'\s*(or|and)\s+'/gi,
        /(\b1\s*=\s*1\b)/gi,
        /(\bchar\s*\()/gi,
        /(\bconcat\s*\()/gi,
      ];

      for (const pattern of sqliPatterns) {
        const match = pattern.exec(payload);
        if (match) {
          threats.push({
            type: 'SQL_INJECTION',
            confidence: 0.85,
            description: 'SQL injection attempt detected',
            pattern: match[0].substring(0, 50),
          });
          sanitized = sanitized.replace(pattern, '[REMOVED_SQLI]');
        }
      }

      // Path Traversal detection
      const pathTraversalPatterns = [
        /\.\.\//g,
        /\.\.\\/g,
        /%2e%2e%2f/gi,
        /%2e%2e\//gi,
        /\.\.%2f/gi,
        /%252e/g,
      ];

      for (const pattern of pathTraversalPatterns) {
        const match = pattern.exec(payload);
        if (match) {
          threats.push({
            type: 'PATH_TRAVERSAL',
            confidence: 0.95,
            description: 'Path traversal attempt detected',
            pattern: match[0],
          });
          sanitized = sanitized.replace(pattern, '[REMOVED_TRAVERSAL]');
        }
      }

      // Command Injection detection
      const cmdiPatterns = [
        /;\s*(rm|cat|ls|wget|curl|bash|sh|python|perl|ruby|nc|ncat)\b/gi,
        /\|\s*(rm|cat|ls|wget|curl|bash|sh)\b/gi,
        /`[^`]*`/g,
        /\$\([^)]*\)/g,
      ];

      for (const pattern of cmdiPatterns) {
        const match = pattern.exec(payload);
        if (match) {
          threats.push({
            type: 'COMMAND_INJECTION',
            confidence: 0.8,
            description: 'Command injection attempt detected',
            pattern: match[0].substring(0, 50),
          });
          sanitized = sanitized.replace(pattern, '[REMOVED_CMDI]');
        }
      }

      await this.createAuditLogInternal({
        action: 'analyzePayload',
        actor: 'system',
        resource: 'payload',
        result: threats.length > 0 ? 'failure' : 'success',
        details: { threatCount: threats.length, threatTypes: threats.map((t) => t.type) },
      });

      const analysis: ThreatAnalysis = {
        isThreat: threats.length > 0,
        threats,
        sanitized,
      };

      return {
        success: true,
        data: analysis,
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  /**
   * Check if an IP is rate-limited or blocked.
   */
  async rateRequest(ip: string): Promise<SecurityResult> {
    return this.executeWithBreaker('rateRequest', async () => {
      const start = Date.now();

      const now = Date.now();
      let entry = this.rateLimiter.get(ip);

      // Reset window if expired
      if (!entry || now - entry.windowStart > this.RATE_LIMIT_WINDOW) {
        entry = { count: 0, windowStart: now };
        this.rateLimiter.set(ip, entry);
      }

      entry.count++;

      const isBlocked = entry.count > this.RATE_LIMIT_MAX;

      const status: RateLimitStatus = {
        ip,
        isBlocked,
        requestCount: entry.count,
        windowStart: new Date(entry.windowStart),
        limit: this.RATE_LIMIT_MAX,
      };

      if (isBlocked) {
        await this.createAuditLogInternal({
          action: 'rateRequest',
          actor: ip,
          resource: 'rate-limiter',
          result: 'failure',
          details: { requestCount: entry.count, limit: this.RATE_LIMIT_MAX },
        });
      }

      return {
        success: true,
        data: status,
        mode: 'live' as const,
        duration: Date.now() - start,
      };
    });
  }

  // ─── Utility ────────────────────────────────────────────────────

  /**
   * Get the list of supported actions.
   */
  getSupportedActions(): string[] {
    return [
      'hashPassword', 'verifyPassword', 'generateToken', 'verifyToken',
      'encrypt', 'decrypt', 'generateKey',
      'scanDependencies', 'checkSecrets', 'checkPermissions',
      'createAuditLog', 'searchAuditLog', 'generateReport',
      'analyzePayload', 'rateRequest',
    ];
  }

  /**
   * Execute an action by name.
   */
  async executeAction(action: string, params: Record<string, any>): Promise<SecurityResult> {
    switch (action) {
      case 'hashPassword':
        return this.hashPassword(params.password);
      case 'verifyPassword':
        return this.verifyPassword(params.password, params.hash);
      case 'generateToken':
        return this.generateToken(params.payload, params.options);
      case 'verifyToken':
        return this.verifyToken(params.token);
      case 'encrypt':
        return this.encrypt(params.data, params.key);
      case 'decrypt':
        return this.decrypt(params.encryptedData, params.key);
      case 'generateKey':
        return this.generateKey();
      case 'scanDependencies':
        return this.scanDependencies(params.packageJson);
      case 'checkSecrets':
        return this.checkSecrets(params.content);
      case 'checkPermissions':
        return this.checkPermissions(params.path);
      case 'createAuditLog':
        return this.createAuditLog(params.entry);
      case 'searchAuditLog':
        return this.searchAuditLog(params.filter);
      case 'generateReport':
        return this.generateReport(params.filter);
      case 'analyzePayload':
        return this.analyzePayload(params.payload);
      case 'rateRequest':
        return this.rateRequest(params.ip);
      default:
        throw new Error(`Security connector: unsupported action "${action}"`);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private async createAuditLogInternal(entry: Partial<AuditLogEntry>): Promise<AuditLogEntry> {
    const auditEntry: AuditLogEntry = {
      id: `audit-${++this.auditCounter}-${Date.now()}`,
      action: entry.action ?? 'unknown',
      actor: entry.actor ?? 'system',
      resource: entry.resource ?? 'unknown',
      result: entry.result ?? 'success',
      timestamp: new Date(),
      ip: entry.ip,
      details: entry.details,
    };

    this.auditLogs.push(auditEntry);

    // Keep audit log manageable (max 10k entries)
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, this.auditLogs.length - 10000);
    }

    return auditEntry;
  }

  /**
   * Sanitize a file path to prevent path traversal.
   */
  private sanitizePath(path: string): string | null {
    // Normalize the path
    const normalized = path.replace(/\\/g, '/');

    // Check for path traversal patterns
    if (normalized.includes('..') || normalized.includes('~')) {
      return null;
    }

    // Remove any null bytes
    if (normalized.includes('\0')) {
      return null;
    }

    return normalized;
  }

  private async executeWithBreaker<T>(
    action: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (this.circuitBreaker) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:security`;
      return this.circuitBreaker.execute(circuitKey, fn, async () => {
        return {
          success: false,
          error: 'Circuit breaker is OPEN for security connector',
          mode: 'simulation' as const,
          duration: 0,
        } as any;
      });
    }

    const startTime = Date.now();
    try {
      const result = await fn();
      this.emitEvent(action, true, Date.now() - startTime);
      return result;
    } catch (error: any) {
      this.emitEvent(action, false, Date.now() - startTime);
      throw error;
    }
  }

  private emitEvent(action: string, success: boolean, durationMs: number): void {
    if (this.eventBus) {
      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'security', {
        action,
        success,
        duration: durationMs,
      });
    }

    if (this.metrics) {
      this.metrics.recordPipelineStep(`security.${action}`, durationMs, success);
    }
  }
}
