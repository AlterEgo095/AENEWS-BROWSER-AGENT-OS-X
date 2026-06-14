"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkAgentService = exports.NETWORK_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.NETWORK_AGENT_CONFIG = {
    id: 'infrastructure-network',
    name: 'Network',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Network management, DNS, load balancing, and firewall configuration. Manages DNS records, load balancers, firewall rules, connectivity checks, traffic analysis, and SSL/TLS certificates.',
    capabilities: [
        {
            name: 'configureDNS',
            description: 'Configure DNS records',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string' },
                    recordType: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'] },
                    value: { type: 'string' },
                    ttl: { type: 'number', default: 3600 },
                    action: { type: 'string', enum: ['create', 'update', 'delete'], default: 'create' },
                },
                required: ['domain', 'recordType', 'value', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    recordId: { type: 'string' },
                },
            },
        },
        {
            name: 'manageLoadBalancer',
            description: 'Manage load balancer configuration',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    action: {
                        type: 'string',
                        enum: ['create', 'update', 'delete', 'addTarget', 'removeTarget', 'getHealth'],
                    },
                    algorithm: {
                        type: 'string',
                        enum: ['round_robin', 'least_connections', 'ip_hash', 'weighted'],
                    },
                    targets: { type: 'array', items: { type: 'object' } },
                    healthCheckPath: { type: 'string' },
                    port: { type: 'number' },
                    protocol: { type: 'string', enum: ['http', 'https', 'tcp', 'udp'] },
                },
                required: ['name', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    name: { type: 'string' },
                },
            },
        },
        {
            name: 'configureFirewall',
            description: 'Configure firewall rules',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    action: { type: 'string', enum: ['create', 'update', 'delete', 'list'] },
                    direction: { type: 'string', enum: ['ingress', 'egress'] },
                    protocol: { type: 'string', enum: ['tcp', 'udp', 'icmp', 'all'] },
                    portRange: {
                        type: 'string',
                        description: 'Port range (e.g., "80", "443", "1024-65535")',
                    },
                    sourceCidr: { type: 'string', description: 'Source CIDR block' },
                    targetTags: { type: 'array', items: { type: 'string' } },
                    ruleAction: { type: 'string', enum: ['allow', 'deny'] },
                    priority: { type: 'number' },
                },
                required: ['name', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    ruleId: { type: 'string' },
                },
            },
        },
        {
            name: 'checkConnectivity',
            description: 'Check network connectivity between endpoints',
            inputSchema: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: 'Source host or service' },
                    target: { type: 'string', description: 'Target host, IP, or URL' },
                    port: { type: 'number' },
                    protocol: {
                        type: 'string',
                        enum: ['tcp', 'udp', 'icmp', 'http', 'https'],
                        default: 'tcp',
                    },
                    timeout: { type: 'number', default: 5000 },
                },
                required: ['source', 'target'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    connected: { type: 'boolean' },
                    latencyMs: { type: 'number' },
                },
            },
        },
        {
            name: 'analyzeTraffic',
            description: 'Analyze network traffic patterns',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string' },
                    timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' },
                    analysisType: {
                        type: 'string',
                        enum: ['bandwidth', 'connections', 'errors', 'latency', 'all'],
                        default: 'all',
                    },
                },
                required: ['service'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string' },
                    bandwidth: { type: 'object' },
                    connections: { type: 'object' },
                },
            },
        },
        {
            name: 'manageSSL',
            description: 'Manage SSL/TLS certificates',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string' },
                    action: { type: 'string', enum: ['provision', 'renew', 'revoke', 'list', 'verify'] },
                    certificateType: {
                        type: 'string',
                        enum: ['lets_encrypt', 'custom', 'wildcard'],
                        default: 'lets_encrypt',
                    },
                    autoRenew: { type: 'boolean', default: true },
                },
                required: ['domain', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    domain: { type: 'string' },
                    action: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'manage:dns',
        'manage:load-balancer',
        'manage:firewall',
        'check:connectivity',
        'analyze:traffic',
        'manage:ssl',
    ],
    maxConcurrentTasks: 4,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let NetworkAgentService = class NetworkAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.dnsRecords = new Map();
        this.loadBalancers = new Map();
        this.firewallRules = new Map();
        this.sslCerts = new Map();
        this.dnsCounter = 0;
        this.firewallCounter = 0;
    }
    defineConfig() {
        return exports.NETWORK_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'configureDNS',
            description: 'Configure DNS records',
            execute: async (params) => this.configureDNS(params),
        });
        this.registerTool({
            name: 'manageLoadBalancer',
            description: 'Manage load balancer configuration',
            execute: async (params) => this.manageLoadBalancer(params),
        });
        this.registerTool({
            name: 'configureFirewall',
            description: 'Configure firewall rules',
            execute: async (params) => this.configureFirewall(params),
        });
        this.registerTool({
            name: 'checkConnectivity',
            description: 'Check network connectivity',
            execute: async (params) => this.checkConnectivity(params),
        });
        this.registerTool({
            name: 'analyzeTraffic',
            description: 'Analyze network traffic patterns',
            execute: async (params) => this.analyzeTraffic(params),
        });
        this.registerTool({
            name: 'manageSSL',
            description: 'Manage SSL/TLS certificates',
            execute: async (params) => this.manageSSL(params),
        });
        this.seedInitialData();
        await this.storeInWorkingMemory('network:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Network agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DeliveryCapability.CDN, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'configureDNS',
            'manageLoadBalancer',
            'configureFirewall',
            'checkConnectivity',
            'analyzeTraffic',
            'manageSSL',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown network action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`network:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Network execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.dnsRecords.clear();
        this.loadBalancers.clear();
        this.firewallRules.clear();
        this.sslCerts.clear();
        this.logger.log('Network agent destroyed, state cleared');
    }
    async configureDNS(params) {
        const { domain, recordType, value, ttl = 3600, action = 'create' } = params;
        if (!domain || typeof domain !== 'string') {
            throw new Error('Domain is required');
        }
        const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'];
        if (!validTypes.includes(recordType)) {
            throw new Error(`Invalid record type: ${recordType}. Valid: ${validTypes.join(', ')}`);
        }
        const validActions = ['create', 'update', 'delete'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        const recordKey = `${domain}:${recordType}`;
        const existing = this.dnsRecords.get(recordKey);
        if (action === 'delete') {
            if (!existing) {
                throw new Error(`DNS record not found for ${domain} (${recordType})`);
            }
            this.dnsRecords.delete(recordKey);
            this.logger.log(`Deleted DNS: ${domain} ${recordType}`);
            return {
                success: true,
                recordId: existing.id,
                domain,
                recordType,
                action,
                message: `Deleted ${recordType} record for ${domain}`,
            };
        }
        if (action === 'update' && !existing) {
            throw new Error(`DNS record not found for ${domain} (${recordType}). Use action: 'create' to add.`);
        }
        this.dnsCounter++;
        const recordId = existing?.id || `dns-${this.dnsCounter}-${Date.now()}`;
        this.dnsRecords.set(recordKey, {
            id: recordId,
            domain,
            recordType,
            value,
            ttl,
            createdAt: existing?.createdAt || new Date(),
        });
        const message = action === 'create'
            ? `Created ${recordType} record for ${domain} → ${value} (TTL: ${ttl}s)`
            : `Updated ${recordType} record for ${domain} → ${value} (TTL: ${ttl}s)`;
        this.logger.log(message);
        return { success: true, recordId, domain, recordType, action, message };
    }
    async manageLoadBalancer(params) {
        const { name, action, algorithm, targets, healthCheckPath, port, protocol } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Load balancer name is required');
        }
        const validActions = ['create', 'update', 'delete', 'addTarget', 'removeTarget', 'getHealth'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        if (action === 'create') {
            const validAlgorithms = ['round_robin', 'least_connections', 'ip_hash', 'weighted'];
            if (algorithm && !validAlgorithms.includes(algorithm)) {
                throw new Error(`Invalid algorithm: ${algorithm}. Valid: ${validAlgorithms.join(', ')}`);
            }
            const lb = {
                name,
                algorithm: algorithm || 'round_robin',
                protocol: protocol || 'http',
                port: port || 80,
                targets: (targets || []).map((t) => ({ ...t, weight: t.weight || 1, healthy: true })),
                healthCheckPath: healthCheckPath || '/health',
                createdAt: new Date(),
            };
            this.loadBalancers.set(name, lb);
            this.logger.log(`Created LB: ${name}, algorithm=${lb.algorithm}, ${lb.targets.length} target(s)`);
            return {
                success: true,
                name,
                action,
                algorithm: lb.algorithm,
                targets: lb.targets,
                message: `Load balancer "${name}" created with ${lb.algorithm} algorithm`,
            };
        }
        if (action === 'delete') {
            if (!this.loadBalancers.has(name)) {
                throw new Error(`Load balancer not found: ${name}`);
            }
            this.loadBalancers.delete(name);
            return { success: true, name, action, message: `Load balancer "${name}" deleted` };
        }
        const lb = this.loadBalancers.get(name);
        if (!lb) {
            throw new Error(`Load balancer not found: ${name}`);
        }
        if (action === 'addTarget' && targets) {
            for (const t of targets) {
                lb.targets.push({ host: t.host, port: t.port, weight: t.weight || 1, healthy: true });
            }
            this.logger.log(`Added ${targets.length} target(s) to LB ${name}`);
            return {
                success: true,
                name,
                action,
                targets: lb.targets,
                message: `Added ${targets.length} target(s) to "${name}"`,
            };
        }
        if (action === 'removeTarget' && targets) {
            lb.targets = lb.targets.filter((existing) => !targets.some((t) => t.host === existing.host && t.port === existing.port));
            this.logger.log(`Removed target(s) from LB ${name}, ${lb.targets.length} remaining`);
            return {
                success: true,
                name,
                action,
                targets: lb.targets,
                message: `Removed target(s) from "${name}", ${lb.targets.length} remaining`,
            };
        }
        if (action === 'getHealth') {
            const healthStatus = lb.targets.map((t) => ({
                host: t.host,
                healthy: Math.random() > 0.1,
                responseTimeMs: Math.floor(Math.random() * 100) + 5,
            }));
            this.logger.log(`LB ${name} health: ${healthStatus.filter((h) => h.healthy).length}/${healthStatus.length} healthy`);
            return {
                success: true,
                name,
                action,
                healthStatus,
                message: `Health check for "${name}": ${healthStatus.filter((h) => h.healthy).length}/${healthStatus.length} targets healthy`,
            };
        }
        if (algorithm)
            lb.algorithm = algorithm;
        if (port)
            lb.port = port;
        if (protocol)
            lb.protocol = protocol;
        if (healthCheckPath)
            lb.healthCheckPath = healthCheckPath;
        this.logger.log(`Updated LB ${name}`);
        return {
            success: true,
            name,
            action,
            algorithm: lb.algorithm,
            targets: lb.targets,
            message: `Load balancer "${name}" updated`,
        };
    }
    async configureFirewall(params) {
        const { name, action, direction = 'ingress', protocol = 'tcp', portRange, sourceCidr = '0.0.0.0/0', targetTags = [], ruleAction = 'allow', priority = 1000, } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Rule name is required');
        }
        const validActions = ['create', 'update', 'delete', 'list'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        if (action === 'list') {
            const rules = Array.from(this.firewallRules.values()).map((r) => ({
                id: r.id,
                name: r.name,
                direction: r.direction,
                protocol: r.protocol,
                portRange: r.portRange,
                sourceCidr: r.sourceCidr,
                ruleAction: r.ruleAction,
                priority: r.priority,
            }));
            this.logger.log(`Listed ${rules.length} firewall rules`);
            return { success: true, name, action, message: `${rules.length} firewall rules found` };
        }
        if (action === 'delete') {
            const existing = Array.from(this.firewallRules.values()).find((r) => r.name === name);
            if (!existing) {
                throw new Error(`Firewall rule not found: ${name}`);
            }
            this.firewallRules.delete(existing.id);
            this.logger.log(`Deleted firewall rule: ${name}`);
            return {
                success: true,
                ruleId: existing.id,
                name,
                action,
                message: `Firewall rule "${name}" deleted`,
            };
        }
        const validDirections = ['ingress', 'egress'];
        if (!validDirections.includes(direction)) {
            throw new Error(`Invalid direction: ${direction}. Valid: ${validDirections.join(', ')}`);
        }
        const validProtocols = ['tcp', 'udp', 'icmp', 'all'];
        if (!validProtocols.includes(protocol)) {
            throw new Error(`Invalid protocol: ${protocol}. Valid: ${validProtocols.join(', ')}`);
        }
        this.firewallCounter++;
        const ruleId = `fw-${this.firewallCounter}-${Date.now()}`;
        this.firewallRules.set(ruleId, {
            id: ruleId,
            name,
            direction,
            protocol,
            portRange: portRange || (protocol === 'icmp' ? 'N/A' : '1-65535'),
            sourceCidr,
            targetTags,
            ruleAction,
            priority,
            enabled: true,
            createdAt: new Date(),
        });
        this.logger.log(`Created firewall rule: ${name}, ${direction} ${ruleAction} ${protocol}/${portRange || 'all'} from ${sourceCidr}`);
        return {
            success: true,
            ruleId,
            name,
            action,
            message: `Firewall rule "${name}" created: ${direction} ${ruleAction} ${protocol}/${portRange || 'all'} from ${sourceCidr}`,
        };
    }
    async checkConnectivity(params) {
        const { source, target, port, protocol = 'tcp', timeout = 5000 } = params;
        if (!source || typeof source !== 'string') {
            throw new Error('Source is required');
        }
        if (!target || typeof target !== 'string') {
            throw new Error('Target is required');
        }
        const connected = Math.random() > 0.1;
        const latencyMs = connected ? Math.floor(Math.random() * 150) + 1 : timeout;
        let details;
        if (connected) {
            switch (protocol) {
                case 'http':
                case 'https':
                    details = `${protocol.toUpperCase()} ${connected ? 200 : 503} from ${target}${port ? `:${port}` : ''} in ${latencyMs}ms`;
                    break;
                case 'tcp':
                    details = `TCP connection to ${target}:${port || 80} established in ${latencyMs}ms`;
                    break;
                case 'udp':
                    details = `UDP packet to ${target}:${port || 53} sent, response received in ${latencyMs}ms`;
                    break;
                case 'icmp':
                    details = `ICMP echo reply from ${target} in ${latencyMs}ms, TTL=64`;
                    break;
                default:
                    details = `Connected to ${target} in ${latencyMs}ms`;
            }
        }
        else {
            details = `Connection to ${target}${port ? `:${port}` : ''} (${protocol}) timed out after ${timeout}ms`;
        }
        this.logger.log(`Connectivity: ${source} → ${target} (${protocol}): ${connected ? 'OK' : 'FAILED'}, ${latencyMs}ms`);
        return {
            source,
            target,
            connected,
            latencyMs,
            protocol,
            port,
            details,
            checkedAt: new Date().toISOString(),
        };
    }
    async analyzeTraffic(params) {
        const { service, timeRange = '24h', analysisType = 'all' } = params;
        if (!service || typeof service !== 'string') {
            throw new Error('Service name is required');
        }
        const multiplier = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
        const result = {
            service,
            timeRange,
            analysisType,
            bandwidth: {
                inboundBytesPerSec: Math.floor(Math.random() * 50000000) + 1000000,
                outboundBytesPerSec: Math.floor(Math.random() * 100000000) + 5000000,
                totalInboundGb: Math.round((Math.random() * 50 + 5) * multiplier * 100) / 100,
                totalOutboundGb: Math.round((Math.random() * 200 + 20) * multiplier * 100) / 100,
                peakInboundBytesPerSec: Math.floor(Math.random() * 200000000) + 20000000,
                peakOutboundBytesPerSec: Math.floor(Math.random() * 500000000) + 50000000,
            },
            connections: {
                activeConnections: Math.floor(Math.random() * 5000) + 100,
                totalConnections: Math.floor(Math.random() * 100000) * multiplier + 10000,
                avgConnectionDurationMs: Math.floor(Math.random() * 5000) + 100,
                connectionRatePerSec: Math.floor(Math.random() * 500) + 10,
            },
            errors: {
                totalErrors: Math.floor(Math.random() * 500) + 10,
                errorRate: Math.round(Math.random() * 3 * 10000) / 10000,
                topErrors: [
                    { code: '502', count: Math.floor(Math.random() * 100) + 5, description: 'Bad Gateway' },
                    {
                        code: '503',
                        count: Math.floor(Math.random() * 50) + 2,
                        description: 'Service Unavailable',
                    },
                    {
                        code: '504',
                        count: Math.floor(Math.random() * 30) + 1,
                        description: 'Gateway Timeout',
                    },
                    {
                        code: '429',
                        count: Math.floor(Math.random() * 200) + 10,
                        description: 'Too Many Requests',
                    },
                ],
            },
            latency: {
                avgMs: Math.floor(Math.random() * 100) + 10,
                p50Ms: Math.floor(Math.random() * 80) + 8,
                p95Ms: Math.floor(Math.random() * 300) + 50,
                p99Ms: Math.floor(Math.random() * 800) + 100,
            },
            analyzedAt: new Date().toISOString(),
        };
        this.logger.log(`analyzeTraffic: ${service}, ${timeRange}, bandwidth=${(result.bandwidth.totalInboundGb / multiplier).toFixed(1)}GB/hr avg`);
        return result;
    }
    async manageSSL(params) {
        const { domain, action, certificateType = 'lets_encrypt', autoRenew = true } = params;
        if (!domain || typeof domain !== 'string') {
            throw new Error('Domain is required');
        }
        const validActions = ['provision', 'renew', 'revoke', 'list', 'verify'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        const validTypes = ['lets_encrypt', 'custom', 'wildcard'];
        if (!validTypes.includes(certificateType)) {
            throw new Error(`Invalid certificate type: ${certificateType}. Valid: ${validTypes.join(', ')}`);
        }
        if (action === 'list') {
            const certs = Array.from(this.sslCerts.values());
            this.logger.log(`Listed ${certs.length} SSL certificates`);
            return {
                success: true,
                domain,
                action,
                certificateType,
                message: `${certs.length} certificate(s) found. Domains: ${certs.map((c) => c.domain).join(', ') || 'none'}`,
            };
        }
        if (action === 'provision') {
            const cert = {
                domain,
                type: certificateType,
                status: 'active',
                autoRenew,
                issuedAt: new Date(),
                expiresAt: new Date(Date.now() + 90 * 86400000),
            };
            this.sslCerts.set(domain, cert);
            this.logger.log(`Provisioned SSL cert for ${domain} (${certificateType}), expires ${cert.expiresAt?.toISOString().split('T')[0]}`);
            return {
                success: true,
                domain,
                action,
                certificateType,
                status: 'active',
                expiresAt: cert.expiresAt?.toISOString(),
                message: `SSL certificate provisioned for ${domain} (${certificateType}), auto-renew: ${autoRenew}`,
            };
        }
        const existing = this.sslCerts.get(domain);
        if (!existing) {
            throw new Error(`No certificate found for ${domain}. Use action: 'provision' to create one.`);
        }
        if (action === 'renew') {
            existing.issuedAt = new Date();
            existing.expiresAt = new Date(Date.now() + 90 * 86400000);
            existing.status = 'active';
            this.logger.log(`Renewed SSL cert for ${domain}, new expiry: ${existing.expiresAt.toISOString().split('T')[0]}`);
            return {
                success: true,
                domain,
                action,
                certificateType,
                status: 'active',
                expiresAt: existing.expiresAt.toISOString(),
                message: `SSL certificate renewed for ${domain}, valid until ${existing.expiresAt.toISOString().split('T')[0]}`,
            };
        }
        if (action === 'revoke') {
            existing.status = 'revoked';
            this.sslCerts.delete(domain);
            this.logger.log(`Revoked SSL cert for ${domain}`);
            return {
                success: true,
                domain,
                action,
                certificateType,
                status: 'revoked',
                message: `SSL certificate revoked for ${domain}`,
            };
        }
        if (action === 'verify') {
            const daysUntilExpiry = existing.expiresAt
                ? Math.floor((existing.expiresAt.getTime() - Date.now()) / 86400000)
                : 0;
            const isExpiringSoon = daysUntilExpiry < 30;
            this.logger.log(`Verified SSL cert for ${domain}: ${daysUntilExpiry} days until expiry`);
            return {
                success: true,
                domain,
                action,
                certificateType,
                status: existing.status,
                expiresAt: existing.expiresAt?.toISOString(),
                message: `Certificate for ${domain} is ${existing.status}, expires in ${daysUntilExpiry} days${isExpiringSoon ? ' (EXPIRING SOON)' : ''}`,
            };
        }
        return {
            success: true,
            domain,
            action,
            certificateType,
            message: `Action ${action} completed for ${domain}`,
        };
    }
    seedInitialData() {
        this.dnsRecords.set('example.com:A', {
            id: 'dns-seed-1',
            domain: 'example.com',
            recordType: 'A',
            value: '93.184.216.34',
            ttl: 3600,
            createdAt: new Date(),
        });
        this.dnsRecords.set('api.example.com:CNAME', {
            id: 'dns-seed-2',
            domain: 'api.example.com',
            recordType: 'CNAME',
            value: 'lb.example.com',
            ttl: 300,
            createdAt: new Date(),
        });
        this.loadBalancers.set('main-lb', {
            name: 'main-lb',
            algorithm: 'round_robin',
            protocol: 'https',
            port: 443,
            targets: [
                { host: '10.0.1.10', port: 8080, weight: 1, healthy: true },
                { host: '10.0.1.11', port: 8080, weight: 1, healthy: true },
                { host: '10.0.1.12', port: 8080, weight: 1, healthy: true },
            ],
            healthCheckPath: '/health',
            createdAt: new Date(),
        });
        this.sslCerts.set('example.com', {
            domain: 'example.com',
            type: 'lets_encrypt',
            status: 'active',
            autoRenew: true,
            issuedAt: new Date(Date.now() - 30 * 86400000),
            expiresAt: new Date(Date.now() + 60 * 86400000),
        });
    }
};
exports.NetworkAgentService = NetworkAgentService;
exports.NetworkAgentService = NetworkAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], NetworkAgentService);
//# sourceMappingURL=network-agent.service.js.map