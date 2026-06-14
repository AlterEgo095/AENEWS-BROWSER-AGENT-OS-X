/**
 * AENEWS Agent OS X — Infrastructure Connector Service
 *
 * Comprehensive infrastructure management connector providing:
 *   Docker (via Dockerode): container management, images, logs, stats
 *   Process Management: list, inspect, kill processes
 *   System Monitoring: CPU, memory, disk, network
 *   Deployment: deploy containers, scale services
 *
 * Integration:
 *   - Circuit breaker key: connector:infrastructure
 *   - Emits events via AgentEventBusService
 *   - Records metrics via MetricsService
 *   - Graceful simulation mode when Docker daemon not available
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentEventBusService, AgentEventType } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';
import { MetricsService } from '../../observability/services/metrics.service';

// ─── Types ────────────────────────────────────────────────────────────

export interface InfraResult {
  success: boolean;
  data?: any;
  error?: string;
  mode: 'live' | 'simulation';
  duration: number;
}

export interface ContainerListOptions {
  all?: boolean;
  filters?: Record<string, string[]>;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports?: any[];
  created: number;
}

export interface ContainerLogsOptions {
  stdout?: boolean;
  stderr?: boolean;
  tail?: number;
  since?: number;
  timestamps?: boolean;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkIO: { rx: number; tx: number };
  blockIO: { read: number; write: number };
}

export interface DeployConfig {
  name: string;
  image: string;
  ports?: Record<string, string>;
  env?: Record<string, string>;
  volumes?: Record<string, string>;
  network?: string;
  restartPolicy?: 'no' | 'always' | 'on-failure';
  command?: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  cpuCount: number;
  cpuModel: string;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  loadAvg: number[];
  disks: DiskInfo[];
}

export interface DiskInfo {
  fs: string;
  mount: string;
  size: number;
  used: number;
  available: number;
  usePercent: number;
}

export interface NetworkInterface {
  iface: string;
  ip4: string;
  ip6: string;
  mac: string;
  type: string;
  speed: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
  user: string;
  started: Date;
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class InfrastructureConnectorService {
  private readonly logger = new Logger(InfrastructureConnectorService.name);
  private readonly enabled: boolean;
  private readonly isLive: boolean;

  /** Dockerode instance (lazy-initialized) */
  private docker: any = null;
  private dockerInitialized = false;
  private dockerAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly eventBus?: AgentEventBusService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.enabled = this.configService.get<string>('INFRA_ENABLED') !== 'false';

    // Docker availability will be checked lazily
    this.isLive = this.enabled;

    this.logger.log(
      `Infrastructure Connector initialized — enabled: ${this.enabled}, mode: ${this.isLive ? 'LIVE/SIMULATION' : 'SIMULATION'}`,
    );
  }

  // ─── Docker Operations ──────────────────────────────────────────

  /**
   * List running containers.
   */
  async listContainers(options?: ContainerListOptions): Promise<InfraResult> {
    return this.executeWithBreaker('listContainers', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return {
          success: true,
          data: { containers: [], message: 'Docker daemon not available (simulation)' },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }

      try {
        const containers = await docker.listContainers({
          all: options?.all ?? false,
          filters: options?.filters ? JSON.stringify(options.filters) : undefined,
        });

        const mapped: ContainerInfo[] = containers.map((c: any) => ({
          id: c.Id,
          name: c.Names?.[0]?.replace(/^\//, '') ?? 'unknown',
          image: c.Image,
          status: c.Status,
          state: c.State,
          ports: c.Ports,
          created: c.Created,
        }));

        return {
          success: true,
          data: { containers: mapped, count: mapped.length },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker listContainers error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Get container details.
   */
  async getContainer(id: string): Promise<InfraResult> {
    return this.executeWithBreaker('getContainer', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('getContainer', { id });
      }

      try {
        const container = docker.getContainer(id);
        const info = await container.inspect();

        return {
          success: true,
          data: { container: info },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker getContainer error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Start a container.
   */
  async startContainer(id: string): Promise<InfraResult> {
    return this.executeWithBreaker('startContainer', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('startContainer', { id, status: 'started' });
      }

      try {
        const container = docker.getContainer(id);
        await container.start();

        return {
          success: true,
          data: { id, status: 'started' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker startContainer error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Stop a container.
   */
  async stopContainer(id: string): Promise<InfraResult> {
    return this.executeWithBreaker('stopContainer', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('stopContainer', { id, status: 'stopped' });
      }

      try {
        const container = docker.getContainer(id);
        await container.stop();

        return {
          success: true,
          data: { id, status: 'stopped' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker stopContainer error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Restart a container.
   */
  async restartContainer(id: string): Promise<InfraResult> {
    return this.executeWithBreaker('restartContainer', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('restartContainer', { id, status: 'restarted' });
      }

      try {
        const container = docker.getContainer(id);
        await container.restart();

        return {
          success: true,
          data: { id, status: 'restarted' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker restartContainer error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Get container logs.
   */
  async getContainerLogs(id: string, options?: ContainerLogsOptions): Promise<InfraResult> {
    return this.executeWithBreaker('getContainerLogs', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('getContainerLogs', {
          id,
          logs: `[simulation] Container ${id} logs`,
        });
      }

      try {
        const container = docker.getContainer(id);
        const logs = await container.logs({
          stdout: options?.stdout ?? true,
          stderr: options?.stderr ?? true,
          tail: options?.tail ?? 100,
          since: options?.since,
          timestamps: options?.timestamps ?? true,
        });

        return {
          success: true,
          data: { id, logs: logs.toString('utf-8') },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker getContainerLogs error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Get container resource usage stats.
   */
  async getContainerStats(id: string): Promise<InfraResult> {
    return this.executeWithBreaker('getContainerStats', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('getContainerStats', {
          id,
          stats: { cpuPercent: 0, memoryUsage: 0, memoryLimit: 0, memoryPercent: 0 },
        });
      }

      try {
        const container = docker.getContainer(id);
        const stats = await container.stats({ stream: false });

        // Calculate CPU percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuPercent = systemDelta > 0 && cpuDelta > 0
          ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
          : 0;

        const memoryUsage = stats.memory_stats.usage ?? 0;
        const memoryLimit = stats.memory_stats.limit ?? 0;
        const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

        const result: ContainerStats = {
          cpuPercent: Math.round(cpuPercent * 100) / 100,
          memoryUsage,
          memoryLimit,
          memoryPercent: Math.round(memoryPercent * 100) / 100,
          networkIO: { rx: 0, tx: 0 },
          blockIO: { read: 0, write: 0 },
        };

        // Network IO
        if (stats.networks) {
          for (const net of Object.values(stats.networks) as any[]) {
            result.networkIO.rx += net.rx_bytes ?? 0;
            result.networkIO.tx += net.tx_bytes ?? 0;
          }
        }

        return {
          success: true,
          data: { id, stats: result },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker getContainerStats error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * List Docker images.
   */
  async listImages(): Promise<InfraResult> {
    return this.executeWithBreaker('listImages', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('listImages', { images: [] });
      }

      try {
        const images = await docker.listImages();

        const mapped = images.map((img: any) => ({
          id: img.Id,
          repoTags: img.RepoTags,
          size: img.Size,
          created: img.Created,
        }));

        return {
          success: true,
          data: { images: mapped, count: mapped.length },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker listImages error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Pull a Docker image.
   */
  async pullImage(image: string): Promise<InfraResult> {
    return this.executeWithBreaker('pullImage', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('pullImage', { image, status: 'pulled (simulation)' });
      }

      try {
        const stream = await docker.pull(image);
        // Wait for pull to complete
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(stream, (err: any, res: any) => {
            if (err) reject(err);
            else resolve(res);
          });
        });

        return {
          success: true,
          data: { image, status: 'pulled' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker pullImage error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Process Management ─────────────────────────────────────────

  /**
   * List system processes.
   */
  async listProcesses(): Promise<InfraResult> {
    return this.executeWithBreaker('listProcesses', async () => {
      const start = Date.now();

      try {
        const si = await import('systeminformation');
        const processes = await si.processes();

        const mapped: ProcessInfo[] = (processes.list ?? []).slice(0, 100).map((p: any) => ({
          pid: p.pid,
          name: p.name,
          cpu: p.pcpu ?? 0,
          memory: p.pmem ?? 0,
          command: p.command ?? '',
          user: p.user ?? '',
          started: new Date(),
        }));

        return {
          success: true,
          data: { processes: mapped, count: mapped.length, total: processes.all },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        // Fallback to /proc or simulation
        return this.simulationResult('listProcesses', {
          processes: [],
          message: `systeminformation not available: ${error.message}`,
        });
      }
    });
  }

  /**
   * Get process details.
   */
  async getProcess(pid: number): Promise<InfraResult> {
    return this.executeWithBreaker('getProcess', async () => {
      const start = Date.now();

      try {
        const si = await import('systeminformation');
        const processes = await si.processes();
        const proc = (processes.list ?? []).find((p: any) => p.pid === pid);

        if (!proc) {
          return {
            success: false,
            error: `Process not found: ${pid}`,
            mode: 'simulation' as const,
            duration: Date.now() - start,
          };
        }

        return {
          success: true,
          data: { process: proc },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return this.simulationResult('getProcess', { pid });
      }
    });
  }

  /**
   * Kill a process.
   */
  async killProcess(pid: number, signal?: string): Promise<InfraResult> {
    return this.executeWithBreaker('killProcess', async () => {
      const start = Date.now();

      try {
        process.kill(pid, (signal as any) ?? 'SIGTERM');

        return {
          success: true,
          data: { pid, signal: signal ?? 'SIGTERM', status: 'killed' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Kill process error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── System Monitoring ──────────────────────────────────────────

  /**
   * Get system information (CPU, memory, disk, uptime).
   */
  async getSystemInfo(): Promise<InfraResult> {
    return this.executeWithBreaker('getSystemInfo', async () => {
      const start = Date.now();

      try {
        const si = await import('systeminformation');

        const [cpu, mem, os, disk] = await Promise.all([
          si.cpu(),
          si.mem(),
          si.osInfo(),
          si.fsSize(),
        ]);

        const info: SystemInfo = {
          hostname: os.hostname,
          platform: os.platform,
          arch: os.arch,
          cpuCount: cpu.cores,
          cpuModel: cpu.manufacturer + ' ' + cpu.brand,
          totalMemory: mem.total,
          freeMemory: mem.free,
          uptime: Math.floor(process.uptime()),
          loadAvg: (await import('os')).loadavg(),
          disks: (disk ?? []).map((d: any) => ({
            fs: d.fs,
            mount: d.mount,
            size: d.size,
            used: d.used,
            available: d.available,
            usePercent: d.use,
          })),
        };

        return {
          success: true,
          data: { system: info },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        // Fallback to Node.js built-in info
        const os = await import('os');
        const info: SystemInfo = {
          hostname: os.hostname(),
          platform: process.platform,
          arch: process.arch,
          cpuCount: os.cpus().length,
          cpuModel: os.cpus()[0]?.model ?? 'Unknown',
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          uptime: os.uptime(),
          loadAvg: os.loadavg(),
          disks: [],
        };

        return {
          success: true,
          data: { system: info, source: 'nodejs-fallback' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Get network interfaces.
   */
  async getNetworkInterfaces(): Promise<InfraResult> {
    return this.executeWithBreaker('getNetworkInterfaces', async () => {
      const start = Date.now();

      try {
        const si = await import('systeminformation');
        const networks = await si.networkInterfaces();

        const mapped: NetworkInterface[] = (networks ?? []).map((n: any) => ({
          iface: n.iface,
          ip4: n.ip4,
          ip6: n.ip6,
          mac: n.mac,
          type: n.type,
          speed: n.speed,
        }));

        return {
          success: true,
          data: { interfaces: mapped, count: mapped.length },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        // Fallback to Node.js os.networkInterfaces
        const os = await import('os');
        const ni = os.networkInterfaces();
        const mapped: NetworkInterface[] = [];

        for (const [iface, addrs] of Object.entries(ni)) {
          for (const addr of addrs ?? []) {
            mapped.push({
              iface,
              ip4: addr.family === 'IPv4' ? addr.address : '',
              ip6: addr.family === 'IPv6' ? addr.address : '',
              mac: addr.mac,
              type: addr.internal ? 'internal' : 'physical',
              speed: 0,
            });
          }
        }

        return {
          success: true,
          data: { interfaces: mapped, count: mapped.length, source: 'nodejs-fallback' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Get disk usage.
   */
  async getDiskUsage(path?: string): Promise<InfraResult> {
    return this.executeWithBreaker('getDiskUsage', async () => {
      const start = Date.now();

      try {
        const si = await import('systeminformation');
        const disk = await si.fsSize();

        const disks: DiskInfo[] = (disk ?? []).map((d: any) => ({
          fs: d.fs,
          mount: d.mount,
          size: d.size,
          used: d.used,
          available: d.available,
          usePercent: d.use,
        }));

        if (path) {
          // Find the disk that matches the given path
          const matching = disks.find((d) => path.startsWith(d.mount)) ?? disks[0];
          return {
            success: true,
            data: { disk: matching, path },
            mode: 'live' as const,
            duration: Date.now() - start,
          };
        }

        return {
          success: true,
          data: { disks, count: disks.length },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: true,
          data: { disks: [], message: `systeminformation not available: ${error.message}` },
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Deployment ─────────────────────────────────────────────────

  /**
   * Deploy a new container.
   */
  async deployContainer(config: DeployConfig): Promise<InfraResult> {
    return this.executeWithBreaker('deployContainer', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('deployContainer', {
          config,
          containerId: `sim-${Date.now()}`,
          status: 'deployed (simulation)',
        });
      }

      try {
        const portBindings: Record<string, any> = {};
        const exposedPorts: Record<string, any> = {};

        if (config.ports) {
          for (const [hostPort, containerPort] of Object.entries(config.ports)) {
            exposedPorts[containerPort] = {};
            portBindings[containerPort] = [{ HostPort: hostPort }];
          }
        }

        const env = config.env
          ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`)
          : undefined;

        const binds = config.volumes
          ? Object.entries(config.volumes).map(([host, container]) => `${host}:${container}`)
          : undefined;

        const container = await docker.createContainer({
          name: config.name,
          Image: config.image,
          ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
          HostConfig: {
            PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
            Binds: binds,
            RestartPolicy: { Name: config.restartPolicy ?? 'no' },
            Memory: config.memoryLimit,
            NanoCpus: config.cpuLimit ? config.cpuLimit * 1e9 : undefined,
          },
          Env: env,
          Cmd: config.command ? config.command.split(' ') : undefined,
        });

        await container.start();

        const info = await container.inspect();

        return {
          success: true,
          data: {
            containerId: info.Id,
            name: config.name,
            status: info.State.Status,
          },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker deployContainer error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  /**
   * Scale a service (Docker Swarm).
   */
  async scaleService(name: string, replicas: number): Promise<InfraResult> {
    return this.executeWithBreaker('scaleService', async () => {
      const start = Date.now();

      const docker = await this.getDocker();
      if (!docker) {
        return this.simulationResult('scaleService', { name, replicas, status: 'scaled (simulation)' });
      }

      try {
        const service = docker.getService(name);
        const inspect = await service.inspect();

        const updatedSpec = {
          ...inspect.Spec,
          Mode: {
            Replicated: { Replicas: replicas },
          },
        };

        await service.update({
          version: inspect.Version.Index,
          ...updatedSpec,
        });

        return {
          success: true,
          data: { name, replicas, status: 'scaled' },
          mode: 'live' as const,
          duration: Date.now() - start,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Docker scaleService error: ${error.message}`,
          mode: 'simulation' as const,
          duration: Date.now() - start,
        };
      }
    });
  }

  // ─── Docker Health Check ────────────────────────────────────────

  /**
   * Check if Docker daemon is available.
   */
  async checkDockerHealth(): Promise<boolean> {
    const docker = await this.getDocker();
    if (!docker) return false;

    try {
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Utility ────────────────────────────────────────────────────

  /**
   * Get the list of supported actions.
   */
  getSupportedActions(): string[] {
    return [
      'listContainers', 'getContainer', 'startContainer', 'stopContainer',
      'restartContainer', 'getContainerLogs', 'getContainerStats',
      'listImages', 'pullImage',
      'listProcesses', 'getProcess', 'killProcess',
      'getSystemInfo', 'getNetworkInterfaces', 'getDiskUsage',
      'deployContainer', 'scaleService',
    ];
  }

  /**
   * Execute an action by name.
   */
  async executeAction(action: string, params: Record<string, any>): Promise<InfraResult> {
    switch (action) {
      case 'listContainers':
        return this.listContainers(params.options);
      case 'getContainer':
        return this.getContainer(params.id);
      case 'startContainer':
        return this.startContainer(params.id);
      case 'stopContainer':
        return this.stopContainer(params.id);
      case 'restartContainer':
        return this.restartContainer(params.id);
      case 'getContainerLogs':
        return this.getContainerLogs(params.id, params.options);
      case 'getContainerStats':
        return this.getContainerStats(params.id);
      case 'listImages':
        return this.listImages();
      case 'pullImage':
        return this.pullImage(params.image);
      case 'listProcesses':
        return this.listProcesses();
      case 'getProcess':
        return this.getProcess(params.pid);
      case 'killProcess':
        return this.killProcess(params.pid, params.signal);
      case 'getSystemInfo':
        return this.getSystemInfo();
      case 'getNetworkInterfaces':
        return this.getNetworkInterfaces();
      case 'getDiskUsage':
        return this.getDiskUsage(params.path);
      case 'deployContainer':
        return this.deployContainer(params.config);
      case 'scaleService':
        return this.scaleService(params.name, params.replicas);
      default:
        throw new Error(`Infrastructure connector: unsupported action "${action}"`);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private async getDocker(): Promise<any> {
    if (this.dockerInitialized) {
      return this.dockerAvailable ? this.docker : null;
    }

    this.dockerInitialized = true;

    if (!this.enabled) {
      this.dockerAvailable = false;
      return null;
    }

    try {
      const Dockerode = (await import('dockerode')).default;
      const socketPath = this.configService.get<string>('DOCKER_SOCKET') ?? '/var/run/docker.sock';

      this.docker = new Dockerode({ socketPath });
      await this.docker.ping();
      this.dockerAvailable = true;

      this.logger.log('Docker daemon connection established');
      return this.docker;
    } catch (error: any) {
      this.logger.warn(`Docker daemon not available: ${error.message}`);
      this.docker = null;
      this.dockerAvailable = false;
      return null;
    }
  }

  private simulationResult(action: string, data: any): InfraResult {
    return {
      success: true,
      data: { ...data, message: `${action} (simulation — Docker not available)` },
      mode: 'simulation' as const,
      duration: 0,
    };
  }

  private async executeWithBreaker<T>(
    action: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (this.circuitBreaker) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:infrastructure`;
      return this.circuitBreaker.execute(circuitKey, fn, async () => {
        return {
          success: false,
          error: 'Circuit breaker is OPEN for infrastructure connector',
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
      this.eventBus.emit(AgentEventType.TOOL_EXECUTED, 'infrastructure', {
        action,
        success,
        duration: durationMs,
      });
    }

    if (this.metrics) {
      this.metrics.recordPipelineStep(`infrastructure.${action}`, durationMs, success);
    }
  }
}
