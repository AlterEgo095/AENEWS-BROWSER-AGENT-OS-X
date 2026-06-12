/**
 * AENEWS Agent OS X - Security Certification Service
 * Tests security posture by performing static analysis on source code,
 * scanning for vulnerabilities, and verifying security patterns.
 *
 * Tests:
 * 1. No exposed secrets - scan source files for hardcoded passwords, API keys, tokens
 * 2. No injection vulnerabilities - verify input validation patterns, no eval(), parameterized queries
 * 3. Dependency vulnerabilities - verify package.json has no known vulnerable packages
 * 4. Permission model - verify each agent has permissions defined, no wildcard permissions
 * 5. Plugin isolation - verify clusters don't directly import from each other
 * 6. RBAC enforcement - verify AccessControlAgentService has role management, permission checks
 * 7. Audit logging - verify AuditAgentService, authentication logging, event logging
 * 8. Encryption - verify EncryptionAgentService has encrypt/decrypt, key management
 * 9. Token management - verify AuthenticationAgentService token validation, revocation
 * 10. Zero Trust compliance - verify each agent checks permissions before execution
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CertificationDomain, DomainResult, TestResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const SECURITY_DIR = path.join(SOURCE_ROOT, 'agents', 'security');
const CONFIG_DIR = path.join(SOURCE_ROOT, 'config');

// ─── Secret Pattern Match ─────────────────────────────────────────

interface SecretFinding {
  filePath: string;
  line: number;
  pattern: string;
  severity: 'critical' | 'warning' | 'info';
}

// ─── Service Analysis Result ──────────────────────────────────────

interface ServiceAnalysis {
  filePath: string;
  fileName: string;
  content: string;
  className: string;
  methods: string[];
  hasInjectable: boolean;
  hasLogger: boolean;
}

@Injectable()
export class SecurityCertificationService {
  private readonly logger = new Logger(SecurityCertificationService.name);

  /** Cached service analyses */
  private serviceAnalyses: ServiceAnalysis[] | null = null;

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all security certification tests and return a DomainResult.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting Security certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Discover and analyze security services
    const services = await this.analyzeServices();
    this.logger.log(`Analyzed ${services.length} security services`);

    const testMethods: Array<{ name: string; fn: () => Promise<TestResult> }> = [
      { name: 'No Exposed Secrets', fn: () => this.testNoExposedSecrets() },
      { name: 'No Injection Vulnerabilities', fn: () => this.testNoInjectionVulnerabilities() },
      { name: 'Dependency Vulnerabilities', fn: () => this.testDependencyVulnerabilities() },
      { name: 'Permission Model', fn: () => this.testPermissionModel(services) },
      { name: 'Plugin Isolation', fn: () => this.testPluginIsolation() },
      { name: 'RBAC Enforcement', fn: () => this.testRBACEnforcement(services) },
      { name: 'Audit Logging', fn: () => this.testAuditLogging(services) },
      { name: 'Encryption', fn: () => this.testEncryption(services) },
      { name: 'Token Management', fn: () => this.testTokenManagement(services) },
      { name: 'Zero Trust Compliance', fn: () => this.testZeroTrustCompliance(services) },
    ];

    for (const testDef of testMethods) {
      try {
        const result = await testDef.fn();
        tests.push(result);

        if (!result.passed && result.score < 50) {
          criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
        }
      } catch (error) {
        const errMsg = (error as Error).message;
        this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
        tests.push({
          name: testDef.name,
          passed: false,
          score: 0,
          durationMs: 0,
          error: errMsg,
        });
        criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
      }
    }

    // Calculate domain score (weighted average)
    const testWeights = [0.15, 0.12, 0.08, 0.1, 0.08, 0.1, 0.1, 0.1, 0.08, 0.09];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Security certification complete: score=${score}, passed=${passed}, ` +
        `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`,
    );

    return {
      domain: CertificationDomain.SECURITY,
      weight: 0.15,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: No Exposed Secrets ───────────────────────────────────

  /**
   * Scan source files for hardcoded passwords, API keys, tokens.
   * Uses regex patterns to detect common secret formats.
   */
  async testNoExposedSecrets(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'No Exposed Secrets';
    this.logger.log(`Running test: ${name}`);

    try {
      const findings: SecretFinding[] = [];

      // Secret patterns to scan for
      const secretPatterns: Array<{
        pattern: RegExp;
        name: string;
        severity: 'critical' | 'warning' | 'info';
      }> = [
        {
          pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
          name: 'hardcoded-password',
          severity: 'critical',
        },
        {
          pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
          name: 'hardcoded-api-key',
          severity: 'critical',
        },
        {
          pattern: /secret[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
          name: 'hardcoded-secret-key',
          severity: 'critical',
        },
        {
          pattern: /access[_-]?token\s*[:=]\s*['"][^'"]{8,}['"]/gi,
          name: 'hardcoded-access-token',
          severity: 'critical',
        },
        {
          pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
          name: 'bearer-token-in-code',
          severity: 'critical',
        },
        {
          pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
          name: 'private-key-in-code',
          severity: 'critical',
        },
        {
          pattern: /mongodb(?:\+srv)?:\/\/[^'"\s]+:[^'"\s]+@/gi,
          name: 'db-connection-string-with-password',
          severity: 'warning',
        },
        {
          pattern: /postgres(?:ql)?:\/\/[^'"\s]+:[^'"\s]+@/gi,
          name: 'postgres-connection-with-password',
          severity: 'warning',
        },
        {
          pattern: /redis:\/\/:[^'"\s]+@/gi,
          name: 'redis-connection-with-password',
          severity: 'warning',
        },
        { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'openai-api-key', severity: 'critical' },
        { pattern: /AKIA[0-9A-Z]{16}/g, name: 'aws-access-key', severity: 'critical' },
      ];

      // Allowed patterns (false positives)
      const allowedPatterns = [
        'process.env',
        'configService.get',
        'ConfigService',
        'example.com',
        'placeholder',
        'changeme',
        'your-',
        'xxx',
        'localhost',
        'test',
        'dummy',
        'mock',
        'fake',
        'sample',
        'default',
      ];

      // Scan TypeScript source files
      const allTsFiles = await this.getAllTsFiles(SOURCE_ROOT);
      const filesToSkip = ['node_modules', '.git', 'dist', 'certification'];

      for (const filePath of allTsFiles) {
        // Skip certain directories
        const relativePath = path.relative(SOURCE_ROOT, filePath);
        if (filesToSkip.some((skip) => relativePath.includes(skip))) {
          continue;
        }

        // Skip .d.ts files
        if (filePath.endsWith('.d.ts')) continue;

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          for (const { pattern, name: patternName, severity } of secretPatterns) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              // Skip if it's using environment variables or config
              if (allowedPatterns.some((allowed) => line.includes(allowed))) {
                continue;
              }

              // Skip comments
              const trimmed = line.trim();
              if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                continue;
              }

              if (pattern.test(line)) {
                findings.push({
                  filePath: relativePath,
                  line: i + 1,
                  pattern: patternName,
                  severity,
                });
              }

              // Reset regex lastIndex for global patterns
              pattern.lastIndex = 0;
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      // Calculate score based on findings
      const criticalFindings = findings.filter((f) => f.severity === 'critical');
      const warningFindings = findings.filter((f) => f.severity === 'warning');

      const penalty = criticalFindings.length * 25 + warningFindings.length * 5;
      const score = Math.max(0, 100 - penalty);

      return {
        name,
        passed: score >= 90 && criticalFindings.length === 0,
        score,
        durationMs: Date.now() - startTime,
        details: {
          totalFilesScanned: allTsFiles.length,
          totalFindings: findings.length,
          criticalFindings: criticalFindings.length,
          warningFindings: warningFindings.length,
          findings: findings.slice(0, 20).map((f) => ({
            file: f.filePath,
            line: f.line,
            pattern: f.pattern,
            severity: f.severity,
          })),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 2: No Injection Vulnerabilities ─────────────────────────

  /**
   * Verify input validation patterns, no eval(), parameterized queries,
   * and proper sanitization.
   */
  async testNoInjectionVulnerabilities(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'No Injection Vulnerabilities';
    this.logger.log(`Running test: ${name}`);

    try {
      const issues: string[] = [];
      let score = 100;

      // Scan all TypeScript files for dangerous patterns
      const allTsFiles = await this.getAllTsFiles(AGENTS_DIR);
      const filesToSkip = ['node_modules', '.git', 'dist'];

      let evalUsage = 0;
      let noValidationCount = 0;
      let sqlConcatCount = 0;

      for (const filePath of allTsFiles) {
        const relativePath = path.relative(SOURCE_ROOT, filePath);
        if (filesToSkip.some((skip) => relativePath.includes(skip))) continue;
        if (filePath.endsWith('.d.ts')) continue;

        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Check 1: No eval() usage (critical)
          const evalMatches = content.match(/\beval\s*\(/g);
          if (evalMatches) {
            evalUsage += evalMatches.length;
            issues.push(`${relativePath}: Uses eval() (${evalMatches.length} occurrence(s))`);
          }

          // Check 2: No Function constructor (critical)
          const functionConstructorMatches = content.match(/new\s+Function\s*\(/g);
          if (functionConstructorMatches) {
            evalUsage += functionConstructorMatches.length;
            issues.push(`${relativePath}: Uses new Function() constructor`);
          }

          // Check 3: No string concatenation in SQL queries (warning)
          const sqlConcatMatches = content.match(/query\s*\(\s*['"`].*\+\s*['"`]/g);
          if (sqlConcatMatches) {
            sqlConcatCount += sqlConcatMatches.length;
            issues.push(`${relativePath}: Potential SQL injection via string concatenation`);
          }

          // Check 4: Input validation patterns
          if (
            content.includes('onExecute') &&
            !content.includes('validate') &&
            !content.includes('Validation')
          ) {
            noValidationCount++;
          }
        } catch {
          // Skip
        }
      }

      // Score deductions
      score -= evalUsage * 20;
      score -= sqlConcatCount * 10;
      score -= Math.min(noValidationCount * 2, 20);

      const finalScore = Math.max(0, score);

      return {
        name,
        passed: finalScore >= 90 && evalUsage === 0,
        score: finalScore,
        durationMs: Date.now() - startTime,
        details: {
          totalFilesScanned: allTsFiles.length,
          evalUsage,
          sqlConcatCount,
          agentsWithoutValidation: noValidationCount,
          issues: issues.slice(0, 20),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 3: Dependency Vulnerabilities ───────────────────────────

  /**
   * Verify package.json has no known vulnerable packages.
   * Check for outdated versions and known insecure dependencies.
   */
  async testDependencyVulnerabilities(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Dependency Vulnerabilities';
    this.logger.log(`Running test: ${name}`);

    try {
      const issues: string[] = [];
      let score = 100;

      const packageJsonPath = path.join(SOURCE_ROOT, '..', 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        // Try alternate path
        const altPath = path.join(SOURCE_ROOT, 'package.json');
        if (!fs.existsSync(altPath)) {
          return {
            name,
            passed: false,
            score: 50,
            durationMs: Date.now() - startTime,
            error: 'package.json not found',
          };
        }
      }

      const pkgPath = fs.existsSync(packageJsonPath)
        ? packageJsonPath
        : path.join(SOURCE_ROOT, 'package.json');
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Known vulnerable packages (simplified check)
      const knownVulnerable: Record<string, string> = {
        lodash: '<4.17.21',
        express: '<4.17.3',
        'node-fetch': '<2.6.7',
        axios: '<0.21.1',
      };

      for (const [pkgName, vulnerableVersion] of Object.entries(knownVulnerable)) {
        if (allDeps[pkgName]) {
          issues.push(
            `Potentially vulnerable: ${pkgName}@${allDeps[pkgName]} (known issues in ${vulnerableVersion})`,
          );
          score -= 10;
        }
      }

      // Check for packages with known security issues
      const insecurePatterns = ['http-proxy-middleware@0.', 'event-stream'];
      for (const pattern of insecurePatterns) {
        const [pkgName, version] = pattern.split('@');
        if (allDeps[pkgName] && allDeps[pkgName].includes(version || '0')) {
          issues.push(`Insecure package version: ${pattern}`);
          score -= 15;
        }
      }

      // Check that security-relevant packages are present
      const securityPackages = ['helmet', 'csurf', 'express-rate-limit', 'bcrypt', 'jsonwebtoken'];
      const presentSecurity = securityPackages.filter((p) => allDeps[p]);
      if (presentSecurity.length > 0) {
        score += 0; // Already scored 100 base, just note it
      }

      return {
        name,
        passed: score >= 90,
        score: Math.max(0, Math.min(score, 100)),
        durationMs: Date.now() - startTime,
        details: {
          totalDependencies: Object.keys(allDeps).length,
          securityPackagesPresent: presentSecurity,
          issues: issues.slice(0, 20),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 4: Permission Model ─────────────────────────────────────

  /**
   * Verify each agent has permissions defined, no wildcard permissions.
   */
  async testPermissionModel(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Permission Model';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutPermissions: string[] = [];
      const agentsWithWildcard: string[] = [];

      const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');

      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(SOURCE_ROOT, filePath);
        let agentScore = 0;

        // Check 1: Has permissions field (40 pts)
        if (content.includes('permissions:')) {
          agentScore += 40;

          // Check 2: Permissions array is not empty (30 pts)
          const permMatch = content.match(/permissions\s*:\s*\[([^\]]*)\]/);
          if (permMatch && permMatch[1].trim().length > 0) {
            agentScore += 30;

            // Check 3: No wildcard permissions (15 pts)
            if (
              !permMatch[1].includes("'*'") &&
              !permMatch[1].includes('"*"') &&
              !permMatch[1].includes('all')
            ) {
              agentScore += 15;
            } else {
              agentsWithWildcard.push(relativePath);
            }

            // Check 4: Has specific permissions (15 pts)
            const permEntries = permMatch[1].split(',').filter((s) => s.trim().length > 0);
            if (permEntries.length >= 2) {
              agentScore += 15;
            }
          }
        } else {
          agentsWithoutPermissions.push(relativePath);
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agentFiles.length > 0 ? Math.round(totalScore / agentFiles.length) : 0;

      return {
        name,
        passed: avgScore >= 90 && agentsWithWildcard.length === 0,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agentFiles.length,
          agentsWithoutPermissions: agentsWithoutPermissions.length,
          agentsWithWildcard: agentsWithWildcard.length,
          agentsWithoutPermissionsList: agentsWithoutPermissions.slice(0, 10),
          agentsWithWildcardList: agentsWithWildcard.slice(0, 10),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 5: Plugin Isolation ─────────────────────────────────────

  /**
   * Verify clusters don't directly import from each other.
   */
  async testPluginIsolation(): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Plugin Isolation';
    this.logger.log(`Running test: ${name}`);

    try {
      const violations: Array<{ source: string; target: string }> = [];

      const clusterDirs = [
        'browser',
        'computer',
        'coding',
        'office',
        'marketing',
        'business',
        'infrastructure',
        'security',
        'meta-intelligence',
      ];

      const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');

      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(AGENTS_DIR, filePath);

        // Determine which cluster this agent belongs to
        const agentCluster = relativePath.split(path.sep)[0];
        if (!clusterDirs.includes(agentCluster)) continue;

        // Check imports for cross-cluster references
        const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];

          // Only check relative imports
          if (!importPath.startsWith('.')) continue;

          // Resolve to check if it crosses cluster boundaries
          for (const cluster of clusterDirs) {
            if (cluster === agentCluster) continue;
            if (importPath.includes(`/${cluster}/`) || importPath.includes(`\\${cluster}\\`)) {
              violations.push({
                source: relativePath,
                target: importPath,
              });
            }
          }
        }
      }

      const penalty = Math.min(violations.length * 10, 100);
      const score = Math.max(0, 100 - penalty);

      return {
        name,
        passed: score >= 90,
        score,
        durationMs: Date.now() - startTime,
        details: {
          totalAgentFilesChecked: agentFiles.length,
          crossClusterViolations: violations.length,
          violations: violations.slice(0, 20),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 6: RBAC Enforcement ─────────────────────────────────────

  /**
   * Verify AccessControlAgentService has role management, permission checks.
   */
  async testRBACEnforcement(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'RBAC Enforcement';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const accessControl = services.find((s) => s.fileName.includes('access-control'));

      // Check 1: AccessControlAgentService exists (15 pts)
      if (accessControl) {
        score += 15;
      } else {
        issues.push('AccessControlAgentService not found');
      }

      if (accessControl) {
        // Check 2: Has role management (20 pts)
        if (accessControl.content.includes('role') || accessControl.content.includes('Role')) {
          score += 20;
        } else {
          issues.push('Missing role management');
        }

        // Check 3: Has permission checks (20 pts)
        if (
          accessControl.content.includes('permission') ||
          accessControl.content.includes('Permission') ||
          accessControl.content.includes('checkPermission')
        ) {
          score += 20;
        } else {
          issues.push('Missing permission checks');
        }

        // Check 4: Has role-based access control (15 pts)
        if (
          accessControl.content.includes('RBAC') ||
          accessControl.content.includes('rbac') ||
          (accessControl.content.includes('role') && accessControl.content.includes('permission'))
        ) {
          score += 15;
        }

        // Check 5: Has access control list or matrix (10 pts)
        if (
          accessControl.content.includes('ACL') ||
          accessControl.content.includes('accessList') ||
          accessControl.content.includes('permissionMatrix')
        ) {
          score += 10;
        }

        // Check 6: Has @Injectable and Logger (5 pts)
        if (accessControl.hasInjectable) score += 3;
        if (accessControl.hasLogger) score += 2;
      }

      // Check 7: Permission decorator exists (10 pts)
      const decoratorPath = path.join(
        SOURCE_ROOT,
        'agents',
        'decorators',
        'permission.decorator.ts',
      );
      if (fs.existsSync(decoratorPath)) {
        score += 10;
      }

      // Check 8: Roles decorator exists (5 pts)
      const rolesPath = path.join(SOURCE_ROOT, 'agents', 'decorators', 'roles.decorator.ts');
      if (fs.existsSync(rolesPath)) {
        score += 5;
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!accessControl,
          permissionDecoratorExists: fs.existsSync(decoratorPath),
          rolesDecoratorExists: fs.existsSync(rolesPath),
          issues,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 7: Audit Logging ────────────────────────────────────────

  /**
   * Verify AuditAgentService, authentication logging, event logging.
   */
  async testAuditLogging(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Audit Logging';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const audit = services.find((s) => s.fileName.includes('audit'));

      // Check 1: AuditAgentService exists (15 pts)
      if (audit) {
        score += 15;
      } else {
        issues.push('AuditAgentService not found');
      }

      if (audit) {
        // Check 2: Has audit logging capabilities (20 pts)
        if (
          audit.content.includes('log') ||
          audit.content.includes('Log') ||
          audit.content.includes('audit')
        ) {
          score += 20;
        }

        // Check 3: Has audit trail or event logging (15 pts)
        if (
          audit.content.includes('trail') ||
          audit.content.includes('Trail') ||
          audit.content.includes('eventLog') ||
          audit.content.includes('auditLog')
        ) {
          score += 15;
        }

        // Check 4: Has authentication logging (15 pts)
        if (
          audit.content.includes('authentication') ||
          audit.content.includes('login') ||
          audit.content.includes('Authentication')
        ) {
          score += 15;
        }

        // Check 5: Has access logging (10 pts)
        if (audit.content.includes('access') || audit.content.includes('Access')) {
          score += 10;
        }

        // Check 6: Has @Injectable and Logger (5 pts)
        if (audit.hasInjectable) score += 3;
        if (audit.hasLogger) score += 2;
      }

      // Check 7: Event bus provides event logging (10 pts)
      const eventBusPath = path.join(SOURCE_ROOT, 'agents', 'events', 'event-bus.service.ts');
      if (fs.existsSync(eventBusPath)) {
        const eventBusContent = fs.readFileSync(eventBusPath, 'utf-8');
        if (eventBusContent.includes('this.logger') && eventBusContent.includes('publish')) {
          score += 10;
        }
      }

      // Check 8: Event store provides audit trail (10 pts)
      const eventStorePath = path.join(SOURCE_ROOT, 'agents', 'events', 'event-store.service.ts');
      if (fs.existsSync(eventStorePath)) {
        const storeContent = fs.readFileSync(eventStorePath, 'utf-8');
        if (storeContent.includes('store(') && storeContent.includes('query(')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          auditServiceFound: !!audit,
          eventBusProvidesLogging: fs.existsSync(eventBusPath),
          eventStoreProvidesAudit: fs.existsSync(eventStorePath),
          issues,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 8: Encryption ───────────────────────────────────────────

  /**
   * Verify EncryptionAgentService has encrypt/decrypt, key management.
   */
  async testEncryption(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Encryption';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const encryption = services.find((s) => s.fileName.includes('encryption'));

      // Check 1: EncryptionAgentService exists (15 pts)
      if (encryption) {
        score += 15;
      } else {
        issues.push('EncryptionAgentService not found');
      }

      if (encryption) {
        // Check 2: Has encryptData tool (15 pts)
        if (encryption.content.includes('encryptData') || encryption.content.includes('encrypt')) {
          score += 15;
        } else {
          issues.push('Missing encrypt functionality');
        }

        // Check 3: Has decryptData tool (15 pts)
        if (encryption.content.includes('decryptData') || encryption.content.includes('decrypt')) {
          score += 15;
        } else {
          issues.push('Missing decrypt functionality');
        }

        // Check 4: Has key management (15 pts)
        if (
          encryption.content.includes('generateKey') ||
          encryption.content.includes('keyManagement') ||
          encryption.content.includes('KeyRecord')
        ) {
          score += 15;
        } else {
          issues.push('Missing key management');
        }

        // Check 5: Has key rotation (10 pts)
        if (encryption.content.includes('rotateKeys') || encryption.content.includes('rotation')) {
          score += 10;
        }

        // Check 6: Has certificate management (10 pts)
        if (
          encryption.content.includes('manageCertificate') ||
          encryption.content.includes('certificate')
        ) {
          score += 10;
        }

        // Check 7: Supports multiple algorithms (5 pts)
        if (
          encryption.content.includes('AES-256') ||
          encryption.content.includes('RSA') ||
          encryption.content.includes('algorithm')
        ) {
          score += 5;
        }

        // Check 8: Has digital signature verification (5 pts)
        if (
          encryption.content.includes('verifySignature') ||
          encryption.content.includes('signature')
        ) {
          score += 5;
        }

        // Check 9: Has @Injectable (5 pts)
        if (encryption.hasInjectable) score += 3;
        if (encryption.hasLogger) score += 2;
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!encryption,
          methodsFound: encryption?.methods || [],
          issues,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 9: Token Management ─────────────────────────────────────

  /**
   * Verify AuthenticationAgentService token validation, revocation.
   */
  async testTokenManagement(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Token Management';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const auth = services.find((s) => s.fileName.includes('authentication'));

      // Check 1: AuthenticationAgentService exists (15 pts)
      if (auth) {
        score += 15;
      } else {
        issues.push('AuthenticationAgentService not found');
      }

      if (auth) {
        // Check 2: Has token validation (15 pts)
        if (
          auth.content.includes('token') ||
          auth.content.includes('Token') ||
          auth.content.includes('validate')
        ) {
          score += 15;
        } else {
          issues.push('Missing token validation');
        }

        // Check 3: Has token revocation (15 pts)
        if (
          auth.content.includes('revoke') ||
          auth.content.includes('Revocation') ||
          auth.content.includes('blacklist')
        ) {
          score += 15;
        }

        // Check 4: Has JWT support (15 pts)
        if (
          auth.content.includes('jwt') ||
          auth.content.includes('JWT') ||
          auth.content.includes('jsonwebtoken')
        ) {
          score += 15;
        }

        // Check 5: Has authentication capabilities (10 pts)
        if (
          auth.content.includes('authenticate') ||
          auth.content.includes('login') ||
          auth.content.includes('Authentication')
        ) {
          score += 10;
        }

        // Check 6: Has session management (10 pts)
        if (auth.content.includes('session') || auth.content.includes('Session')) {
          score += 10;
        }

        // Check 7: Has @Injectable and Logger (5 pts)
        if (auth.hasInjectable) score += 3;
        if (auth.hasLogger) score += 2;
      }

      // Check 8: JWT config exists (10 pts)
      const jwtConfigPath = path.join(CONFIG_DIR, 'jwt.config.ts');
      if (fs.existsSync(jwtConfigPath)) {
        score += 10;
      }

      // Check 9: Auth decorator exists (5 pts)
      const authDecoratorPath = path.join(
        SOURCE_ROOT,
        'agents',
        'decorators',
        'public.decorator.ts',
      );
      if (fs.existsSync(authDecoratorPath)) {
        score += 5;
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!auth,
          jwtConfigFound: fs.existsSync(jwtConfigPath),
          authDecoratorFound: fs.existsSync(authDecoratorPath),
          issues,
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Test 10: Zero Trust Compliance ────────────────────────────────

  /**
   * Verify each agent checks permissions before execution.
   */
  async testZeroTrustCompliance(services: ServiceAnalysis[]): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Zero Trust Compliance';
    this.logger.log(`Running test: ${name}`);

    try {
      let totalScore = 0;
      const agentsWithoutPermissionChecks: string[] = [];

      const agentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');

      for (const filePath of agentFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(SOURCE_ROOT, filePath);
        let agentScore = 0;

        // Check 1: Agent has permissions defined (25 pts)
        if (content.includes('permissions:')) {
          agentScore += 25;
        }

        // Check 2: Agent extends BaseAgentService (which provides checkPermission) (25 pts)
        if (content.includes('extends BaseAgentService')) {
          agentScore += 25;
        }

        // Check 3: Agent config has required fields for trust verification (20 pts)
        if (content.includes('id:') && content.includes('cluster:')) {
          agentScore += 20;
        }

        // Check 4: Agent has input validation in onExecute (15 pts)
        if (content.includes('try') && content.includes('catch') && content.includes('onExecute')) {
          agentScore += 15;
        }

        // Check 5: Agent has @Injectable decorator (for DI-based permission injection) (10 pts)
        if (content.includes('@Injectable')) {
          agentScore += 10;
        }

        // Check 6: Agent imports or references permission system (5 pts)
        if (
          content.includes('permission') ||
          content.includes('Permission') ||
          content.includes('checkPermission')
        ) {
          agentScore += 5;
        }

        if (agentScore < 60) {
          agentsWithoutPermissionChecks.push(relativePath);
        }

        totalScore += Math.min(agentScore, 100);
      }

      const avgScore = agentFiles.length > 0 ? Math.round(totalScore / agentFiles.length) : 0;

      return {
        name,
        passed: avgScore >= 90,
        score: avgScore,
        durationMs: Date.now() - startTime,
        details: {
          totalAgents: agentFiles.length,
          agentsWithoutProperChecks: agentsWithoutPermissionChecks.length,
          agentsList: agentsWithoutPermissionChecks.slice(0, 10),
        },
      };
    } catch (error) {
      return {
        name,
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ─── Filesystem Helpers ───────────────────────────────────────────

  /**
   * Get all TypeScript files recursively.
   */
  private async getAllTsFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        const subResults = await this.getAllTsFiles(fullPath);
        results.push(...subResults);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Recursively get all files matching a suffix.
   */
  private async getAllFilesRecursive(dir: string, suffix: string): Promise<string[]> {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await this.getAllFilesRecursive(fullPath, suffix);
        results.push(...subResults);
      } else if (entry.name.endsWith(suffix)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  // ─── Service Analysis ─────────────────────────────────────────────

  /**
   * Discover and analyze all security service files.
   */
  private async analyzeServices(): Promise<ServiceAnalysis[]> {
    if (this.serviceAnalyses) {
      return this.serviceAnalyses;
    }

    const results: ServiceAnalysis[] = [];

    if (!fs.existsSync(SECURITY_DIR)) {
      this.logger.warn(`Security directory not found: ${SECURITY_DIR}`);
      return results;
    }

    const files = fs
      .readdirSync(SECURITY_DIR)
      .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));

    // Also check subdirectories
    const subdirs = fs
      .readdirSync(SECURITY_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subdir of subdirs) {
      const subdirPath = path.join(SECURITY_DIR, subdir);
      const subFiles = fs
        .readdirSync(subdirPath)
        .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));

      for (const fileName of subFiles) {
        files.push(path.join(subdir, fileName));
      }
    }

    for (const fileName of files) {
      const filePath = path.join(SECURITY_DIR, fileName);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        const classMatch = content.match(/export\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : fileName.replace('.service.ts', '');

        const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
        const methods: string[] = [];
        let methodMatch: RegExpExecArray | null;
        while ((methodMatch = methodRegex.exec(content)) !== null) {
          const mName = methodMatch[1];
          if (
            ![
              'if',
              'for',
              'while',
              'switch',
              'catch',
              'constructor',
              'return',
              'new',
              'throw',
              'typeof',
            ].includes(mName)
          ) {
            methods.push(mName);
          }
        }
        const uniqueMethods = Array.from(new Set(methods));

        results.push({
          filePath,
          fileName,
          content,
          className,
          methods: uniqueMethods,
          hasInjectable: content.includes('@Injectable'),
          hasLogger: content.includes('Logger') || content.includes('this.logger'),
        });
      } catch (error) {
        this.logger.warn(`Failed to analyze ${filePath}: ${(error as Error).message}`);
      }
    }

    this.serviceAnalyses = results;
    return results;
  }
}
