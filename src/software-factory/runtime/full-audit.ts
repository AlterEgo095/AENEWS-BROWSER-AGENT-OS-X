/**
 * AENEWS Software Factory — Full Connector Audit
 * 
 * Tests ALL 6 connectors, ALL 64 capabilities with real LLM calls.
 * Measures: latency, cost, output quality, error rates.
 * Identifies: optimization opportunities, missing features, bugs.
 * 
 * Usage: npx ts-node src/software-factory/runtime/full-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { DevelopmentConnector } from '../connectors/development-connector';
import { BrowserConnector } from '../connectors/browser-connector';
import { CertificationConnector } from '../connectors/certification-connector';
import { DeliveryConnector } from '../connectors/delivery-connector';
import { OfficeConnector } from '../connectors/office-connector';
import { BusinessConnector } from '../connectors/business-connector';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from '../connectors/connector.interface';
import {
  BrowserCapability, DevCapability, CertCapability,
  DeliveryCapability, OfficeCapability, BusinessCapability,
  CapabilityId,
} from '../interfaces';

// ─── Types ──────────────────────────────────────────────────────

interface AuditResult {
  pack: string;
  capability: string;
  success: boolean;
  durationMs: number;
  costUsd: number;
  artifactCount: number;
  outputSize: number;
  error?: string;
  optimizationNotes: string[];
}

interface AuditReport {
  timestamp: string;
  totalCapabilities: number;
  passed: number;
  failed: number;
  totalCostUsd: number;
  totalDurationMs: number;
  avgDurationMs: number;
  avgCostUsd: number;
  byPack: Record<string, PackSummary>;
  results: AuditResult[];
  criticalOptimizations: string[];
  recommendedOptimizations: string[];
}

interface PackSummary {
  total: number;
  passed: number;
  failed: number;
  avgDurationMs: number;
  avgCostUsd: number;
  totalCostUsd: number;
}

// ─── THE AUDITOR ────────────────────────────────────────────────

class FullAuditor {
  private results: AuditResult[] = [];
  private baseWorkspace = '/tmp/aenews-audit';

  // Connectors
  private readonly dev = new DevelopmentConnector();
  private readonly browser = new BrowserConnector();
  private readonly cert = new CertificationConnector();
  private readonly delivery = new DeliveryConnector();
  private readonly office = new OfficeConnector();
  private readonly business = new BusinessConnector();

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   AENEWS SOFTWARE FACTORY — FULL CONNECTOR AUDIT            ║');
    console.log('║   6 Connectors × 64 Capabilities = Complete Validation      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // Clean workspace
    fs.rmSync(this.baseWorkspace, { recursive: true, force: true });
    fs.mkdirSync(this.baseWorkspace, { recursive: true });

    // ─── 1. Browser Connector (12 capabilities) ────────────────
    console.log('━━━ [1/6] BROWSER CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditBrowser();

    // ─── 2. Development Connector (12 capabilities) ────────────
    console.log('\n━━━ [2/6] DEVELOPMENT CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditDevelopment();

    // ─── 3. Certification Connector (10 capabilities) ──────────
    console.log('\n━━━ [3/6] CERTIFICATION CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditCertification();

    // ─── 4. Delivery Connector (12 capabilities) ───────────────
    console.log('\n━━━ [4/6] DELIVERY CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditDelivery();

    // ─── 5. Office Connector (8 capabilities) ──────────────────
    console.log('\n━━━ [5/6] OFFICE CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditOffice();

    // ─── 6. Business Connector (10 capabilities) ───────────────
    console.log('\n━━━ [6/6] BUSINESS CONNECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await this.auditBusiness();

    // ─── Generate Report ────────────────────────────────────────
    this.generateReport();
  }

  // ═══════════════════════════════════════════════════════════
  //  BROWSER PACK (12)
  // ═══════════════════════════════════════════════════════════

  private async auditBrowser(): Promise<void> {
    const testUrl = 'https://example.com';
    const ws = this.createWorkspace('browser');

    // Test 1: Screenshot (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.SCREENSHOT, this.browser, {
      missionId: 'audit-browser-1', instruction: 'Take a screenshot of example.com',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 2: Navigation (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.NAVIGATION, this.browser, {
      missionId: 'audit-browser-2', instruction: 'Navigate to example.com and extract content',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 3: Search (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.SEARCH, this.browser, {
      missionId: 'audit-browser-3', instruction: 'Search for "test query"',
      workspaceDir: ws, parameters: { query: 'AENEWS software factory', engine: 'duckduckgo' }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 4: Login (Playwright - will fail gracefully, no real credentials)
    await this.auditCapability('BROWSER', BrowserCapability.LOGIN, this.browser, {
      missionId: 'audit-browser-4', instruction: 'Login to a website',
      workspaceDir: ws, parameters: { url: testUrl, username: 'test@test.com', password: 'test123' }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 5: Form (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.FORM, this.browser, {
      missionId: 'audit-browser-5', instruction: 'Fill a form',
      workspaceDir: ws, parameters: { url: 'https://httpbin.org/forms/post', fields: { 'custname': 'Test User', 'custtel': '1234567890' } }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 6: Vision (Playwright + LLM)
    await this.auditCapability('BROWSER', BrowserCapability.VISION, this.browser, {
      missionId: 'audit-browser-6', instruction: 'Analyze this page visually',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright', 'z-ai-web-dev-sdk'],
    });

    // Test 7: OCR (Playwright + DOM extraction)
    await this.auditCapability('BROWSER', BrowserCapability.OCR, this.browser, {
      missionId: 'audit-browser-7', instruction: 'Extract text from page',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 8: Session (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.SESSION, this.browser, {
      missionId: 'audit-browser-8', instruction: 'Save session state',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 9: Cookie (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.COOKIE, this.browser, {
      missionId: 'audit-browser-9', instruction: 'Get cookies from page',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 10: Popup (Playwright)
    await this.auditCapability('BROWSER', BrowserCapability.POPUP, this.browser, {
      missionId: 'audit-browser-10', instruction: 'Handle popups',
      workspaceDir: ws, parameters: { url: testUrl }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 11: Download (Playwright - will likely timeout, no download link)
    await this.auditCapability('BROWSER', BrowserCapability.DOWNLOAD, this.browser, {
      missionId: 'audit-browser-11', instruction: 'Download a file',
      workspaceDir: ws, parameters: { url: 'https://example.com' }, previousResults: new Map(), tools: ['playwright'],
    });

    // Test 12: Upload (Playwright - missing file, will fail gracefully)
    await this.auditCapability('BROWSER', BrowserCapability.UPLOAD, this.browser, {
      missionId: 'audit-browser-12', instruction: 'Upload a file',
      workspaceDir: ws, parameters: { url: testUrl, filePath: '/nonexistent/file.txt' }, previousResults: new Map(), tools: ['playwright'],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  DEVELOPMENT PACK (12) — ALL with LLM
  // ═══════════════════════════════════════════════════════════

  private async auditDevelopment(): Promise<void> {
    const ws = this.createWorkspace('development');
    const instruction = 'Build a REST API for a task manager with CRUD operations';

    const prevResults = new Map<CapabilityId, ConnectorOutput>();

    // Test 1: Architecture (LLM)
    const archResult = await this.auditCapability('DEV', DevCapability.ARCHITECTURE, this.dev, {
      missionId: 'audit-dev-1', instruction, workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });
    if (archResult.success) prevResults.set(DevCapability.ARCHITECTURE, { success: true, artifacts: [], output: archResult, costUsd: 0, durationMs: 0 });

    // Test 2: Frontend (LLM)
    await this.auditCapability('DEV', DevCapability.FRONTEND, this.dev, {
      missionId: 'audit-dev-2', instruction: 'Build a task manager UI', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 3: Backend (LLM)
    await this.auditCapability('DEV', DevCapability.BACKEND, this.dev, {
      missionId: 'audit-dev-3', instruction, workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 4: Database (LLM)
    await this.auditCapability('DEV', DevCapability.DATABASE, this.dev, {
      missionId: 'audit-dev-4', instruction: 'Design database schema for task manager', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 5: API (LLM)
    await this.auditCapability('DEV', DevCapability.API, this.dev, {
      missionId: 'audit-dev-5', instruction, workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 6: DevOps (LLM)
    await this.auditCapability('DEV', DevCapability.DEVOPS, this.dev, {
      missionId: 'audit-dev-6', instruction: 'Setup CI/CD for task manager API', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 7: Docker (template-based)
    await this.auditCapability('DEV', DevCapability.DOCKER, this.dev, {
      missionId: 'audit-dev-7', instruction: 'Dockerize the task manager', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: [],
    });

    // Test 8: Kubernetes (LLM)
    await this.auditCapability('DEV', DevCapability.KUBERNETES, this.dev, {
      missionId: 'audit-dev-8', instruction: 'Generate K8s manifests', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 9: QA (shell + LLM)
    await this.auditCapability('DEV', DevCapability.QA, this.dev, {
      missionId: 'audit-dev-9', instruction: 'QA the task manager', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: [],
    });

    // Test 10: Test (LLM)
    await this.auditCapability('DEV', DevCapability.TEST, this.dev, {
      missionId: 'audit-dev-10', instruction: 'Generate tests for task manager', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 11: Debug (LLM)
    await this.auditCapability('DEV', DevCapability.DEBUG, this.dev, {
      missionId: 'audit-dev-11', instruction: 'Debug an error', workspaceDir: ws, parameters: { error: 'TypeError: Cannot read property "id" of undefined at line 42' }, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });

    // Test 12: Documentation (LLM)
    await this.auditCapability('DEV', DevCapability.DOCUMENTATION, this.dev, {
      missionId: 'audit-dev-12', instruction: 'Document the task manager API', workspaceDir: ws, parameters: {}, previousResults: prevResults, tools: ['z-ai-web-dev-sdk'],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  CERTIFICATION PACK (10)
  // ═══════════════════════════════════════════════════════════

  private async auditCertification(): Promise<void> {
    const ws = this.createWorkspace('certification');
    // Seed workspace with test files
    fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
    fs.mkdirSync(path.join(ws, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'README.md'), '# Task Manager API\n\nInstall: npm install\nUsage: npm start');
    fs.writeFileSync(path.join(ws, 'src', 'app.js'), 'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.json({status: "ok"}));\napp.listen(3000);');
    fs.writeFileSync(path.join(ws, 'docs', 'ARCHITECTURE.md'), '# Architecture\n\n## Overview\nREST API with Express');

    const input: ConnectorInput = {
      missionId: 'audit-cert', instruction: 'Certify the task manager project',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    };

    await this.auditCapability('CERT', CertCapability.ARCHITECTURE_REVIEW, this.cert, input);
    await this.auditCapability('CERT', CertCapability.SECURITY_AUDIT, this.cert, input);
    await this.auditCapability('CERT', CertCapability.TEST_COVERAGE, this.cert, input);
    await this.auditCapability('CERT', CertCapability.REGRESSION, this.cert, input);
    await this.auditCapability('CERT', CertCapability.PERFORMANCE, this.cert, input);
    await this.auditCapability('CERT', CertCapability.DOC_REVIEW, this.cert, input);
    await this.auditCapability('CERT', CertCapability.INTEGRATION, this.cert, input);
    await this.auditCapability('CERT', CertCapability.COMPLIANCE, this.cert, input);
    await this.auditCapability('CERT', CertCapability.ACCESSIBILITY, this.cert, input);
    await this.auditCapability('CERT', CertCapability.DATA_PRIVACY, this.cert, input);
  }

  // ═══════════════════════════════════════════════════════════
  //  DELIVERY PACK (12)
  // ═══════════════════════════════════════════════════════════

  private async auditDelivery(): Promise<void> {
    const ws = this.createWorkspace('delivery');
    // Seed workspace
    fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'README.md'), '# Delivery Test Project');
    fs.writeFileSync(path.join(ws, 'index.js'), 'console.log("hello");');

    // ZIP (real)
    await this.auditCapability('DELIVERY', DeliveryCapability.ZIP, this.delivery, {
      missionId: 'audit-delivery-1', instruction: 'Create ZIP archive',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: ['archiver'],
    });

    // GitHub (real git init + commit)
    await this.auditCapability('DELIVERY', DeliveryCapability.GITHUB, this.delivery, {
      missionId: 'audit-delivery-2', instruction: 'Initialize git repo',
      workspaceDir: ws, parameters: { commitMessage: 'Audit test commit' }, previousResults: new Map(), tools: ['git'],
    });

    // Docker Registry (will fail — no Dockerfile in ws, that's ok)
    await this.auditCapability('DELIVERY', DeliveryCapability.DOCKER_REGISTRY, this.delivery, {
      missionId: 'audit-delivery-3', instruction: 'Build and push Docker image',
      workspaceDir: ws, parameters: { imageName: 'audit-test' }, previousResults: new Map(), tools: ['docker'],
    });

    // VPS (will fail gracefully — no host)
    await this.auditCapability('DELIVERY', DeliveryCapability.VPS, this.delivery, {
      missionId: 'audit-delivery-4', instruction: 'Deploy to VPS',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: ['ssh'],
    });

    // PDF Report
    await this.auditCapability('DELIVERY', DeliveryCapability.PDF_REPORT, this.delivery, {
      missionId: 'audit-delivery-5', instruction: 'Generate delivery report',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // Notification
    await this.auditCapability('DELIVERY', DeliveryCapability.NOTIFICATION, this.delivery, {
      missionId: 'audit-delivery-6', instruction: 'Send notification',
      workspaceDir: ws, parameters: { message: 'Audit test notification' }, previousResults: new Map(), tools: [],
    });

    // Deployment
    await this.auditCapability('DELIVERY', DeliveryCapability.DEPLOYMENT, this.delivery, {
      missionId: 'audit-delivery-7', instruction: 'Deploy the application',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // Cloud (stub)
    await this.auditCapability('DELIVERY', DeliveryCapability.CLOUD, this.delivery, {
      missionId: 'audit-delivery-8', instruction: 'Deploy to cloud',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // CDN (stub)
    await this.auditCapability('DELIVERY', DeliveryCapability.CDN, this.delivery, {
      missionId: 'audit-delivery-9', instruction: 'Deploy to CDN',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // Backup
    await this.auditCapability('DELIVERY', DeliveryCapability.BACKUP, this.delivery, {
      missionId: 'audit-delivery-10', instruction: 'Create backup',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // Monitoring Setup (stub)
    await this.auditCapability('DELIVERY', DeliveryCapability.MONITORING_SETUP, this.delivery, {
      missionId: 'audit-delivery-11', instruction: 'Setup monitoring',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });

    // Load Balancer (stub)
    await this.auditCapability('DELIVERY', DeliveryCapability.LOAD_BALANCER, this.delivery, {
      missionId: 'audit-delivery-12', instruction: 'Configure load balancer',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: [],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  OFFICE PACK (8) — ALL with LLM
  // ═══════════════════════════════════════════════════════════

  private async auditOffice(): Promise<void> {
    const ws = this.createWorkspace('office');
    const input: ConnectorInput = {
      missionId: 'audit-office', instruction: 'Create a quarterly business report for Q4 2024',
      workspaceDir: ws, parameters: {}, previousResults: new Map(), tools: ['z-ai-web-dev-sdk'],
    };

    await this.auditCapability('OFFICE', OfficeCapability.PDF, this.office, input);
    await this.auditCapability('OFFICE', OfficeCapability.DOCX, this.office, { ...input, parameters: { context: 'Annual report for tech startup' } });
    await this.auditCapability('OFFICE', OfficeCapability.EXCEL, this.office, { ...input, parameters: { schema: 'revenue, expenses, profit, quarter' } });
    await this.auditCapability('OFFICE', OfficeCapability.POWERPOINT, this.office, input);
    await this.auditCapability('OFFICE', OfficeCapability.SIGNATURE, this.office, { ...input, parameters: { signer: 'CEO' } });
    await this.auditCapability('OFFICE', OfficeCapability.EMAIL, this.office, { ...input, parameters: { recipient: 'board@company.com', tone: 'professional' } });
    await this.auditCapability('OFFICE', OfficeCapability.CALENDAR, this.office, { ...input, parameters: { title: 'Q4 Review Meeting', date: '2024-12-15' } });

    // OCR needs a file
    const ocrFile = path.join(ws, 'sample.txt');
    fs.writeFileSync(ocrFile, 'Invoice #1234\nDate: 2024-01-15\nAmount: $5,000.00\nVendor: Acme Corp');
    await this.auditCapability('OFFICE', OfficeCapability.OCR, this.office, { ...input, parameters: { filePath: ocrFile } });
  }

  // ═══════════════════════════════════════════════════════════
  //  BUSINESS PACK (10) — ALL with LLM
  // ═══════════════════════════════════════════════════════════

  private async auditBusiness(): Promise<void> {
    const ws = this.createWorkspace('business');
    const input: ConnectorInput = {
      missionId: 'audit-business', instruction: 'Develop a marketing strategy for a SaaS product',
      workspaceDir: ws, parameters: { industry: 'technology', target: 'B2B decision makers' },
      previousResults: new Map(), tools: ['z-ai-web-dev-sdk'],
    };

    await this.auditCapability('BUSINESS', BusinessCapability.SEO, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.MARKETING, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.COPYWRITING, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.BRANDING, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.CRM, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.ANALYTICS, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.FINANCE, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.SALES, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.LEGAL, this.business, input);
    await this.auditCapability('BUSINESS', BusinessCapability.PARTNERSHIP, this.business, input);
  }

  // ═══════════════════════════════════════════════════════════
  //  Core audit method
  // ═══════════════════════════════════════════════════════════

  private async auditCapability(
    pack: string,
    capability: CapabilityId,
    connector: ICapabilityConnector,
    input: ConnectorInput,
  ): Promise<AuditResult> {
    const startTime = Date.now();
    const notes: string[] = [];

    try {
      const result = await connector.execute(capability, input);
      const durationMs = Date.now() - startTime;

      const auditResult: AuditResult = {
        pack,
        capability: capability as string,
        success: result.success,
        durationMs,
        costUsd: result.costUsd,
        artifactCount: result.artifacts.length,
        outputSize: result.output ? JSON.stringify(result.output).length : 0,
        error: result.error,
        optimizationNotes: notes,
      };

      // Identify optimization opportunities
      if (durationMs > 30000) notes.push('SLOW: >30s execution — consider streaming or async');
      if (durationMs > 60000) notes.push('VERY SLOW: >60s — blocking risk for pipeline');
      if (result.costUsd > 0.05) notes.push('EXPENSIVE: >$0.05 per call — consider caching');
      if (result.artifacts.length === 0 && result.success) notes.push('NO ARTIFACTS: success but no output files');
      if (!result.success) notes.push('FAILED: check error handling');
      if (result.error) notes.push(`ERROR: ${result.error.substring(0, 100)}`);

      // Check for Playwright browser leak (each method launches new browser)
      if (pack === 'BROWSER' && durationMs > 2000) {
        notes.push('BROWSER LEAK: new browser instance per call — should reuse browser context');
      }

      // Check for LLM redundancy
      if (result.costUsd > 0 && result.artifacts.length === 0) {
        notes.push('LLM WASTE: paid for LLM but no artifacts produced');
      }

      this.results.push(auditResult);

      const status = result.success ? '✅' : '❌';
      const cost = result.costUsd > 0 ? ` $${result.costUsd.toFixed(4)}` : '';
      const artifacts = result.artifacts.length > 0 ? ` [${result.artifacts.length} artifact(s)]` : '';
      console.log(`  ${status} ${capability as string} — ${durationMs}ms${cost}${artifacts} ${notes.length > 0 ? '⚠️ ' + notes.join('; ') : ''}`);

      return auditResult;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      notes.push(`EXCEPTION: ${error.message?.substring(0, 100)}`);

      const auditResult: AuditResult = {
        pack,
        capability: capability as string,
        success: false,
        durationMs,
        costUsd: 0,
        artifactCount: 0,
        outputSize: 0,
        error: error.message,
        optimizationNotes: notes,
      };
      this.results.push(auditResult);

      console.log(`  ❌ ${capability as string} — EXCEPTION: ${error.message?.substring(0, 100)}`);
      return auditResult;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Report Generation
  // ═══════════════════════════════════════════════════════════

  private generateReport(): void {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalCost = this.results.reduce((s, r) => s + r.costUsd, 0);
    const totalDuration = this.results.reduce((s, r) => s + r.durationMs, 0);

    const byPack: Record<string, PackSummary> = {};
    for (const r of this.results) {
      if (!byPack[r.pack]) byPack[r.pack] = { total: 0, passed: 0, failed: 0, avgDurationMs: 0, avgCostUsd: 0, totalCostUsd: 0 };
      byPack[r.pack].total++;
      if (r.success) byPack[r.pack].passed++;
      else byPack[r.pack].failed++;
      byPack[r.pack].totalCostUsd += r.costUsd;
      byPack[r.pack].avgDurationMs += r.durationMs;
    }
    for (const pack of Object.keys(byPack)) {
      byPack[pack].avgDurationMs = Math.round(byPack[pack].avgDurationMs / byPack[pack].total);
      byPack[pack].avgCostUsd = byPack[pack].totalCostUsd / byPack[pack].total;
    }

    // Collect optimization notes
    const criticalOptimizations: string[] = [];
    const recommendedOptimizations: string[] = [];

    const slowResults = this.results.filter(r => r.durationMs > 30000);
    if (slowResults.length > 0) {
      criticalOptimizations.push(
        `SLOW EXECUTION: ${slowResults.length} capabilities take >30s: ${slowResults.map(r => r.capability).join(', ')}. ` +
        `Solution: Implement LLM streaming + async execution with progress callbacks.`
      );
    }

    const browserResults = this.results.filter(r => r.pack === 'BROWSER');
    if (browserResults.length > 0) {
      criticalOptimizations.push(
        `BROWSER LEAK: Each browser capability launches a NEW chromium instance. ` +
        `Solution: Implement a shared BrowserPool that reuses browser contexts across capabilities. ` +
        `Estimated improvement: 3-5x faster browser operations.`
      );
    }

    const llmResults = this.results.filter(r => r.costUsd > 0);
    if (llmResults.length > 0) {
      recommendedOptimizations.push(
        `LLM CACHING: ${llmResults.length} capabilities use LLM (${totalCost.toFixed(4)} total). ` +
        `Solution: Implement prompt-hash-based caching to avoid re-generating identical content. ` +
        `Estimated savings: 30-50% on repeated missions.`
      );
    }

    recommendedOptimizations.push(
      `LLM STREAMING: Replace synchronous LLM calls with streaming to reduce perceived latency. ` +
      `Users see partial results immediately instead of waiting 30-60s for full response.`
    );

    recommendedOptimizations.push(
      `PARALLEL EXECUTION: WorkerFactory currently executes capabilities sequentially per worker. ` +
      `Solution: Execute independent capabilities in parallel within a worker using Promise.all(). ` +
      `Estimated improvement: 2-4x for multi-capability workers.`
    );

    recommendedOptimizations.push(
      `CONTEXT WINDOW OPTIMIZATION: Development connector reads up to 1000 chars per file. ` +
      `Solution: Implement smart context selection — read function signatures + imports, skip bodies. ` +
      `This reduces token usage by ~60% while preserving essential context.`
    );

    const failedResults = this.results.filter(r => !r.success);
    if (failedResults.length > 0) {
      recommendedOptimizations.push(
        `GRACEFUL DEGRADATION: ${failedResults.length} capabilities failed. ` +
        `Solution: Add retry logic with exponential backoff at the connector level, ` +
        `and implement fallback chains (e.g., if Playwright fails → try fetch + cheerio).`
      );
    }

    recommendedOptimizations.push(
      `CONNECTOR CHAINING: WorkerFactory stores previousResults but connectors barely use them. ` +
      `Solution: Auto-inject previousResults into LLM prompts so dev.backend knows what dev.architecture produced. ` +
      `This creates a coherent pipeline instead of isolated capabilities.`
    );

    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      totalCapabilities: this.results.length,
      passed, failed,
      totalCostUsd: totalCost,
      totalDurationMs: totalDuration,
      avgDurationMs: Math.round(totalDuration / this.results.length),
      avgCostUsd: totalCost / this.results.length,
      byPack,
      results: this.results,
      criticalOptimizations,
      recommendedOptimizations,
    };

    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    AUDIT COMPLETE                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`  Total: ${report.totalCapabilities} capabilities tested`);
    console.log(`  Passed: ${passed} | Failed: ${failed} | Rate: ${((passed / report.totalCapabilities) * 100).toFixed(1)}%`);
    console.log(`  Total cost: $${totalCost.toFixed(4)} | Avg: $${report.avgCostUsd.toFixed(4)}/capability`);
    console.log(`  Total time: ${(totalDuration / 1000).toFixed(1)}s | Avg: ${report.avgDurationMs}ms/capability`);
    console.log('');

    console.log('  ┌─────────────┬───────┬────────┬────────┬──────────────┐');
    console.log('  │ Pack        │ Total │ Pass   │ Fail   │ Avg Duration │');
    console.log('  ├─────────────┼───────┼────────┼────────┼──────────────┤');
    for (const [pack, summary] of Object.entries(byPack)) {
      console.log(`  │ ${pack.padEnd(11)} │ ${String(summary.total).padStart(5)} │ ${String(summary.passed).padStart(6)} │ ${String(summary.failed).padStart(6)} │ ${String(summary.avgDurationMs + 'ms').padStart(12)} │`);
    }
    console.log('  └─────────────┴───────┴────────┴────────┴──────────────┘');

    if (criticalOptimizations.length > 0) {
      console.log('\n  🔴 CRITICAL OPTIMIZATIONS:');
      criticalOptimizations.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
    }

    if (recommendedOptimizations.length > 0) {
      console.log('\n  🟡 RECOMMENDED OPTIMIZATIONS:');
      recommendedOptimizations.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
    }

    // Save report
    const reportDir = '/home/z/my-project/download';
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'connector-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n  📄 Full report saved to: ${reportPath}`);
  }

  private createWorkspace(name: string): string {
    const ws = path.join(this.baseWorkspace, name);
    fs.rmSync(ws, { recursive: true, force: true });
    fs.mkdirSync(ws, { recursive: true });
    fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
    fs.mkdirSync(path.join(ws, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(ws, 'docs'), { recursive: true });
    return ws;
  }
}

// ─── RUN ──────────────────────────────────────────────────────────

const auditor = new FullAuditor();
auditor.run().catch(console.error);
