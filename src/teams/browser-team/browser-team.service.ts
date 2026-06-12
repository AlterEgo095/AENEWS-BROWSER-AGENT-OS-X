// ========== FILE: src/teams/browser-team/browser-team.service.ts ==========

/**
 * AENEWS Agent OS X - Browser Team Service
 * Orchestrates browser-related agents: navigation, search, download, upload,
 * screenshot, form filling, and data extraction. Dispatches tasks by capability
 * and tracks session history in-memory for per-mission context.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Task & Result Interfaces ───────────────────────────────────────

export interface BrowserTask {
  id: string;
  capability:
    | 'navigate'
    | 'connect'
    | 'download'
    | 'upload'
    | 'search'
    | 'screenshot'
    | 'fill_form'
    | 'extract_data';
  params: Record<string, any>;
  missionId: string;
}

export interface BrowserResult {
  taskId: string;
  success: boolean;
  data: any;
  screenshots?: string[];
  extractedData?: any[];
  error?: string;
  durationMs: number;
}

// ─── Internal State ─────────────────────────────────────────────────

interface NavigationEntry {
  url: string;
  timestamp: Date;
  statusCode: number;
  loadTimeMs: number;
}

interface BrowserSession {
  missionId: string;
  history: NavigationEntry[];
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  lastActivity: Date;
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class BrowserTeamService {
  private readonly logger = new Logger(BrowserTeamService.name);

  /** Active browser sessions keyed by missionId */
  private readonly sessions = new Map<string, BrowserSession>();

  /** Task execution log for observability */
  private readonly taskLog = new Map<string, { task: BrowserTask; result: BrowserResult }>();

  /** Cumulative team metrics */
  private metrics = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    totalDurationMs: 0,
  };

  // ─── Dispatcher ───────────────────────────────────────────────────

  /**
   * Execute a browser team task by dispatching to the correct handler
   * based on the task's capability field.
   */
  async execute(task: BrowserTask): Promise<BrowserResult> {
    const start = Date.now();
    this.logger.log(`Executing browser task [${task.capability}] for mission ${task.missionId}`);

    this.ensureSession(task.missionId);

    try {
      let result: BrowserResult;

      switch (task.capability) {
        case 'navigate':
          result = await this.navigate(task.params.url, task.params.options, task.missionId);
          break;
        case 'connect':
          result = await this.navigate(task.params.url, { ...task.params.options, connectOnly: true }, task.missionId);
          break;
        case 'search':
          result = await this.search(task.params.query, task.params.engine, task.missionId);
          break;
        case 'download':
          result = await this.download(task.params.url, task.params.targetPath, task.missionId);
          break;
        case 'upload':
          result = await this.upload(task.params.url, task.params.filePath, task.missionId);
          break;
        case 'screenshot':
          result = await this.screenshot(task.params.url, task.missionId);
          break;
        case 'fill_form':
          result = await this.fillForm(task.params.url, task.params.fields, task.missionId);
          break;
        case 'extract_data':
          result = await this.extractData(task.params.url, task.params.selectors, task.missionId);
          break;
        default:
          throw new Error(`Unknown browser capability: ${task.capability}`);
      }

      result.taskId = task.id;

      this.metrics.totalTasks++;
      this.metrics.successfulTasks++;
      this.metrics.totalDurationMs += result.durationMs;

      this.taskLog.set(task.id, { task, result });
      this.logger.log(`Browser task [${task.capability}] completed in ${result.durationMs}ms`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - start;
      const result: BrowserResult = {
        taskId: task.id,
        success: false,
        data: null,
        error: (error as Error).message,
        durationMs,
      };

      this.metrics.totalTasks++;
      this.metrics.failedTasks++;
      this.metrics.totalDurationMs += durationMs;

      this.taskLog.set(task.id, { task, result });
      this.logger.error(`Browser task [${task.capability}] failed: ${(error as Error).message}`);
      return result;
    }
  }

  // ─── Capability Methods ───────────────────────────────────────────

  /**
   * Simulate navigating to a URL.
   * Records the navigation in session history and returns page metadata.
   */
  async navigate(
    url: string,
    options?: { waitUntil?: string; timeout?: number; connectOnly?: boolean },
    missionId?: string,
  ): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Navigating to ${url} (mission: ${sessionId})`);

    const latency = this.simulateLatency(url);
    await this.sleep(latency);

    const statusCode = this.simulateStatusCode(url);
    const loadTimeMs = Date.now() - start;

    const session = this.sessions.get(sessionId);
    if (session) {
      session.history.push({ url, timestamp: new Date(), statusCode, loadTimeMs });
      session.lastActivity = new Date();
    }

    if (options?.connectOnly) {
      return {
        taskId: '',
        success: statusCode < 400,
        data: { url, statusCode, connected: statusCode < 400, tls: url.startsWith('https'), responseTimeMs: latency },
        durationMs: loadTimeMs,
      };
    }

    return {
      taskId: '',
      success: statusCode < 400,
      data: {
        url,
        statusCode,
        title: this.simulateTitle(url),
        loadTimeMs,
        contentType: 'text/html',
        cookies: session?.cookies ?? {},
        redirectChain: statusCode >= 300 && statusCode < 400 ? [url] : [],
      },
      durationMs: loadTimeMs,
    };
  }

  /**
   * Simulate a web search across major engines.
   * Returns realistic search result entries.
   */
  async search(
    query: string,
    engine: 'google' | 'bing' | 'duckduckgo' = 'google',
    missionId?: string,
  ): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Searching "${query}" on ${engine} (mission: ${sessionId})`);

    const engineUrls: Record<string, string> = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    };

    await this.sleep(this.simulateLatency(engineUrls[engine]) + 100);

    const resultsCount = Math.floor(Math.random() * 5) + 5;
    const searchResults = Array.from({ length: resultsCount }, (_, i) => ({
      rank: i + 1,
      title: `${query} - Result ${i + 1}`,
      url: `https://example.com/${query.replace(/\s+/g, '-')}/result-${i + 1}`,
      snippet: `This is a relevant result for "${query}". Contains detailed information about the topic with key insights and analysis.`,
      relevanceScore: Math.max(0.3, 1 - i * 0.1 - Math.random() * 0.05),
    }));

    const session = this.sessions.get(sessionId);
    if (session) {
      session.history.push({ url: engineUrls[engine], timestamp: new Date(), statusCode: 200, loadTimeMs: Date.now() - start });
      session.lastActivity = new Date();
    }

    return {
      taskId: '',
      success: true,
      data: {
        query,
        engine,
        totalResults: Math.floor(Math.random() * 10_000_000) + 100_000,
        resultsCount: searchResults.length,
        results: searchResults,
        searchTimeMs: Math.floor(Math.random() * 500) + 200,
      },
      durationMs: Date.now() - start,
    };
  }

  /**
   * Simulate downloading a file from a URL.
   */
  async download(url: string, targetPath: string, missionId?: string): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Downloading ${url} to ${targetPath} (mission: ${sessionId})`);

    const fileSize = this.estimateFileSize(url);
    const downloadSpeed = 5_000_000;
    const downloadTime = (fileSize / downloadSpeed) * 1000;
    await this.sleep(Math.min(downloadTime, 3000));

    const fileName = url.split('/').pop() || 'downloaded-file';
    const success = !url.includes('error') && !url.includes('404');

    return {
      taskId: '',
      success,
      data: success
        ? { url, targetPath, fileName, fileSizeBytes: fileSize, mimeType: this.guessMimeType(fileName), downloadTimeMs: Date.now() - start, checksum: this.simulateChecksum() }
        : null,
      error: success ? undefined : `Download failed: HTTP 404 for ${url}`,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Simulate uploading a file to a URL.
   */
  async upload(url: string, filePath: string, missionId?: string): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Uploading ${filePath} to ${url} (mission: ${sessionId})`);

    const fileSize = this.estimateFileSize(filePath);
    const uploadSpeed = 2_000_000;
    const uploadTime = (fileSize / uploadSpeed) * 1000;
    await this.sleep(Math.min(uploadTime, 2000));

    const success = !url.includes('error');

    return {
      taskId: '',
      success,
      data: success
        ? { url, filePath, fileSizeBytes: fileSize, uploadTimeMs: Date.now() - start, serverResponse: 'File uploaded successfully', fileId: this.generateId() }
        : null,
      error: success ? undefined : `Upload failed: Server rejected upload to ${url}`,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Simulate extracting structured data from a page using CSS selectors.
   */
  async extractData(url: string, selectors: string[], missionId?: string): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Extracting data from ${url} with ${selectors.length} selectors (mission: ${sessionId})`);

    await this.sleep(this.simulateLatency(url));

    const extractedData = selectors.map((selector) => {
      const count = Math.floor(Math.random() * 5) + 1;
      return {
        selector,
        matches: count,
        values: Array.from({ length: count }, (_, i) => {
          const tag = selector.replace(/[.#]/, '').split(/[[.>]/)[0];
          return `${tag} content ${i + 1} from ${url}`;
        }),
      };
    });

    return {
      taskId: '',
      success: true,
      data: { url, selectorsProcessed: selectors.length, totalMatches: extractedData.reduce((sum, d) => sum + d.matches, 0) },
      extractedData,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Simulate filling and submitting a form on a page.
   */
  async fillForm(url: string, fields: Record<string, string>, missionId?: string): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Filling form at ${url} with ${Object.keys(fields).length} fields (mission: ${sessionId})`);

    await this.sleep(this.simulateLatency(url));

    const fieldResults: Record<string, { filled: boolean; value: string }> = {};
    for (const [selector, value] of Object.entries(fields)) {
      await this.sleep(50 + Math.random() * 100);
      fieldResults[selector] = { filled: true, value };
    }

    await this.sleep(200 + Math.random() * 300);

    const success = !url.includes('error');
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }

    return {
      taskId: '',
      success,
      data: success
        ? { url, fieldsFilled: Object.keys(fieldResults).length, totalFields: Object.keys(fields).length, submissionStatus: 'submitted', responseStatusCode: 200, fieldResults }
        : null,
      error: success ? undefined : 'Form submission failed: Server returned 500',
      durationMs: Date.now() - start,
    };
  }

  /**
   * Simulate taking a screenshot of a web page.
   */
  async screenshot(url: string, missionId?: string): Promise<BrowserResult> {
    const start = Date.now();
    const sessionId = missionId || 'default';

    this.logger.log(`Taking screenshot of ${url} (mission: ${sessionId})`);

    await this.sleep(this.simulateLatency(url) + 150);

    const screenshotId = this.generateId();

    return {
      taskId: '',
      success: true,
      data: { url, screenshotId, dimensions: { width: 1920, height: 1080 }, format: 'png', fileSizeBytes: Math.floor(Math.random() * 2_000_000) + 500_000, capturedAt: new Date().toISOString() },
      screenshots: [`/screenshots/${screenshotId}.png`],
      durationMs: Date.now() - start,
    };
  }

  // ─── Status ───────────────────────────────────────────────────────

  /**
   * Get the current status of the Browser Team.
   */
  getStatus(): {
    team: string;
    activeSessions: number;
    tasksCompleted: number;
    tasksFailed: number;
    totalDurationMs: number;
    avgDurationMs: number;
    sessions: Array<{ missionId: string; historyLength: number; lastActivity: Date }>;
  } {
    const sessionSummaries = Array.from(this.sessions.entries()).map(
      ([missionId, session]) => ({ missionId, historyLength: session.history.length, lastActivity: session.lastActivity }),
    );

    return {
      team: 'browser',
      activeSessions: this.sessions.size,
      tasksCompleted: this.metrics.successfulTasks,
      tasksFailed: this.metrics.failedTasks,
      totalDurationMs: this.metrics.totalDurationMs,
      avgDurationMs: this.metrics.totalTasks > 0 ? Math.round(this.metrics.totalDurationMs / this.metrics.totalTasks) : 0,
      sessions: sessionSummaries,
    };
  }

  // ─── Session Management ───────────────────────────────────────────

  private ensureSession(missionId: string): BrowserSession {
    let session = this.sessions.get(missionId);
    if (!session) {
      session = { missionId, history: [], cookies: {}, localStorage: {}, lastActivity: new Date() };
      this.sessions.set(missionId, session);
      this.logger.log(`Created browser session for mission ${missionId}`);
    }
    return session;
  }

  clearSession(missionId: string): boolean {
    return this.sessions.delete(missionId);
  }

  getSessionHistory(missionId: string): NavigationEntry[] {
    return this.sessions.get(missionId)?.history ?? [];
  }

  // ─── Simulation Helpers ───────────────────────────────────────────

  private simulateLatency(url: string): number {
    let base = 200 + Math.random() * 600;
    if (url.includes('cdn') || url.includes('cloudfront')) base *= 0.5;
    if (url.startsWith('https')) base += 50;
    if (url.includes('error') || url.includes('404')) base *= 0.3;
    return Math.round(base);
  }

  private simulateStatusCode(url: string): number {
    if (url.includes('404')) return 404;
    if (url.includes('500')) return 500;
    if (url.includes('error')) return 500;
    if (url.includes('redirect')) return 301;
    return Math.random() > 0.9 ? 503 : 200;
  }

  private simulateTitle(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} - Home`;
    } catch {
      return 'Untitled Page';
    }
  }

  private estimateFileSize(pathOrUrl: string): number {
    const ext = pathOrUrl.split('.').pop()?.toLowerCase();
    const sizeMap: Record<string, number> = { pdf: 2_500_000, zip: 15_000_000, png: 1_200_000, jpg: 800_000, csv: 500_000, json: 200_000, xlsx: 1_500_000, docx: 1_000_000 };
    return (sizeMap[ext || ''] || 1_000_000) + Math.floor(Math.random() * 500_000);
  }

  private guessMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = { pdf: 'application/pdf', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', csv: 'text/csv', json: 'application/json' };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  private simulateChecksum(): string {
    const hex = () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `${hex()}${hex()}${hex()}${hex()}`;
  }

  private generateId(): string {
    return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
