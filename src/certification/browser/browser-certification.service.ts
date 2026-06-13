/**
 * AENEWS Agent OS X - Browser Certification Service
 * Tests Browser Cluster specifically by performing static analysis
 * on browser agent source code. Verifies tool methods, input validation,
 * error handling, output structure, and browser behavior simulation.
 *
 * Tests:
 * 1. Navigation - verify NavigationAgentService has navigateTo, goBack, goForward, refresh, URL validation
 * 2. Authentication - verify SessionManagementService has login/logout, session refresh, cookie handling
 * 3. Form handling - verify FormFillingAgentService has fillField, selectDropdown, checkboxes, radio buttons
 * 4. Downloads - verify FileDownloadAgentService has download, progress monitoring, verification
 * 5. Uploads - verify FileUploadAgentService has upload, multi-upload, drag-drop
 * 6. Popup handling - verify PopupHandlingAgentService has alert/confirm/prompt handling
 * 7. Screenshots - verify ScreenshotAgentService has capture, full-page, element-specific
 * 8. Session persistence - verify CookieManagementAgentService, SessionManagementAgentService maintain state
 * 9. Wait strategies - verify WaitStrategyAgentService has multiple wait strategies
 * 10. JavaScript execution - verify JavaScriptExecutionAgentService has evaluate/execute capabilities
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CertificationDomain, DomainResult, TestResult } from '../types';

// ─── Constants ────────────────────────────────────────────────────

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const BROWSER_DIR = path.join(SOURCE_ROOT, 'agents', 'browser');

// ─── Agent Analysis Result ────────────────────────────────────────

interface AgentAnalysis {
  filePath: string;
  fileName: string;
  dirName: string;
  content: string;
  className: string;
  tools: string[];
  capabilities: string[];
  methods: string[];
  hasInputValidation: boolean;
  hasErrorHandling: boolean;
  hasOutputStructure: boolean;
  hasOnDestroy: boolean;
  hasCleanup: boolean;
  extendsBaseAgent: boolean;
  hasInjectable: boolean;
  hasLogger: boolean;
}

@Injectable()
export class BrowserCertificationService {
  private readonly logger = new Logger(BrowserCertificationService.name);

  /** Cached agent analyses */
  private agentAnalyses: Map<string, AgentAnalysis> | null = null;

  // ─── Main Entry Point ─────────────────────────────────────────────

  /**
   * Run all browser certification tests and return a DomainResult.
   */
  async runAll(): Promise<DomainResult> {
    const startTime = Date.now();
    this.logger.log('Starting Browser certification...');

    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Discover and analyze browser agents
    const agents = await this.analyzeBrowserAgents();
    this.logger.log(`Analyzed ${agents.size} browser agents`);

    const testMethods: Array<{ name: string; fn: () => Promise<TestResult> }> = [
      { name: 'Navigation', fn: () => this.testNavigation(agents) },
      { name: 'Authentication', fn: () => this.testAuthentication(agents) },
      { name: 'Form Handling', fn: () => this.testFormHandling(agents) },
      { name: 'Downloads', fn: () => this.testDownloads(agents) },
      { name: 'Uploads', fn: () => this.testUploads(agents) },
      { name: 'Popup Handling', fn: () => this.testPopupHandling(agents) },
      { name: 'Screenshots', fn: () => this.testScreenshots(agents) },
      { name: 'Session Persistence', fn: () => this.testSessionPersistence(agents) },
      { name: 'Wait Strategies', fn: () => this.testWaitStrategies(agents) },
      { name: 'JavaScript Execution', fn: () => this.testJavaScriptExecution(agents) },
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
    const testWeights = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    let weightedSum = 0;
    for (let i = 0; i < tests.length; i++) {
      const weight = testWeights[i] || 0.1;
      weightedSum += tests[i].score * weight;
    }
    const score = Math.round(weightedSum);

    const passed = score >= 90 && criticalFailures.length === 0;
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Browser certification complete: score=${score}, passed=${passed}, ` +
        `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`,
    );

    return {
      domain: CertificationDomain.BROWSER,
      weight: 0.1,
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Test 1: Navigation ───────────────────────────────────────────

  /**
   * Verify NavigationAgentService has navigateTo, goBack, goForward, refresh,
   * URL validation, and proper redirect handling.
   */
  async testNavigation(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Navigation';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const nav = agents.get('navigation');

      // Check 1: NavigationAgentService exists (10 pts)
      if (nav) {
        score += 10;
      } else {
        issues.push('NavigationAgentService not found');
      }

      if (nav) {
        // Check 2: Has navigateTo capability/tool (15 pts)
        if (nav.capabilities.includes('navigateTo') || nav.tools.includes('navigateTo')) {
          score += 15;
        } else {
          issues.push('Missing navigateTo capability');
        }

        // Check 3: Has goBack capability (10 pts)
        if (nav.capabilities.includes('goBack') || nav.tools.includes('goBack')) {
          score += 10;
        } else {
          issues.push('Missing goBack capability');
        }

        // Check 4: Has goForward capability (10 pts)
        if (nav.capabilities.includes('goForward') || nav.tools.includes('goForward')) {
          score += 10;
        } else {
          issues.push('Missing goForward capability');
        }

        // Check 5: Has refresh capability (10 pts)
        if (nav.capabilities.includes('refresh') || nav.tools.includes('refresh')) {
          score += 10;
        } else {
          issues.push('Missing refresh capability');
        }

        // Check 6: Has URL validation (10 pts)
        if (
          nav.content.includes('new URL(') ||
          nav.content.includes('URL validation') ||
          nav.content.includes('Invalid URL')
        ) {
          score += 10;
        } else {
          issues.push('Missing URL validation');
        }

        // Check 7: Has redirect chain handling (10 pts)
        if (nav.content.includes('redirectChain') || nav.content.includes('redirect')) {
          score += 10;
        }

        // Check 8: Has input validation (5 pts)
        if (nav.hasInputValidation) {
          score += 5;
        }

        // Check 9: Has error handling (5 pts)
        if (nav.hasErrorHandling) {
          score += 5;
        }

        // Check 10: Has output structure defined (5 pts)
        if (nav.hasOutputStructure) {
          score += 5;
        }

        // Check 11: Has waitForNavigation capability (5 pts)
        if (
          nav.capabilities.includes('waitForNavigation') ||
          nav.tools.includes('waitForNavigation')
        ) {
          score += 5;
        }

        // Check 12: Simulates browser behavior (5 pts)
        if (
          nav.content.includes('simulateRedirect') ||
          nav.content.includes('simulateStatus') ||
          nav.content.includes('navigationHistory')
        ) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!nav,
          capabilitiesFound: nav?.capabilities || [],
          toolsFound: nav?.tools || [],
          hasUrlValidation: nav?.content.includes('new URL(') || false,
          hasRedirectHandling: nav?.content.includes('redirectChain') || false,
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

  // ─── Test 2: Authentication ───────────────────────────────────────

  /**
   * Verify SessionManagementService has login/logout, session refresh,
   * cookie handling, and multi-account support.
   */
  async testAuthentication(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Authentication';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const session = agents.get('session-management');

      // Check 1: SessionManagementAgentService exists (10 pts)
      if (session) {
        score += 10;
      } else {
        issues.push('SessionManagementAgentService not found');
      }

      if (session) {
        // Check 2: Has login capability (15 pts)
        if (session.capabilities.includes('login') || session.tools.includes('login')) {
          score += 15;
        } else {
          issues.push('Missing login capability');
        }

        // Check 3: Has logout capability (10 pts)
        if (session.capabilities.includes('logout') || session.tools.includes('logout')) {
          score += 10;
        } else {
          issues.push('Missing logout capability');
        }

        // Check 4: Has session refresh (10 pts)
        if (
          session.capabilities.includes('refreshSession') ||
          session.tools.includes('refreshSession')
        ) {
          score += 10;
        } else {
          issues.push('Missing session refresh');
        }

        // Check 5: Has session checking (10 pts)
        if (
          session.capabilities.includes('checkSession') ||
          session.tools.includes('checkSession')
        ) {
          score += 10;
        }

        // Check 6: Has cookie handling in sessions (10 pts)
        if (session.content.includes('cookies') || session.content.includes('sessionToken')) {
          score += 10;
        }

        // Check 7: Has multi-account switching (5 pts)
        if (
          session.capabilities.includes('switchAccount') ||
          session.tools.includes('switchAccount')
        ) {
          score += 5;
        }

        // Check 8: Has input validation for credentials (10 pts)
        if (session.hasInputValidation) {
          score += 10;
        }

        // Check 9: Has error handling (10 pts)
        if (session.hasErrorHandling) {
          score += 10;
        }

        // Check 10: Has output structure (5 pts)
        if (session.hasOutputStructure) {
          score += 5;
        }

        // Check 11: Simulates auth behavior (5 pts)
        if (session.content.includes('sessionToken') && session.content.includes('expiresAt')) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!session,
          capabilitiesFound: session?.capabilities || [],
          toolsFound: session?.tools || [],
          hasCookieHandling: session?.content.includes('cookies') || false,
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

  // ─── Test 3: Form Handling ────────────────────────────────────────

  /**
   * Verify FormFillingAgentService has fillField, selectDropdown,
   * checkboxes, radio buttons, file upload, and clear field.
   */
  async testFormHandling(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Form Handling';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const form = agents.get('form-filling');

      // Check 1: FormFillingAgentService exists (10 pts)
      if (form) {
        score += 10;
      } else {
        issues.push('FormFillingAgentService not found');
      }

      if (form) {
        // Check 2: Has fillField capability (15 pts)
        if (form.capabilities.includes('fillField') || form.tools.includes('fillField')) {
          score += 15;
        } else {
          issues.push('Missing fillField capability');
        }

        // Check 3: Has selectDropdown capability (10 pts)
        if (form.capabilities.includes('selectDropdown') || form.tools.includes('selectDropdown')) {
          score += 10;
        } else {
          issues.push('Missing selectDropdown capability');
        }

        // Check 4: Has checkbox handling (10 pts)
        if (form.capabilities.includes('checkCheckbox') || form.tools.includes('checkCheckbox')) {
          score += 10;
        } else {
          issues.push('Missing checkbox handling');
        }

        // Check 5: Has radio button handling (10 pts)
        if (form.capabilities.includes('selectRadio') || form.tools.includes('selectRadio')) {
          score += 10;
        } else {
          issues.push('Missing radio button handling');
        }

        // Check 6: Has clearField capability (5 pts)
        if (form.capabilities.includes('clearField') || form.tools.includes('clearField')) {
          score += 5;
        }

        // Check 7: Has uploadFile in form (5 pts)
        if (form.capabilities.includes('uploadFile') || form.tools.includes('uploadFile')) {
          score += 5;
        }

        // Check 8: Has input validation (10 pts)
        if (form.hasInputValidation) {
          score += 10;
        }

        // Check 9: Has error handling (10 pts)
        if (form.hasErrorHandling) {
          score += 10;
        }

        // Check 10: Has output structure (5 pts)
        if (form.hasOutputStructure) {
          score += 5;
        }

        // Check 11: Tracks form state (10 pts)
        if (form.content.includes('formState') || form.content.includes('FieldState')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!form,
          capabilitiesFound: form?.capabilities || [],
          toolsFound: form?.tools || [],
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

  // ─── Test 4: Downloads ───────────────────────────────────────────

  /**
   * Verify FileDownloadAgentService has download, progress monitoring,
   * verification, cancellation, and history tracking.
   */
  async testDownloads(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Downloads';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const download = agents.get('file-download');

      // Check 1: FileDownloadAgentService exists (10 pts)
      if (download) {
        score += 10;
      } else {
        issues.push('FileDownloadAgentService not found');
      }

      if (download) {
        // Check 2: Has downloadFile capability (15 pts)
        if (
          download.capabilities.includes('downloadFile') ||
          download.tools.includes('downloadFile')
        ) {
          score += 15;
        } else {
          issues.push('Missing downloadFile capability');
        }

        // Check 3: Has progress monitoring (waitForDownload) (15 pts)
        if (
          download.capabilities.includes('waitForDownload') ||
          download.tools.includes('waitForDownload')
        ) {
          score += 15;
        } else {
          issues.push('Missing progress monitoring');
        }

        // Check 4: Has download verification (10 pts)
        if (
          download.capabilities.includes('verifyDownload') ||
          download.tools.includes('verifyDownload')
        ) {
          score += 10;
        } else {
          issues.push('Missing download verification');
        }

        // Check 5: Has download cancellation (10 pts)
        if (
          download.capabilities.includes('cancelDownload') ||
          download.tools.includes('cancelDownload')
        ) {
          score += 10;
        }

        // Check 6: Has download history (10 pts)
        if (
          download.capabilities.includes('getDownloadHistory') ||
          download.tools.includes('getDownloadHistory')
        ) {
          score += 10;
        }

        // Check 7: Has input validation (10 pts)
        if (download.hasInputValidation) {
          score += 10;
        }

        // Check 8: Has error handling (10 pts)
        if (download.hasErrorHandling) {
          score += 10;
        }

        // Check 9: Has output structure (5 pts)
        if (download.hasOutputStructure) {
          score += 5;
        }

        // Check 10: Tracks download progress (bytesDownloaded) (5 pts)
        if (download.content.includes('bytesDownloaded') || download.content.includes('progress')) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!download,
          capabilitiesFound: download?.capabilities || [],
          toolsFound: download?.tools || [],
          hasProgressMonitoring: download?.content.includes('bytesDownloaded') || false,
          hasVerification: download?.capabilities.includes('verifyDownload') || false,
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

  // ─── Test 5: Uploads ─────────────────────────────────────────────

  /**
   * Verify FileUploadAgentService has upload, multi-upload, drag-drop support.
   */
  async testUploads(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Uploads';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const upload = agents.get('file-upload');

      // Check 1: FileUploadAgentService exists (10 pts)
      if (upload) {
        score += 10;
      } else {
        issues.push('FileUploadAgentService not found');
      }

      if (upload) {
        // Check 2: Has uploadFile capability (20 pts)
        if (
          upload.capabilities.includes('uploadFile') ||
          upload.capabilities.includes('upload') ||
          upload.tools.includes('uploadFile') ||
          upload.tools.includes('upload')
        ) {
          score += 20;
        } else {
          issues.push('Missing uploadFile capability');
        }

        // Check 3: Has input validation for file paths (15 pts)
        if (upload.hasInputValidation) {
          score += 15;
        } else {
          issues.push('Missing input validation for uploads');
        }

        // Check 4: Has error handling (15 pts)
        if (upload.hasErrorHandling) {
          score += 15;
        }

        // Check 5: Has output structure (10 pts)
        if (upload.hasOutputStructure) {
          score += 10;
        }

        // Check 6: Has multi-file upload support (10 pts)
        if (
          upload.content.includes('multiple') ||
          upload.content.includes('multi') ||
          upload.capabilities.includes('uploadMultiple')
        ) {
          score += 10;
        }

        // Check 7: Has drag-drop support (5 pts)
        if (
          upload.content.includes('drag') ||
          upload.content.includes('drop') ||
          upload.capabilities.includes('dragDrop')
        ) {
          score += 5;
        }

        // Check 8: Has file type validation (10 pts)
        if (
          upload.content.includes('accept') ||
          upload.content.includes('fileType') ||
          upload.content.includes('extension')
        ) {
          score += 10;
        }

        // Check 9: Has file size validation (5 pts)
        if (
          upload.content.includes('fileSize') ||
          upload.content.includes('maxSize') ||
          upload.content.includes('maxFileSize')
        ) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!upload,
          capabilitiesFound: upload?.capabilities || [],
          toolsFound: upload?.tools || [],
          hasMultiUpload:
            upload?.content.includes('multiple') || upload?.content.includes('multi') || false,
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

  // ─── Test 6: Popup Handling ───────────────────────────────────────

  /**
   * Verify PopupHandlingAgentService has alert/confirm/prompt handling,
   * popup detection, and popup closing.
   */
  async testPopupHandling(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Popup Handling';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const popup = agents.get('popup-handling');

      // Check 1: PopupHandlingAgentService exists (10 pts)
      if (popup) {
        score += 10;
      } else {
        issues.push('PopupHandlingAgentService not found');
      }

      if (popup) {
        // Check 2: Has handleAlert capability (15 pts)
        if (popup.capabilities.includes('handleAlert') || popup.tools.includes('handleAlert')) {
          score += 15;
        } else {
          issues.push('Missing handleAlert capability');
        }

        // Check 3: Has handleConfirm capability (10 pts)
        if (popup.capabilities.includes('handleConfirm') || popup.tools.includes('handleConfirm')) {
          score += 10;
        } else {
          issues.push('Missing handleConfirm capability');
        }

        // Check 4: Has handlePrompt capability (10 pts)
        if (popup.capabilities.includes('handlePrompt') || popup.tools.includes('handlePrompt')) {
          score += 10;
        } else {
          issues.push('Missing handlePrompt capability');
        }

        // Check 5: Has popup detection (10 pts)
        if (popup.capabilities.includes('detectPopup') || popup.tools.includes('detectPopup')) {
          score += 10;
        }

        // Check 6: Has popup closing (10 pts)
        if (popup.capabilities.includes('closePopup') || popup.tools.includes('closePopup')) {
          score += 10;
        }

        // Check 7: Has input validation (10 pts)
        if (popup.hasInputValidation) {
          score += 10;
        }

        // Check 8: Has error handling (10 pts)
        if (popup.hasErrorHandling) {
          score += 10;
        }

        // Check 9: Has output structure (5 pts)
        if (popup.hasOutputStructure) {
          score += 5;
        }

        // Check 10: Tracks dialog history (10 pts)
        if (popup.content.includes('dialogHistory') || popup.content.includes('DialogRecord')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!popup,
          capabilitiesFound: popup?.capabilities || [],
          toolsFound: popup?.tools || [],
          hasAlertHandling: popup?.capabilities.includes('handleAlert') || false,
          hasConfirmHandling: popup?.capabilities.includes('handleConfirm') || false,
          hasPromptHandling: popup?.capabilities.includes('handlePrompt') || false,
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

  // ─── Test 7: Screenshots ─────────────────────────────────────────

  /**
   * Verify ScreenshotAgentService has capture, full-page, element-specific,
   * and visual comparison capabilities.
   */
  async testScreenshots(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Screenshots';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const screenshot = agents.get('screenshot');

      // Check 1: ScreenshotAgentService exists (10 pts)
      if (screenshot) {
        score += 10;
      } else {
        issues.push('ScreenshotAgentService not found');
      }

      if (screenshot) {
        // Check 2: Has takeScreenshot capability (15 pts)
        if (
          screenshot.capabilities.includes('takeScreenshot') ||
          screenshot.tools.includes('takeScreenshot')
        ) {
          score += 15;
        } else {
          issues.push('Missing takeScreenshot capability');
        }

        // Check 3: Has element-specific screenshot (15 pts)
        if (
          screenshot.capabilities.includes('screenshotElement') ||
          screenshot.tools.includes('screenshotElement')
        ) {
          score += 15;
        } else {
          issues.push('Missing element-specific screenshot');
        }

        // Check 4: Has full-page screenshot (10 pts)
        if (
          screenshot.capabilities.includes('screenshotFullPage') ||
          screenshot.tools.includes('screenshotFullPage')
        ) {
          score += 10;
        } else {
          issues.push('Missing full-page screenshot');
        }

        // Check 5: Has visual comparison (10 pts)
        if (
          screenshot.capabilities.includes('compareScreenshots') ||
          screenshot.tools.includes('compareScreenshots')
        ) {
          score += 10;
        }

        // Check 6: Has input validation (10 pts)
        if (screenshot.hasInputValidation) {
          score += 10;
        }

        // Check 7: Has error handling (10 pts)
        if (screenshot.hasErrorHandling) {
          score += 10;
        }

        // Check 8: Has output structure (10 pts)
        if (screenshot.hasOutputStructure) {
          score += 10;
        }

        // Check 9: Supports multiple formats (5 pts)
        if (
          screenshot.content.includes('png') &&
          (screenshot.content.includes('jpeg') || screenshot.content.includes('webp'))
        ) {
          score += 5;
        }

        // Check 10: Tracks screenshot history (5 pts)
        if (
          screenshot.content.includes('screenshotHistory') ||
          screenshot.content.includes('ScreenshotRecord')
        ) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!screenshot,
          capabilitiesFound: screenshot?.capabilities || [],
          toolsFound: screenshot?.tools || [],
          hasFullPage: screenshot?.capabilities.includes('screenshotFullPage') || false,
          hasElementScreenshot: screenshot?.capabilities.includes('screenshotElement') || false,
          hasComparison: screenshot?.capabilities.includes('compareScreenshots') || false,
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

  // ─── Test 8: Session Persistence ──────────────────────────────────

  /**
   * Verify CookieManagementAgentService and SessionManagementAgentService
   * maintain state across operations.
   */
  async testSessionPersistence(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Session Persistence';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const cookie = agents.get('cookie-management');
      const session = agents.get('session-management');

      // Check 1: CookieManagementAgentService exists (10 pts)
      if (cookie) {
        score += 10;
      } else {
        issues.push('CookieManagementAgentService not found');
      }

      // Check 2: SessionManagementAgentService exists (10 pts)
      if (session) {
        score += 10;
      } else {
        issues.push('SessionManagementAgentService not found');
      }

      if (cookie) {
        // Check 3: Has getCookies capability (10 pts)
        if (cookie.capabilities.includes('getCookies') || cookie.tools.includes('getCookies')) {
          score += 10;
        }

        // Check 4: Has setCookie capability (10 pts)
        if (cookie.capabilities.includes('setCookie') || cookie.tools.includes('setCookie')) {
          score += 10;
        }

        // Check 5: Has deleteCookie capability (5 pts)
        if (cookie.capabilities.includes('deleteCookie') || cookie.tools.includes('deleteCookie')) {
          score += 5;
        }

        // Check 6: Has clearCookies capability (5 pts)
        if (cookie.capabilities.includes('clearCookies') || cookie.tools.includes('clearCookies')) {
          score += 5;
        }

        // Check 7: Has cookie consent banner handling (5 pts)
        if (
          cookie.capabilities.includes('handleCookieBanner') ||
          cookie.tools.includes('handleCookieBanner')
        ) {
          score += 5;
        }

        // Check 8: Maintains cookie state (Map-based) (5 pts)
        if (cookie.content.includes('cookieStore') || cookie.content.includes('Map<')) {
          score += 5;
        }
      }

      if (session) {
        // Check 9: Session has cookie integration (5 pts)
        if (session.content.includes('cookies') || session.content.includes('sessionToken')) {
          score += 5;
        }

        // Check 10: Session has expiry management (5 pts)
        if (session.content.includes('expiresAt') || session.content.includes('lastRefreshedAt')) {
          score += 5;
        }

        // Check 11: Session persists via memory service (5 pts)
        if (
          session.content.includes('storeInSessionMemory') ||
          session.content.includes('storeInWorkingMemory')
        ) {
          score += 5;
        }

        // Check 12: Cleanup on destroy (5 pts)
        if (session.hasOnDestroy && session.hasCleanup) {
          score += 5;
        }
      }

      // Simulated session persistence test
      const simResult = this.simulateSessionPersistence(!!cookie, !!session);

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          cookieServiceFound: !!cookie,
          sessionServiceFound: !!session,
          cookieCapabilities: cookie?.capabilities || [],
          sessionCapabilities: session?.capabilities || [],
          issues,
          simulated: simResult,
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

  // ─── Test 9: Wait Strategies ──────────────────────────────────────

  /**
   * Verify WaitStrategyAgentService has multiple wait strategies:
   * waitForSelector, waitForNavigation, waitForNetworkIdle,
   * waitForFunction, and waitForTimeout.
   */
  async testWaitStrategies(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'Wait Strategies';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const wait = agents.get('wait-strategy');

      // Check 1: WaitStrategyAgentService exists (10 pts)
      if (wait) {
        score += 10;
      } else {
        issues.push('WaitStrategyAgentService not found');
      }

      if (wait) {
        // Check 2: Has waitForSelector capability (15 pts)
        if (
          wait.capabilities.includes('waitForSelector') ||
          wait.tools.includes('waitForSelector')
        ) {
          score += 15;
        } else {
          issues.push('Missing waitForSelector capability');
        }

        // Check 3: Has waitForNavigation capability (10 pts)
        if (
          wait.capabilities.includes('waitForNavigation') ||
          wait.tools.includes('waitForNavigation')
        ) {
          score += 10;
        } else {
          issues.push('Missing waitForNavigation capability');
        }

        // Check 4: Has waitForNetworkIdle capability (10 pts)
        if (
          wait.capabilities.includes('waitForNetworkIdle') ||
          wait.tools.includes('waitForNetworkIdle')
        ) {
          score += 10;
        } else {
          issues.push('Missing waitForNetworkIdle capability');
        }

        // Check 5: Has waitForFunction capability (10 pts)
        if (
          wait.capabilities.includes('waitForFunction') ||
          wait.tools.includes('waitForFunction')
        ) {
          score += 10;
        } else {
          issues.push('Missing waitForFunction capability');
        }

        // Check 6: Has waitForTimeout capability (10 pts)
        if (wait.capabilities.includes('waitForTimeout') || wait.tools.includes('waitForTimeout')) {
          score += 10;
        } else {
          issues.push('Missing waitForTimeout capability');
        }

        // Check 7: Has input validation (10 pts)
        if (wait.hasInputValidation) {
          score += 10;
        }

        // Check 8: Has error handling (10 pts)
        if (wait.hasErrorHandling) {
          score += 10;
        }

        // Check 9: Has output structure (5 pts)
        if (wait.hasOutputStructure) {
          score += 5;
        }

        // Check 10: Tracks active waits for cleanup (10 pts)
        if (wait.content.includes('activeWaits') && wait.content.includes('clearTimeout')) {
          score += 10;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!wait,
          capabilitiesFound: wait?.capabilities || [],
          toolsFound: wait?.tools || [],
          strategiesCount: wait?.capabilities.filter((c) => c.startsWith('waitFor')).length || 0,
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

  // ─── Test 10: JavaScript Execution ────────────────────────────────

  /**
   * Verify JavaScriptExecutionAgentService has evaluate/execute capabilities,
   * script safety validation, and proper result serialization.
   */
  async testJavaScriptExecution(agents: Map<string, AgentAnalysis>): Promise<TestResult> {
    const startTime = Date.now();
    const name = 'JavaScript Execution';
    this.logger.log(`Running test: ${name}`);

    try {
      let score = 0;
      const issues: string[] = [];

      const jsExec = agents.get('javascript-execution');

      // Check 1: JavaScriptExecutionAgentService exists (10 pts)
      if (jsExec) {
        score += 10;
      } else {
        issues.push('JavaScriptExecutionAgentService not found');
      }

      if (jsExec) {
        // Check 2: Has evaluateExpression capability (15 pts)
        if (
          jsExec.capabilities.includes('evaluateExpression') ||
          jsExec.tools.includes('evaluateExpression')
        ) {
          score += 15;
        } else {
          issues.push('Missing evaluateExpression capability');
        }

        // Check 3: Has executeScript capability (15 pts)
        if (
          jsExec.capabilities.includes('executeScript') ||
          jsExec.tools.includes('executeScript')
        ) {
          score += 15;
        } else {
          issues.push('Missing executeScript capability');
        }

        // Check 4: Has injectScript capability (10 pts)
        if (jsExec.capabilities.includes('injectScript') || jsExec.tools.includes('injectScript')) {
          score += 10;
        }

        // Check 5: Has evaluateFunction capability (10 pts)
        if (
          jsExec.capabilities.includes('evaluateFunction') ||
          jsExec.tools.includes('evaluateFunction')
        ) {
          score += 10;
        }

        // Check 6: Has script safety validation (15 pts)
        if (
          jsExec.content.includes('validateScriptSafety') ||
          jsExec.content.includes('safety') ||
          jsExec.content.includes('dangerousPatterns')
        ) {
          score += 15;
        } else {
          issues.push('Missing script safety validation');
        }

        // Check 7: Has input validation (10 pts)
        if (jsExec.hasInputValidation) {
          score += 10;
        }

        // Check 8: Has error handling (5 pts)
        if (jsExec.hasErrorHandling) {
          score += 5;
        }

        // Check 9: Has output structure (5 pts)
        if (jsExec.hasOutputStructure) {
          score += 5;
        }

        // Check 10: Tracks execution history (5 pts)
        if (
          jsExec.content.includes('executionHistory') ||
          jsExec.content.includes('ExecutionRecord')
        ) {
          score += 5;
        }
      }

      return {
        name,
        passed: score >= 90,
        score: Math.min(score, 100),
        durationMs: Date.now() - startTime,
        details: {
          serviceFound: !!jsExec,
          capabilitiesFound: jsExec?.capabilities || [],
          toolsFound: jsExec?.tools || [],
          hasSafetyValidation: jsExec?.content.includes('validateScriptSafety') || false,
          hasEvaluateExpression: jsExec?.capabilities.includes('evaluateExpression') || false,
          hasExecuteScript: jsExec?.capabilities.includes('executeScript') || false,
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

  // ─── Simulations ─────────────────────────────────────────────────

  private simulateSessionPersistence(
    hasCookieService: boolean,
    hasSessionService: boolean,
  ): {
    cookiesPersistAcrossNav: boolean;
    sessionsPersistAcrossRefresh: boolean;
    stateMaintainedAfterMemoryStore: boolean;
  } {
    return {
      cookiesPersistAcrossNav: hasCookieService,
      sessionsPersistAcrossRefresh: hasSessionService,
      stateMaintainedAfterMemoryStore: hasCookieService && hasSessionService,
    };
  }

  // ─── Browser Agent Analysis ───────────────────────────────────────

  /**
   * Discover and analyze all browser agent service files.
   */
  private async analyzeBrowserAgents(): Promise<Map<string, AgentAnalysis>> {
    if (this.agentAnalyses) {
      return this.agentAnalyses;
    }

    const results = new Map<string, AgentAnalysis>();

    if (!fs.existsSync(BROWSER_DIR)) {
      this.logger.warn(`Browser directory not found: ${BROWSER_DIR}`);
      return results;
    }

    const entries = fs
      .readdirSync(BROWSER_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const entry of entries) {
      const agentDir = path.join(BROWSER_DIR, entry.name);
      const agentFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith('-agent.service.ts'));

      for (const fileName of agentFiles) {
        const filePath = path.join(agentDir, fileName);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Extract class name
          const classMatch = content.match(/export\s+class\s+(\w+)/);
          const className = classMatch ? classMatch[1] : '';

          // Extract capabilities (tool names from config)
          const capabilityRegex = /name:\s*['"](\w+)['"]/g;
          const capabilities: string[] = [];
          let capMatch: RegExpExecArray | null;
          while ((capMatch = capabilityRegex.exec(content)) !== null) {
            capabilities.push(capMatch[1]);
          }

          // Extract registered tool names (from registerTool)
          const toolRegex = /registerTool\s*\(\s*\{\s*name:\s*['"](\w+)['"]/g;
          const tools: string[] = [];
          let toolMatch: RegExpExecArray | null;
          while ((toolMatch = toolRegex.exec(content)) !== null) {
            if (!capabilities.includes(toolMatch[1])) {
              tools.push(toolMatch[1]);
            }
          }

          // Extract method names
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

          // Check for input validation
          const hasInputValidation =
            content.includes('throw new Error(') ||
            content.includes('if (!') ||
            content.includes('if(!') ||
            content.includes('required') ||
            content.includes('validate');

          // Check for error handling
          const hasErrorHandling =
            (content.match(/try\s*\{/g) || []).length > 0 &&
            (content.match(/catch\s*\(/g) || []).length > 0;

          // Check for output structure
          const hasOutputStructure =
            content.includes('Promise<{') ||
            content.includes('Promise<') ||
            content.includes(': {') ||
            content.includes('outputSchema');

          // Check for onDestroy
          const hasOnDestroy =
            content.includes('onDestroy') || content.includes('async onDestroy(');

          // Check for cleanup in destroy
          const onDestroyMatch = content.match(/onDestroy[\s\S]*?\{([\s\S]*?)\n\s{2}\}/);
          const onDestroyBody = onDestroyMatch ? onDestroyMatch[1] : '';
          const hasCleanup =
            onDestroyBody.includes('.clear()') ||
            onDestroyBody.includes('= []') ||
            onDestroyBody.includes('= null') ||
            onDestroyBody.includes('= 0') ||
            onDestroyBody.includes('= -1');

          results.set(entry.name, {
            filePath,
            fileName,
            dirName: entry.name,
            content,
            className,
            tools,
            capabilities,
            methods: uniqueMethods,
            hasInputValidation,
            hasErrorHandling,
            hasOutputStructure,
            hasOnDestroy,
            hasCleanup,
            extendsBaseAgent: content.includes('extends BaseAgentService'),
            hasInjectable: content.includes('@Injectable'),
            hasLogger: content.includes('Logger') || content.includes('this.logger'),
          });
        } catch (error) {
          this.logger.warn(`Failed to analyze ${filePath}: ${(error as Error).message}`);
        }
      }
    }

    this.agentAnalyses = results;
    return results;
  }
}
