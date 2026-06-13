/**
 * AENEWS Agent OS X - Digital Twin Service
 *
 * Mirrors the real infrastructure (VPS, Docker, Browser, Databases, APIs,
 * GitHub, Cloud Services) as a constantly-synchronized digital representation.
 *
 * The Digital Twin provides:
 *  - Real-time state of every infrastructure component
 *  - Sync simulation with change detection
 *  - Drift detection against expected baselines
 *  - Aggregate health and cost summaries
 *  - CRUD for dynamic component registration
 *
 * All state is held in memory. In production, each sync method would
 * call out to real providers (SSH, Docker API, DB drivers, etc.).
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// ─── Type Definitions ──────────────────────────────────────────────

export interface TwinVPS {
  id: string;
  host: string;
  ip: string;
  status: 'running' | 'stopped' | 'error';
  cpu: { cores: number; usagePercent: number };
  memory: { totalGb: number; usedGb: number; usagePercent: number };
  disk: { totalGb: number; usedGb: number; usagePercent: number };
  os: string;
  services: TwinVPSService[];
  lastSyncAt: Date;
}

export interface TwinVPSService {
  name: string;
  port: number;
  status: 'running' | 'stopped';
  protocol: string;
}

export interface TwinContainer {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'dead';
  ports: Array<{ internal: number; external: number; protocol: string }>;
  resources: { cpuPercent: number; memoryMb: number; memoryLimitMb: number };
  health: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  createdAt: Date;
  lastSyncAt: Date;
}

export interface TwinDatabase {
  id: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'neo4j' | 'qdrant';
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'error';
  size: { totalMb: number; usedMb: number };
  connections: { active: number; max: number };
  replication: { enabled: boolean; role: 'primary' | 'replica'; lagMs: number };
  lastSyncAt: Date;
}

export interface TwinAPI {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  status: 'operational' | 'degraded' | 'down';
  avgLatencyMs: number;
  rateLimit: { remaining: number; limit: number; resetAt: Date };
  lastSyncAt: Date;
}

export interface TwinGitRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  lastCommit: { hash: string; message: string; author: string; date: Date };
  status: 'clean' | 'dirty' | 'ahead' | 'behind';
  aheadBy: number;
  behindBy: number;
  lastSyncAt: Date;
}

export interface TwinCloudService {
  id: string;
  provider: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'other';
  service: string;
  region: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  cost: { daily: number; monthly: number };
  lastSyncAt: Date;
}

export interface TwinBrowser {
  id: string;
  type: 'chromium' | 'firefox' | 'webkit';
  version: string;
  sessions: { active: number; max: number };
  status: 'operational' | 'degraded' | 'down';
  lastSyncAt: Date;
}

export interface DigitalTwinState {
  id: string;
  lastSyncAt: Date;
  vps: TwinVPS[];
  containers: TwinContainer[];
  databases: TwinDatabase[];
  apis: TwinAPI[];
  gitRepos: TwinGitRepo[];
  cloudServices: TwinCloudService[];
  browsers: TwinBrowser[];
  syncIntervalMs: number;
}

// ─── Internal Tracking Types ────────────────────────────────────────

export type ComponentType =
  | 'vps'
  | 'containers'
  | 'databases'
  | 'apis'
  | 'gitRepos'
  | 'cloudServices'
  | 'browsers';

export interface ComponentChange {
  componentType: ComponentType;
  componentId: string;
  changeType: 'added' | 'removed' | 'updated';
  field?: string;
  previousValue?: any;
  newValue?: any;
  timestamp: Date;
}

export interface SyncResult {
  syncId: string;
  startedAt: Date;
  completedAt: Date;
  changes: ComponentChange[];
  componentsSynced: number;
  driftDetected: boolean;
}

export interface DriftEntry {
  componentType: ComponentType;
  componentId: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthSummary {
  overallScore: number; // 0-100
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  componentCounts: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
  breakdown: Record<
    ComponentType,
    {
      score: number;
      count: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    }
  >;
  alerts: Array<{ componentType: ComponentType; componentId: string; message: string }>;
}

export interface CostSummary {
  dailyTotal: number;
  monthlyTotal: number;
  monthlyProjected: number;
  byProvider: Record<string, { daily: number; monthly: number }>;
  byService: Record<string, { daily: number; monthly: number }>;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_SYNC_INTERVAL_MS = 30_000; // 30 seconds
const MAX_CHANGES_HISTORY = 10_000;
const HEALTH_WEIGHTS: Record<ComponentType, number> = {
  vps: 0.25,
  containers: 0.2,
  databases: 0.2,
  apis: 0.15,
  gitRepos: 0.05,
  cloudServices: 0.1,
  browsers: 0.05,
};

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class DigitalTwinService {
  private readonly logger = new Logger(DigitalTwinService.name);

  /** The canonical digital twin state */
  private state: DigitalTwinState;

  /** Bounded history of detected changes */
  private readonly changeHistory: ComponentChange[] = [];

  /** Expected baseline state for drift detection */
  private readonly expectedBaselines: Map<string, Record<string, any>> = new Map();

  constructor() {
    this.state = this.createDefaultState();
  }

  // ─── 1. initialize ──────────────────────────────────────────────

  /**
   * Set up the digital twin with initial state.
   * Merges provided partial state over the defaults.
   */
  initialize(state?: Partial<DigitalTwinState>): void {
    this.logger.log('Initializing Digital Twin');

    const defaults = this.createDefaultState();

    if (state) {
      this.state = {
        ...defaults,
        ...state,
        vps: state.vps ?? defaults.vps,
        containers: state.containers ?? defaults.containers,
        databases: state.databases ?? defaults.databases,
        apis: state.apis ?? defaults.apis,
        gitRepos: state.gitRepos ?? defaults.gitRepos,
        cloudServices: state.cloudServices ?? defaults.cloudServices,
        browsers: state.browsers ?? defaults.browsers,
        lastSyncAt: new Date(),
      };
    } else {
      this.state = defaults;
    }

    this.logger.log(`Digital Twin initialized — ${this.countAllComponents()} components tracked`);
  }

  // ─── 2. syncAll ─────────────────────────────────────────────────

  /**
   * Synchronize all infrastructure components.
   * Updates timestamps, detects changes since last sync.
   * Returns a SyncResult with all detected changes.
   */
  syncAll(): SyncResult {
    const syncId = uuidv4();
    const startedAt = new Date();
    const allChanges: ComponentChange[] = [];

    this.logger.log(`Starting full sync [${syncId}]`);

    // Sync each component type
    const vpsChanges = this.syncVPS();
    allChanges.push(...vpsChanges);

    const containerChanges = this.syncContainers();
    allChanges.push(...containerChanges);

    const dbChanges = this.syncDatabases();
    allChanges.push(...dbChanges);

    const apiChanges = this.syncAPIs();
    allChanges.push(...apiChanges);

    const gitChanges = this.syncGitRepos();
    allChanges.push(...gitChanges);

    const cloudChanges = this.syncCloudServices();
    allChanges.push(...cloudChanges);

    const browserChanges = this.syncBrowsers();
    allChanges.push(...browserChanges);

    // Update global sync timestamp
    this.state.lastSyncAt = new Date();
    const completedAt = new Date();

    // Record changes to bounded history
    this.changeHistory.push(...allChanges);
    if (this.changeHistory.length > MAX_CHANGES_HISTORY) {
      this.changeHistory.splice(0, this.changeHistory.length - MAX_CHANGES_HISTORY);
    }

    const result: SyncResult = {
      syncId,
      startedAt,
      completedAt,
      changes: allChanges,
      componentsSynced: this.countAllComponents(),
      driftDetected: allChanges.some(
        (c) => c.changeType === 'updated' || c.changeType === 'added' || c.changeType === 'removed',
      ),
    };

    this.logger.log(
      `Full sync complete [${syncId}] — ${allChanges.length} changes, ${result.componentsSynced} components`,
    );

    return result;
  }

  // ─── 3. syncVPS ─────────────────────────────────────────────────

  /**
   * Sync VPS data. Update CPU/memory/disk metrics. Detect service changes.
   * If vpsId is provided, only that VPS is synced.
   */
  syncVPS(vpsId?: string): ComponentChange[] {
    const changes: ComponentChange[] = [];
    const targets = vpsId ? this.state.vps.filter((v) => v.id === vpsId) : this.state.vps;

    if (vpsId && targets.length === 0) {
      this.logger.warn(`VPS with id "${vpsId}" not found`);
      return changes;
    }

    for (const vps of targets) {
      const previousCpu = { ...vps.cpu };
      const previousMemory = { ...vps.memory };
      const previousDisk = { ...vps.disk };
      const previousStatus = vps.status;

      // Simulate metric fluctuation
      vps.cpu.usagePercent = this.simulateMetric(vps.cpu.usagePercent, 5, 100);
      vps.memory.usedGb = this.simulateMetric(vps.memory.usedGb, 0.5, vps.memory.totalGb);
      vps.memory.usagePercent = parseFloat(
        ((vps.memory.usedGb / vps.memory.totalGb) * 100).toFixed(1),
      );
      vps.disk.usedGb = this.simulateMetric(vps.disk.usedGb, 0.2, vps.disk.totalGb);
      vps.disk.usagePercent = parseFloat(((vps.disk.usedGb / vps.disk.totalGb) * 100).toFixed(1));

      // VPS status derived from resource pressure
      if (vps.cpu.usagePercent > 95 || vps.memory.usagePercent > 98) {
        vps.status = 'error';
      } else if (vps.cpu.usagePercent > 80 || vps.memory.usagePercent > 85) {
        vps.status = 'running'; // Still running but under pressure
      } else {
        vps.status = 'running';
      }

      vps.lastSyncAt = new Date();

      // Detect changes
      if (vps.status !== previousStatus) {
        changes.push(
          this.createChange('vps', vps.id, 'updated', 'status', previousStatus, vps.status),
        );
      }
      if (Math.abs(vps.cpu.usagePercent - previousCpu.usagePercent) > 1) {
        changes.push(
          this.createChange(
            'vps',
            vps.id,
            'updated',
            'cpu.usagePercent',
            previousCpu.usagePercent,
            vps.cpu.usagePercent,
          ),
        );
      }
      if (Math.abs(vps.memory.usagePercent - previousMemory.usagePercent) > 1) {
        changes.push(
          this.createChange(
            'vps',
            vps.id,
            'updated',
            'memory.usagePercent',
            previousMemory.usagePercent,
            vps.memory.usagePercent,
          ),
        );
      }
      if (Math.abs(vps.disk.usagePercent - previousDisk.usagePercent) > 0.5) {
        changes.push(
          this.createChange(
            'vps',
            vps.id,
            'updated',
            'disk.usagePercent',
            previousDisk.usagePercent,
            vps.disk.usagePercent,
          ),
        );
      }

      // Detect service changes
      for (const service of vps.services) {
        const previousServiceStatus = service.status;
        // Randomly flip service status with low probability
        if (Math.random() < 0.05) {
          service.status = service.status === 'running' ? 'stopped' : 'running';
        }
        if (service.status !== previousServiceStatus) {
          changes.push(
            this.createChange(
              'vps',
              vps.id,
              'updated',
              `services.${service.name}.status`,
              previousServiceStatus,
              service.status,
            ),
          );
        }
      }
    }

    this.logger.debug?.(`VPS sync: ${targets.length} instances, ${changes.length} changes`);
    return changes;
  }

  // ─── 4. syncContainers ──────────────────────────────────────────

  /**
   * Sync Docker containers. Detect new/removed/changed containers.
   * Update health status.
   */
  syncContainers(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const container of this.state.containers) {
      const previousStatus = container.status;
      const previousHealth = container.health;
      const previousCpu = container.resources.cpuPercent;
      const previousMemory = container.resources.memoryMb;

      // Simulate resource fluctuation
      container.resources.cpuPercent = this.simulateMetric(container.resources.cpuPercent, 5, 100);
      container.resources.memoryMb = this.simulateMetric(
        container.resources.memoryMb,
        10,
        container.resources.memoryLimitMb,
      );

      // Simulate container status changes with low probability
      const statusRoll = Math.random();
      if (container.status === 'running' && statusRoll < 0.02) {
        container.status = Math.random() < 0.5 ? 'stopped' : 'restarting';
      } else if (container.status === 'stopped' && statusRoll < 0.1) {
        container.status = 'running';
      } else if (container.status === 'restarting') {
        container.status = Math.random() < 0.7 ? 'running' : 'dead';
      }

      // Derive health from status
      if (container.status === 'running') {
        container.health = container.resources.cpuPercent > 90 ? 'unhealthy' : 'healthy';
      } else if (container.status === 'restarting') {
        container.health = 'starting';
      } else {
        container.health = 'unknown';
      }

      container.lastSyncAt = new Date();

      // Detect changes
      if (container.status !== previousStatus) {
        changes.push(
          this.createChange(
            'containers',
            container.id,
            'updated',
            'status',
            previousStatus,
            container.status,
          ),
        );
      }
      if (container.health !== previousHealth) {
        changes.push(
          this.createChange(
            'containers',
            container.id,
            'updated',
            'health',
            previousHealth,
            container.health,
          ),
        );
      }
      if (Math.abs(container.resources.cpuPercent - previousCpu) > 2) {
        changes.push(
          this.createChange(
            'containers',
            container.id,
            'updated',
            'resources.cpuPercent',
            previousCpu,
            container.resources.cpuPercent,
          ),
        );
      }
      if (Math.abs(container.resources.memoryMb - previousMemory) > 20) {
        changes.push(
          this.createChange(
            'containers',
            container.id,
            'updated',
            'resources.memoryMb',
            previousMemory,
            container.resources.memoryMb,
          ),
        );
      }
    }

    this.logger.debug?.(
      `Container sync: ${this.state.containers.length} containers, ${changes.length} changes`,
    );
    return changes;
  }

  // ─── 5. syncDatabases ───────────────────────────────────────────

  /**
   * Sync database status. Check connections, replication lag, size changes.
   */
  syncDatabases(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const db of this.state.databases) {
      const previousStatus = db.status;
      const previousActiveConnections = db.connections.active;
      const previousUsedMb = db.size.usedMb;
      const previousLagMs = db.replication.lagMs;

      // Simulate connection fluctuation
      db.connections.active = this.simulateMetric(db.connections.active, 2, db.connections.max);

      // Simulate size growth (monotonically increasing with small variance)
      if (db.size.usedMb < db.size.totalMb) {
        db.size.usedMb = Math.min(db.size.totalMb, db.size.usedMb + Math.random() * 5);
      }

      // Simulate replication lag
      if (db.replication.enabled) {
        db.replication.lagMs = this.simulateMetric(db.replication.lagMs, 0, 5000);
        // High lag can indicate replication issues
        if (db.replication.lagMs > 3000) {
          db.status = 'error';
        }
      }

      // Connection check simulation
      if (db.status === 'connected') {
        if (Math.random() < 0.02) {
          db.status = 'disconnected';
        }
      } else if (db.status === 'disconnected') {
        if (Math.random() < 0.3) {
          db.status = 'connected';
        }
      } else if (db.status === 'error') {
        if (Math.random() < 0.15) {
          db.status = 'connected';
        }
      }

      db.lastSyncAt = new Date();

      // Detect changes
      if (db.status !== previousStatus) {
        changes.push(
          this.createChange('databases', db.id, 'updated', 'status', previousStatus, db.status),
        );
      }
      if (Math.abs(db.connections.active - previousActiveConnections) > 3) {
        changes.push(
          this.createChange(
            'databases',
            db.id,
            'updated',
            'connections.active',
            previousActiveConnections,
            db.connections.active,
          ),
        );
      }
      if (Math.abs(db.size.usedMb - previousUsedMb) > 10) {
        changes.push(
          this.createChange(
            'databases',
            db.id,
            'updated',
            'size.usedMb',
            previousUsedMb,
            db.size.usedMb,
          ),
        );
      }
      if (db.replication.enabled && Math.abs(db.replication.lagMs - previousLagMs) > 100) {
        changes.push(
          this.createChange(
            'databases',
            db.id,
            'updated',
            'replication.lagMs',
            previousLagMs,
            db.replication.lagMs,
          ),
        );
      }
    }

    this.logger.debug?.(
      `Database sync: ${this.state.databases.length} instances, ${changes.length} changes`,
    );
    return changes;
  }

  // ─── 6. syncAPIs ────────────────────────────────────────────────

  /**
   * Sync API endpoints. Check latency, rate limits, status.
   */
  syncAPIs(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const api of this.state.apis) {
      const previousStatus = api.status;
      const previousLatency = api.avgLatencyMs;
      const previousRemaining = api.rateLimit.remaining;

      // Simulate latency fluctuation
      api.avgLatencyMs = this.simulateMetric(api.avgLatencyMs, 10, 5000);

      // Derive status from latency
      if (api.avgLatencyMs > 3000) {
        api.status = 'down';
      } else if (api.avgLatencyMs > 1000) {
        api.status = 'degraded';
      } else {
        api.status = 'operational';
      }

      // Random outage simulation
      if (api.status === 'operational' && Math.random() < 0.01) {
        api.status = 'down';
        api.avgLatencyMs = 9999;
      }

      // Simulate rate limit consumption
      api.rateLimit.remaining = Math.max(
        0,
        api.rateLimit.remaining - Math.floor(Math.random() * 50),
      );

      // Reset rate limit if past reset time
      if (new Date() >= api.rateLimit.resetAt) {
        api.rateLimit.remaining = api.rateLimit.limit;
        api.rateLimit.resetAt = new Date(Date.now() + 3600_000); // 1 hour from now
      }

      api.lastSyncAt = new Date();

      // Detect changes
      if (api.status !== previousStatus) {
        changes.push(
          this.createChange('apis', api.id, 'updated', 'status', previousStatus, api.status),
        );
      }
      if (Math.abs(api.avgLatencyMs - previousLatency) > 50) {
        changes.push(
          this.createChange(
            'apis',
            api.id,
            'updated',
            'avgLatencyMs',
            previousLatency,
            api.avgLatencyMs,
          ),
        );
      }
      if (api.rateLimit.remaining !== previousRemaining) {
        changes.push(
          this.createChange(
            'apis',
            api.id,
            'updated',
            'rateLimit.remaining',
            previousRemaining,
            api.rateLimit.remaining,
          ),
        );
      }
    }

    this.logger.debug?.(`API sync: ${this.state.apis.length} endpoints, ${changes.length} changes`);
    return changes;
  }

  // ─── 7. syncGitRepos ────────────────────────────────────────────

  /**
   * Sync git repositories. Check branch status, commits, ahead/behind.
   */
  syncGitRepos(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const repo of this.state.gitRepos) {
      const previousStatus = repo.status;
      const previousAhead = repo.aheadBy;
      const previousBehind = repo.behindBy;

      // Simulate new commits arriving (behindBy increases)
      if (Math.random() < 0.3) {
        repo.behindBy += Math.floor(Math.random() * 3);
      }

      // Simulate local commits (aheadBy increases)
      if (Math.random() < 0.15) {
        repo.aheadBy += Math.floor(Math.random() * 2);
      }

      // Derive status
      if (repo.aheadBy > 0 && repo.behindBy > 0) {
        repo.status = 'ahead'; // has diverged, but report as ahead
      } else if (repo.aheadBy > 0) {
        repo.status = 'ahead';
      } else if (repo.behindBy > 0) {
        repo.status = 'behind';
      } else {
        repo.status = 'clean';
      }

      // Simulate dirty working tree
      if (repo.status === 'clean' && Math.random() < 0.05) {
        repo.status = 'dirty';
      }

      // Simulate new commit arriving (update lastCommit)
      if (repo.behindBy > 0 && Math.random() < 0.2) {
        repo.lastCommit = {
          hash: this.randomHash(),
          message: `Simulated commit at ${new Date().toISOString()}`,
          author: 'system',
          date: new Date(),
        };
      }

      repo.lastSyncAt = new Date();

      // Detect changes
      if (repo.status !== previousStatus) {
        changes.push(
          this.createChange('gitRepos', repo.id, 'updated', 'status', previousStatus, repo.status),
        );
      }
      if (repo.aheadBy !== previousAhead) {
        changes.push(
          this.createChange('gitRepos', repo.id, 'updated', 'aheadBy', previousAhead, repo.aheadBy),
        );
      }
      if (repo.behindBy !== previousBehind) {
        changes.push(
          this.createChange(
            'gitRepos',
            repo.id,
            'updated',
            'behindBy',
            previousBehind,
            repo.behindBy,
          ),
        );
      }
    }

    this.logger.debug?.(
      `GitRepo sync: ${this.state.gitRepos.length} repos, ${changes.length} changes`,
    );
    return changes;
  }

  // ─── 8. syncCloudServices ───────────────────────────────────────

  /**
   * Sync cloud services. Check status and cost.
   */
  syncCloudServices(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const cloud of this.state.cloudServices) {
      const previousStatus = cloud.status;
      const previousDaily = cloud.cost.daily;
      const previousMonthly = cloud.cost.monthly;

      // Simulate cost fluctuation (daily drifts, monthly tracks)
      cloud.cost.daily = parseFloat(
        this.simulateMetric(cloud.cost.daily, 0.5, cloud.cost.monthly / 20).toFixed(2),
      );
      cloud.cost.monthly = parseFloat((cloud.cost.daily * 30).toFixed(2));

      // Simulate status changes
      if (cloud.status === 'operational' && Math.random() < 0.02) {
        cloud.status = Math.random() < 0.5 ? 'degraded' : 'maintenance';
      } else if (cloud.status === 'degraded') {
        cloud.status = Math.random() < 0.3 ? 'operational' : 'down';
      } else if (cloud.status === 'down') {
        cloud.status = Math.random() < 0.2 ? 'operational' : 'degraded';
      } else if (cloud.status === 'maintenance') {
        cloud.status = Math.random() < 0.4 ? 'operational' : 'maintenance';
      }

      cloud.lastSyncAt = new Date();

      // Detect changes
      if (cloud.status !== previousStatus) {
        changes.push(
          this.createChange(
            'cloudServices',
            cloud.id,
            'updated',
            'status',
            previousStatus,
            cloud.status,
          ),
        );
      }
      if (Math.abs(cloud.cost.daily - previousDaily) > 0.5) {
        changes.push(
          this.createChange(
            'cloudServices',
            cloud.id,
            'updated',
            'cost.daily',
            previousDaily,
            cloud.cost.daily,
          ),
        );
      }
      if (Math.abs(cloud.cost.monthly - previousMonthly) > 5) {
        changes.push(
          this.createChange(
            'cloudServices',
            cloud.id,
            'updated',
            'cost.monthly',
            previousMonthly,
            cloud.cost.monthly,
          ),
        );
      }
    }

    this.logger.debug?.(
      `CloudService sync: ${this.state.cloudServices.length} services, ${changes.length} changes`,
    );
    return changes;
  }

  // ─── 9. syncBrowsers ────────────────────────────────────────────

  /**
   * Sync browser instances. Check sessions and health.
   */
  syncBrowsers(): ComponentChange[] {
    const changes: ComponentChange[] = [];

    for (const browser of this.state.browsers) {
      const previousStatus = browser.status;
      const previousSessions = browser.sessions.active;

      // Simulate session fluctuation
      browser.sessions.active = this.simulateMetric(
        browser.sessions.active,
        0,
        browser.sessions.max,
      );

      // Derive status from session load
      const sessionRatio = browser.sessions.active / browser.sessions.max;
      if (sessionRatio >= 1) {
        browser.status = 'degraded';
      } else if (sessionRatio > 0.8) {
        browser.status = 'operational'; // still ok but near capacity
      } else {
        browser.status = 'operational';
      }

      // Random failure simulation (can override the derived status)
      if (Math.random() < 0.01) {
        browser.status = 'down';
      }
      // Recovery from down state
      if (browser.status === 'down' && Math.random() < 0.3) {
        browser.status = 'operational';
      }

      browser.lastSyncAt = new Date();

      // Detect changes
      if (browser.status !== previousStatus) {
        changes.push(
          this.createChange(
            'browsers',
            browser.id,
            'updated',
            'status',
            previousStatus,
            browser.status,
          ),
        );
      }
      if (browser.sessions.active !== previousSessions) {
        changes.push(
          this.createChange(
            'browsers',
            browser.id,
            'updated',
            'sessions.active',
            previousSessions,
            browser.sessions.active,
          ),
        );
      }
    }

    this.logger.debug?.(
      `Browser sync: ${this.state.browsers.length} instances, ${changes.length} changes`,
    );
    return changes;
  }

  // ─── 10. getState ───────────────────────────────────────────────

  /**
   * Get the full twin state as a deep copy.
   */
  getState(): DigitalTwinState {
    return this.deepClone(this.state);
  }

  // ─── 11. getComponent ───────────────────────────────────────────

  /**
   * Get a specific component by type and ID.
   * Returns null if not found.
   */
  getComponent(componentType: ComponentType, id: string): any | null {
    const collection = this.getCollection(componentType);
    const component = collection.find((item: any) => item.id === id);
    return component ? this.deepClone(component) : null;
  }

  // ─── 12. findComponentByProperty ────────────────────────────────

  /**
   * Find components matching a property value within a component type.
   * Supports dot-notation for nested properties (e.g., 'cpu.usagePercent').
   */
  findComponentByProperty(componentType: ComponentType, property: string, value: any): any[] {
    const collection = this.getCollection(componentType);

    return collection
      .filter((item: any) => {
        const actualValue = this.getNestedProperty(item, property);
        return actualValue === value;
      })
      .map((item: any) => this.deepClone(item));
  }

  // ─── 13. detectDrift ────────────────────────────────────────────

  /**
   * Compare twin state against expected baselines.
   * Returns an array of drift entries representing differences.
   */
  detectDrift(): DriftEntry[] {
    const drifts: DriftEntry[] = [];
    const componentTypes: ComponentType[] = [
      'vps',
      'containers',
      'databases',
      'apis',
      'gitRepos',
      'cloudServices',
      'browsers',
    ];

    for (const type of componentTypes) {
      const collection = this.getCollection(type);

      for (const component of collection) {
        const baselineKey = `${type}:${component.id}`;
        const baseline = this.expectedBaselines.get(baselineKey);

        if (!baseline) continue;

        for (const [field, expectedValue] of Object.entries(baseline)) {
          const actualValue = this.getNestedProperty(component, field);

          if (actualValue !== expectedValue) {
            drifts.push({
              componentType: type,
              componentId: component.id,
              field,
              expectedValue,
              actualValue,
              severity: this.classifyDriftSeverity(type, field, expectedValue, actualValue),
            });
          }
        }
      }
    }

    this.logger.debug?.(`Drift detection: ${drifts.length} drifts found`);
    return drifts;
  }

  // ─── 14. getHealthSummary ───────────────────────────────────────

  /**
   * Compute overall health of all infrastructure.
   * Aggregates health scores per component type, weighted by importance.
   */
  getHealthSummary(): HealthSummary {
    const breakdown: HealthSummary['breakdown'] = {} as any;
    let totalHealthy = 0;
    let totalDegraded = 0;
    let totalUnhealthy = 0;
    let totalUnknown = 0;
    let totalComponents = 0;
    const alerts: HealthSummary['alerts'] = [];

    const componentTypes: ComponentType[] = [
      'vps',
      'containers',
      'databases',
      'apis',
      'gitRepos',
      'cloudServices',
      'browsers',
    ];

    for (const type of componentTypes) {
      const collection = this.getCollection(type);
      const count = collection.length;
      let healthy = 0;
      let degraded = 0;
      let unhealthy = 0;

      for (const component of collection) {
        const health = this.computeComponentHealth(type, component);
        if (health.score >= 80) {
          healthy++;
        } else if (health.score >= 50) {
          degraded++;
        } else {
          unhealthy++;
        }

        // Generate alerts for unhealthy components
        if (health.score < 50) {
          alerts.push({
            componentType: type,
            componentId: component.id,
            message: health.reason,
          });
        }
      }

      const typeScore = count > 0 ? (healthy * 100 + degraded * 60 + unhealthy * 20) / count : 100;

      breakdown[type] = {
        score: parseFloat(typeScore.toFixed(1)),
        count,
        healthy,
        degraded,
        unhealthy,
      };

      totalHealthy += healthy;
      totalDegraded += degraded;
      totalUnhealthy += unhealthy;
      totalComponents += count;
    }

    // Compute weighted overall score
    let overallScore = 0;
    let totalWeight = 0;
    for (const type of componentTypes) {
      const weight = HEALTH_WEIGHTS[type];
      overallScore += breakdown[type].score * weight;
      totalWeight += weight;
    }
    overallScore = totalWeight > 0 ? overallScore / totalWeight : 100;

    // Unknown = components where we couldn't determine health (currently 0 for simulation)
    totalUnknown = 0;

    // Determine overall status
    let status: HealthSummary['status'];
    if (overallScore >= 90) {
      status = 'healthy';
    } else if (overallScore >= 70) {
      status = 'degraded';
    } else if (overallScore >= 40) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      overallScore: parseFloat(overallScore.toFixed(1)),
      status,
      componentCounts: {
        total: totalComponents,
        healthy: totalHealthy,
        degraded: totalDegraded,
        unhealthy: totalUnhealthy,
        unknown: totalUnknown,
      },
      breakdown,
      alerts,
    };
  }

  // ─── 15. getCostSummary ─────────────────────────────────────────

  /**
   * Compute total infrastructure cost from cloud services.
   * Breaks down by provider and service type.
   */
  getCostSummary(): CostSummary {
    let dailyTotal = 0;
    let monthlyTotal = 0;
    const byProvider: CostSummary['byProvider'] = {};
    const byService: CostSummary['byService'] = {};

    for (const cloud of this.state.cloudServices) {
      dailyTotal += cloud.cost.daily;
      monthlyTotal += cloud.cost.monthly;

      // By provider
      if (!byProvider[cloud.provider]) {
        byProvider[cloud.provider] = { daily: 0, monthly: 0 };
      }
      byProvider[cloud.provider].daily += cloud.cost.daily;
      byProvider[cloud.provider].monthly += cloud.cost.monthly;

      // By service
      const serviceKey = `${cloud.provider}:${cloud.service}`;
      if (!byService[serviceKey]) {
        byService[serviceKey] = { daily: 0, monthly: 0 };
      }
      byService[serviceKey].daily += cloud.cost.daily;
      byService[serviceKey].monthly += cloud.cost.monthly;
    }

    // Round totals
    const round = (n: number) => parseFloat(n.toFixed(2));

    return {
      dailyTotal: round(dailyTotal),
      monthlyTotal: round(monthlyTotal),
      monthlyProjected: round(dailyTotal * 30),
      byProvider: Object.fromEntries(
        Object.entries(byProvider).map(([k, v]) => [
          k,
          { daily: round(v.daily), monthly: round(v.monthly) },
        ]),
      ),
      byService: Object.fromEntries(
        Object.entries(byService).map(([k, v]) => [
          k,
          { daily: round(v.daily), monthly: round(v.monthly) },
        ]),
      ),
    };
  }

  // ─── 16. registerComponent ──────────────────────────────────────

  /**
   * Add a new component to the twin.
   * Validates that the component does not already exist.
   */
  registerComponent(componentType: ComponentType, component: any): void {
    const collection = this.getCollection(componentType);

    if (!component.id) {
      throw new Error(`Component must have an "id" field`);
    }

    const exists = collection.some((item: any) => item.id === component.id);
    if (exists) {
      throw new Error(`${componentType} component with id "${component.id}" already exists`);
    }

    // Add lastSyncAt if not present
    const inserted = {
      ...component,
      lastSyncAt: component.lastSyncAt ?? new Date(),
    };

    collection.push(inserted);
    this.state.lastSyncAt = new Date();

    // Record to change history
    const change = this.createChange(
      componentType,
      component.id,
      'added',
      undefined,
      null,
      inserted,
    );
    this.changeHistory.push(change);
    if (this.changeHistory.length > MAX_CHANGES_HISTORY) {
      this.changeHistory.splice(0, this.changeHistory.length - MAX_CHANGES_HISTORY);
    }

    this.logger.log(`Registered ${componentType} component: ${component.id}`);
  }

  // ─── 17. updateComponent ────────────────────────────────────────

  /**
   * Update a component in the twin by type and ID.
   * Only supplied fields in `updates` are overwritten.
   */
  updateComponent(componentType: ComponentType, id: string, updates: Record<string, any>): void {
    const collection = this.getCollection(componentType);
    const index = collection.findIndex((item: any) => item.id === id);

    if (index === -1) {
      throw new Error(`${componentType} component with id "${id}" not found`);
    }

    const previous = this.deepClone(collection[index]);

    // Apply updates (shallow merge; for nested objects, caller should provide full replacement)
    const component = collection[index];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        (component as any)[key] = value;
      }
    }

    component.lastSyncAt = new Date();
    this.state.lastSyncAt = new Date();

    // Record changes for each updated field
    for (const [key, newValue] of Object.entries(updates)) {
      if (key !== 'id') {
        const change = this.createChange(
          componentType,
          id,
          'updated',
          key,
          this.getNestedProperty(previous, key),
          newValue,
        );
        this.changeHistory.push(change);
      }
    }

    if (this.changeHistory.length > MAX_CHANGES_HISTORY) {
      this.changeHistory.splice(0, this.changeHistory.length - MAX_CHANGES_HISTORY);
    }

    this.logger.debug?.(
      `Updated ${componentType} component "${id}": ${Object.keys(updates).join(', ')}`,
    );
  }

  // ─── 18. removeComponent ────────────────────────────────────────

  /**
   * Remove a component from the twin by type and ID.
   */
  removeComponent(componentType: ComponentType, id: string): void {
    const collection = this.getCollection(componentType);
    const index = collection.findIndex((item: any) => item.id === id);

    if (index === -1) {
      throw new Error(`${componentType} component with id "${id}" not found`);
    }

    const removed = collection.splice(index, 1)[0];
    this.state.lastSyncAt = new Date();

    // Clean up baseline if any
    this.expectedBaselines.delete(`${componentType}:${id}`);

    // Record to change history
    const change = this.createChange(componentType, id, 'removed', undefined, removed, null);
    this.changeHistory.push(change);
    if (this.changeHistory.length > MAX_CHANGES_HISTORY) {
      this.changeHistory.splice(0, this.changeHistory.length - MAX_CHANGES_HISTORY);
    }

    this.logger.log(`Removed ${componentType} component: ${id}`);
  }

  // ─── Additional Utility Methods ──────────────────────────────────

  /**
   * Set an expected baseline for a component (used by detectDrift).
   */
  setExpectedBaseline(
    componentType: ComponentType,
    componentId: string,
    baseline: Record<string, any>,
  ): void {
    this.expectedBaselines.set(`${componentType}:${componentId}`, baseline);
  }

  /**
   * Get the change history, optionally filtered by component type.
   */
  getChangeHistory(componentType?: ComponentType): ComponentChange[] {
    if (componentType) {
      return this.changeHistory.filter((c) => c.componentType === componentType);
    }
    return [...this.changeHistory];
  }

  /**
   * Count all components across all types.
   */
  countAllComponents(): number {
    return (
      this.state.vps.length +
      this.state.containers.length +
      this.state.databases.length +
      this.state.apis.length +
      this.state.gitRepos.length +
      this.state.cloudServices.length +
      this.state.browsers.length
    );
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  /**
   * Create the default (empty) twin state.
   */
  private createDefaultState(): DigitalTwinState {
    return {
      id: uuidv4(),
      lastSyncAt: new Date(),
      vps: [],
      containers: [],
      databases: [],
      apis: [],
      gitRepos: [],
      cloudServices: [],
      browsers: [],
      syncIntervalMs: DEFAULT_SYNC_INTERVAL_MS,
    };
  }

  /**
   * Get a reference to a component collection array by type.
   */
  private getCollection(componentType: ComponentType): any[] {
    switch (componentType) {
      case 'vps':
        return this.state.vps;
      case 'containers':
        return this.state.containers;
      case 'databases':
        return this.state.databases;
      case 'apis':
        return this.state.apis;
      case 'gitRepos':
        return this.state.gitRepos;
      case 'cloudServices':
        return this.state.cloudServices;
      case 'browsers':
        return this.state.browsers;
      default:
        throw new Error(`Unknown component type: ${componentType}`);
    }
  }

  /**
   * Create a ComponentChange record.
   */
  private createChange(
    componentType: ComponentType,
    componentId: string,
    changeType: 'added' | 'removed' | 'updated',
    field?: string,
    previousValue?: any,
    newValue?: any,
  ): ComponentChange {
    return {
      componentType,
      componentId,
      changeType,
      field,
      previousValue,
      newValue,
      timestamp: new Date(),
    };
  }

  /**
   * Simulate a metric value with bounded random walk.
   * Clamps the result between min and max.
   */
  private simulateMetric(current: number, min: number, max: number): number {
    const delta = (Math.random() - 0.5) * (max - min) * 0.1;
    const result = current + delta;
    return Math.max(min, Math.min(max, parseFloat(result.toFixed(2))));
  }

  /**
   * Generate a random 7-character hex hash for git commit simulation.
   */
  private randomHash(): string {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Get a nested property from an object using dot-notation.
   * e.g., getNestedProperty(obj, 'cpu.usagePercent')
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Classify the severity of a drift between expected and actual values.
   */
  private classifyDriftSeverity(
    componentType: ComponentType,
    field: string,
    expected: any,
    actual: any,
  ): DriftEntry['severity'] {
    // Critical: anything that's down / error / disconnected
    if (typeof actual === 'string' && ['down', 'error', 'disconnected', 'dead'].includes(actual)) {
      return 'critical';
    }

    // High: database/infrastructure core status changes
    if ((componentType === 'databases' || componentType === 'vps') && field === 'status') {
      return 'high';
    }

    // Medium: degraded status, replication lag, high latency
    if (typeof actual === 'string' && ['degraded', 'unhealthy', 'restarting'].includes(actual)) {
      return 'medium';
    }

    if (field.includes('lagMs') && typeof actual === 'number' && actual > 1000) {
      return 'medium';
    }

    if (field.includes('Latency') && typeof actual === 'number' && actual > 500) {
      return 'medium';
    }

    // Low: everything else (minor metric drifts, status changes in non-critical components)
    return 'low';
  }

  /**
   * Compute a health score (0-100) for a single component.
   */
  private computeComponentHealth(
    componentType: ComponentType,
    component: any,
  ): { score: number; reason: string } {
    switch (componentType) {
      case 'vps': {
        if (component.status === 'error')
          return { score: 10, reason: `VPS ${component.host} is in error state` };
        if (component.status === 'stopped')
          return { score: 0, reason: `VPS ${component.host} is stopped` };
        let score = 100;
        if (component.cpu.usagePercent > 90) score -= 40;
        else if (component.cpu.usagePercent > 75) score -= 20;
        if (component.memory.usagePercent > 90) score -= 30;
        else if (component.memory.usagePercent > 80) score -= 15;
        if (component.disk.usagePercent > 90) score -= 25;
        else if (component.disk.usagePercent > 80) score -= 10;
        const stoppedServices =
          component.services?.filter((s: any) => s.status === 'stopped').length ?? 0;
        score -= stoppedServices * 10;
        return {
          score: Math.max(0, score),
          reason: score < 50 ? `VPS ${component.host} under heavy load` : '',
        };
      }
      case 'containers': {
        if (component.status === 'dead')
          return { score: 0, reason: `Container ${component.name} is dead` };
        if (component.status === 'stopped')
          return { score: 0, reason: `Container ${component.name} is stopped` };
        if (component.status === 'paused')
          return { score: 30, reason: `Container ${component.name} is paused` };
        if (component.status === 'restarting')
          return { score: 40, reason: `Container ${component.name} is restarting` };
        let score = 100;
        if (component.health === 'unhealthy') score -= 40;
        else if (component.health === 'starting') score -= 20;
        else if (component.health === 'unknown') score -= 10;
        if (component.resources.cpuPercent > 90) score -= 15;
        if (component.resources.memoryMb / component.resources.memoryLimitMb > 0.9) score -= 15;
        return {
          score: Math.max(0, score),
          reason: score < 50 ? `Container ${component.name} is unhealthy` : '',
        };
      }
      case 'databases': {
        if (component.status === 'error')
          return { score: 10, reason: `Database ${component.type}@${component.host} is in error` };
        if (component.status === 'disconnected')
          return {
            score: 20,
            reason: `Database ${component.type}@${component.host} is disconnected`,
          };
        let score = 100;
        const connRatio = component.connections.active / component.connections.max;
        if (connRatio > 0.9) score -= 25;
        else if (connRatio > 0.7) score -= 10;
        if (component.replication.enabled && component.replication.lagMs > 3000) score -= 30;
        else if (component.replication.enabled && component.replication.lagMs > 1000) score -= 15;
        const sizeRatio = component.size.usedMb / component.size.totalMb;
        if (sizeRatio > 0.9) score -= 15;
        return {
          score: Math.max(0, score),
          reason: score < 50 ? `Database ${component.type}@${component.host} has issues` : '',
        };
      }
      case 'apis': {
        if (component.status === 'down')
          return { score: 5, reason: `API ${component.name} is down` };
        if (component.status === 'degraded')
          return { score: 50, reason: `API ${component.name} is degraded` };
        let score = 100;
        if (component.avgLatencyMs > 2000) score -= 30;
        else if (component.avgLatencyMs > 500) score -= 15;
        const rateLimitRatio = component.rateLimit.remaining / component.rateLimit.limit;
        if (rateLimitRatio < 0.1) score -= 25;
        else if (rateLimitRatio < 0.3) score -= 10;
        return {
          score: Math.max(0, score),
          reason: score < 50 ? `API ${component.name} has high latency` : '',
        };
      }
      case 'gitRepos': {
        if (component.status === 'dirty')
          return { score: 60, reason: `Repo ${component.name} has uncommitted changes` };
        if (component.status === 'behind')
          return {
            score: 70,
            reason: `Repo ${component.name} is behind remote by ${component.behindBy} commits`,
          };
        if (component.status === 'ahead')
          return { score: 80, reason: `Repo ${component.name} has unpushed commits` };
        return { score: 100, reason: '' };
      }
      case 'cloudServices': {
        if (component.status === 'down')
          return {
            score: 10,
            reason: `Cloud service ${component.service} (${component.provider}) is down`,
          };
        if (component.status === 'maintenance')
          return {
            score: 40,
            reason: `Cloud service ${component.service} (${component.provider}) is in maintenance`,
          };
        if (component.status === 'degraded')
          return {
            score: 60,
            reason: `Cloud service ${component.service} (${component.provider}) is degraded`,
          };
        return { score: 100, reason: '' };
      }
      case 'browsers': {
        if (component.status === 'down')
          return { score: 10, reason: `Browser ${component.type} is down` };
        if (component.status === 'degraded')
          return { score: 60, reason: `Browser ${component.type} is degraded` };
        let score = 100;
        const sessionRatio = component.sessions.active / component.sessions.max;
        if (sessionRatio >= 1) score -= 40;
        else if (sessionRatio > 0.8) score -= 15;
        return {
          score: Math.max(0, score),
          reason: score < 50 ? `Browser ${component.type} at capacity` : '',
        };
      }
      default:
        return { score: 100, reason: '' };
    }
  }

  /**
   * Deep clone a value using structuredClone if available,
   * falling back to JSON parse/stringify.
   */
  private deepClone<T>(value: T): T {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }
}
