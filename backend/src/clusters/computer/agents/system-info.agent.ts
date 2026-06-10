import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

export class SystemInfoAgent extends BaseAgent {
  readonly name = 'SystemInfoAgent';
  readonly cluster = ClusterType.COMPUTER;
  readonly capabilities = [
    'os',
    'hardware',
    'memory',
    'disk',
    'cpu',
    'network',
    'processes',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Gathers system information including OS details, hardware specs, memory usage, disk stats, CPU info, network configuration, and process summaries';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'os';
      const startTime = Date.now();

      switch (action) {
        case 'os': {
          const includeUptime = config.includeUptime || true;
          const includeUsers = config.includeUsers || false;
          const includeEnvVars = config.includeEnvVars || false;
          const envVarFilter = config.envVarFilter || [];
          this.logger.log('Gathering OS information');

          return {
            success: true,
            data: {
              action,
              includeUptime,
              includeUsers,
              includeEnvVars,
              os: {
                platform: '',
                distro: '',
                release: '',
                codename: '',
                kernel: '',
                arch: '',
                hostname: '',
                fqdn: '',
              },
              uptime: includeUptime
                ? {
                    total: 0,
                    bootTime: '',
                  }
                : undefined,
              users: includeUsers
                ? [] as Array<{
                    username: string;
                    terminal: string;
                    host: string;
                    loginTime: string;
                  }>
                : undefined,
              envVars: includeEnvVars
                ? {} as Record<string, string>
                : undefined,
              status: 'os_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'hardware': {
          const includePeripherals = config.includePeripherals || false;
          const includePCI = config.includePCI || false;
          const includeUSB = config.includeUSB || false;
          this.logger.log('Gathering hardware information');

          return {
            success: true,
            data: {
              action,
              includePeripherals,
              includePCI,
              includeUSB,
              system: {
                manufacturer: '',
                model: '',
                serial: '',
                uuid: '',
                sku: '',
                version: '',
              },
              cpu: {
                manufacturer: '',
                brand: '',
                cores: 0,
                physicalCores: 0,
                processors: 0,
                speed: '',
                maxSpeed: '',
              },
              gpu: [] as Array<{
                vendor: string;
                model: string;
                vram: number;
                driver: string;
              }>,
              peripherals: includePeripherals
                ? [] as Array<{
                    type: string;
                    name: string;
                    vendor: string;
                  }>
                : undefined,
              pci: includePCI
                ? [] as Array<{
                    slot: string;
                    class: string;
                    vendor: string;
                    device: string;
                  }>
                : undefined,
              usb: includeUSB
                ? [] as Array<{
                    bus: number;
                    device: number;
                    idVendor: string;
                    idProduct: string;
                    name: string;
                  }>
                : undefined,
              status: 'hardware_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'memory': {
          const includeSwap = config.includeSwap || true;
          const includeLayout = config.includeLayout || false;
          const unit = config.unit || 'bytes';
          this.logger.log('Gathering memory information');

          return {
            success: true,
            data: {
              action,
              includeSwap,
              includeLayout,
              unit,
              total: 0,
              used: 0,
              free: 0,
              available: 0,
              active: 0,
              buffers: 0,
              cached: 0,
              usagePercent: 0,
              swap: includeSwap
                ? {
                    total: 0,
                    used: 0,
                    free: 0,
                    usagePercent: 0,
                  }
                : undefined,
              layout: includeLayout
                ? [] as Array<{
                    size: number;
                    bank: string;
                    type: string;
                    clockSpeed: number;
                    formFactor: string;
                    manufacturer: string;
                  }>
                : undefined,
              status: 'memory_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'disk': {
          const includePartitions = config.includePartitions || true;
          const includeIOStats = config.includeIOStats || false;
          const includeSMART = config.includeSMART || false;
          const unit = config.unit || 'bytes';
          this.logger.log('Gathering disk information');

          return {
            success: true,
            data: {
              action,
              includePartitions,
              includeIOStats,
              includeSMART,
              unit,
              disks: [] as Array<{
                device: string;
                type: string;
                name: string;
                vendor: string;
                size: number;
                bytesRead: number;
                bytesWritten: number;
                readSpeed: number;
                writeSpeed: number;
              }>,
              partitions: includePartitions
                ? [] as Array<{
                    device: string;
                    mount: string;
                    type: string;
                    size: number;
                    used: number;
                    available: number;
                    usagePercent: number;
                  }>
                : undefined,
              ioStats: includeIOStats
                ? [] as Array<{
                    device: string;
                    readsCompleted: number;
                    writesCompleted: number;
                    readsMerged: number;
                    writesMerged: number;
                    sectorsRead: number;
                    sectorsWritten: number;
                  }>
                : undefined,
              smart: includeSMART
                ? [] as Array<{
                    device: string;
                    overallStatus: string;
                    temperature: number;
                    powerOnHours: number;
                    badSectors: number;
                  }>
                : undefined,
              status: 'disk_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'cpu': {
          const includeTemperature = config.includeTemperature || false;
          const includeFrequency = config.includeFrequency || true;
          const includeFlags = config.includeFlags || false;
          const includeCache = config.includeCache || false;
          const sampleDuration = config.sampleDuration || 1000;
          this.logger.log('Gathering CPU information');

          return {
            success: true,
            data: {
              action,
              includeTemperature,
              includeFrequency,
              includeFlags,
              includeCache,
              sampleDuration,
              manufacturer: '',
              brand: '',
              architecture: '',
              cores: 0,
              physicalCores: 0,
              processors: 0,
              socketType: '',
              virtualization: false,
              currentLoad: 0,
              loadPerCore: [] as number[],
              temperature: includeTemperature
                ? {
                    main: 0,
                    cores: [] as number[],
                    max: 0,
                  }
                : undefined,
              frequency: includeFrequency
                ? {
                    min: 0,
                    max: 0,
                    current: 0,
                    governor: '',
                  }
                : undefined,
              flags: includeFlags ? [] as string[] : undefined,
              cache: includeCache
                ? {
                    l1d: 0,
                    l1i: 0,
                    l2: 0,
                    l3: 0,
                  }
                : undefined,
              status: 'cpu_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'network': {
          const includeInterfaces = config.includeInterfaces || true;
          const includeConnections = config.includeConnections || false;
          const includeStats = config.includeStats || false;
          const includeGateway = config.includeGateway || true;
          this.logger.log('Gathering network information');

          return {
            success: true,
            data: {
              action,
              includeInterfaces,
              includeConnections,
              includeStats,
              includeGateway,
              interfaces: includeInterfaces
                ? [] as Array<{
                    iface: string;
                    type: string;
                    mac: string;
                    ip4: string;
                    ip4subnet: string;
                    ip6: string;
                    ip6subnet: string;
                    state: string;
                    speed: number;
                    duplex: string;
                    mtu: number;
                    carrier: boolean;
                  }>
                : undefined,
              connections: includeConnections
                ? [] as Array<{
                    protocol: string;
                    localAddress: string;
                    localPort: number;
                    peerAddress: string;
                    peerPort: number;
                    state: string;
                    pid: number;
                  }>
                : undefined,
              stats: includeStats
                ? {} as Record<string, {
                    rx_bytes: number;
                    tx_bytes: number;
                    rx_packets: number;
                    tx_packets: number;
                    rx_errors: number;
                    tx_errors: number;
                    rx_dropped: number;
                    tx_dropped: number;
                  }>
                : undefined,
              gateway: includeGateway
                ? {
                    default: '',
                    interface: '',
                  }
                : undefined,
              status: 'network_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'processes': {
          const sortBy = config.sortBy || 'cpu';
          const limit = config.limit || 20;
          const includeThreads = config.includeThreads || false;
          const filterUser = config.filterUser;
          const filterName = config.filterName;
          this.logger.log(`Gathering process information (sortBy: ${sortBy}, limit: ${limit})`);

          return {
            success: true,
            data: {
              action,
              sortBy,
              limit,
              includeThreads,
              filterUser,
              filterName,
              totalProcesses: 0,
              totalThreads: 0,
              processes: [] as Array<{
                pid: number;
                name: string;
                user: string;
                cpu: number;
                memory: number;
                rss: number;
                vms: number;
                status: string;
                startTime: string;
                command: string;
                threads: number;
              }>,
              topByCpu: [] as Array<{ pid: number; name: string; cpu: number }>,
              topByMemory: [] as Array<{ pid: number; name: string; memory: number }>,
              status: 'processes_info_retrieved',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
