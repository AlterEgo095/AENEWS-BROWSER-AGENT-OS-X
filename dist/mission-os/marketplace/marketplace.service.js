"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MarketplaceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
const common_1 = require("@nestjs/common");
const CURRENT_OS_VERSION = '1.0.0';
const BUILT_IN_CLUSTERS = [
    {
        cluster: 'browser',
        name: 'Browser Cluster',
        description: 'Web browsing, navigation, scraping, and automation capabilities. ' +
            'Agents can navigate the web, extract content, fill forms, and interact with web applications.',
        capabilities: [
            {
                name: 'web.navigation',
                description: 'Navigate to URLs and follow links',
                inputSchema: { url: 'string' },
                outputSchema: { page: 'object' },
            },
            {
                name: 'web.scraping',
                description: 'Extract structured data from web pages',
                inputSchema: { selector: 'string' },
                outputSchema: { data: 'object' },
            },
            {
                name: 'web.automation',
                description: 'Automate browser interactions and form submissions',
                inputSchema: { actions: 'array' },
                outputSchema: { result: 'object' },
            },
        ],
        size: '24.5 MB',
        tags: ['web', 'browser', 'scraping', 'automation'],
    },
    {
        cluster: 'office',
        name: 'Office Cluster',
        description: 'Document creation, editing, and management. Supports Word, Excel, ' +
            'PowerPoint, and PDF operations for comprehensive office automation.',
        capabilities: [
            {
                name: 'doc.create',
                description: 'Create new documents in various formats',
                inputSchema: { format: 'string', template: 'string' },
                outputSchema: { document: 'object' },
            },
            {
                name: 'doc.edit',
                description: 'Edit existing documents with tracked changes',
                inputSchema: { documentId: 'string', changes: 'array' },
                outputSchema: { document: 'object' },
            },
            {
                name: 'doc.convert',
                description: 'Convert between document formats',
                inputSchema: { source: 'string', targetFormat: 'string' },
                outputSchema: { converted: 'object' },
            },
            {
                name: 'spreadsheet.analyze',
                description: 'Analyze and process spreadsheet data',
                inputSchema: { range: 'string', operation: 'string' },
                outputSchema: { result: 'object' },
            },
        ],
        size: '18.2 MB',
        tags: ['office', 'documents', 'spreadsheets', 'pdf'],
    },
    {
        cluster: 'marketing',
        name: 'Marketing Cluster',
        description: 'SEO analysis, content strategy, social media management, and campaign ' +
            'automation. Enables data-driven marketing operations.',
        capabilities: [
            {
                name: 'seo.analyze',
                description: 'Analyze SEO metrics and provide recommendations',
                inputSchema: { url: 'string' },
                outputSchema: { report: 'object' },
            },
            {
                name: 'content.strategy',
                description: 'Generate content strategy and calendars',
                inputSchema: { audience: 'string', goals: 'array' },
                outputSchema: { strategy: 'object' },
            },
            {
                name: 'social.manage',
                description: 'Manage social media posts and engagement',
                inputSchema: { platform: 'string', content: 'object' },
                outputSchema: { result: 'object' },
            },
        ],
        size: '12.8 MB',
        tags: ['marketing', 'seo', 'social-media', 'content'],
    },
    {
        cluster: 'finance',
        name: 'Finance Cluster',
        description: 'Financial analysis, reporting, risk assessment, and portfolio management. ' +
            'Provides quantitative tools for financial decision-making.',
        capabilities: [
            {
                name: 'finance.analyze',
                description: 'Perform financial analysis on datasets',
                inputSchema: { data: 'object', metrics: 'array' },
                outputSchema: { analysis: 'object' },
            },
            {
                name: 'finance.report',
                description: 'Generate financial reports and summaries',
                inputSchema: { period: 'string', type: 'string' },
                outputSchema: { report: 'object' },
            },
            {
                name: 'finance.risk',
                description: 'Assess financial risk and exposure',
                inputSchema: { portfolio: 'object' },
                outputSchema: { riskAssessment: 'object' },
            },
        ],
        size: '15.6 MB',
        tags: ['finance', 'accounting', 'risk', 'reporting'],
    },
    {
        cluster: 'medical',
        name: 'Medical Cluster',
        description: 'Clinical decision support, medical record analysis, diagnostic assistance, ' +
            'and healthcare workflow automation with HIPAA-aware data handling.',
        capabilities: [
            {
                name: 'clinical.decision-support',
                description: 'Provide clinical decision support based on patient data',
                inputSchema: { patientData: 'object' },
                outputSchema: { recommendations: 'array' },
            },
            {
                name: 'medical.record-analysis',
                description: 'Analyze medical records and extract key findings',
                inputSchema: { records: 'array' },
                outputSchema: { findings: 'array' },
            },
            {
                name: 'diagnostic.assist',
                description: 'Assist with differential diagnosis',
                inputSchema: { symptoms: 'array', history: 'object' },
                outputSchema: { differentials: 'array' },
            },
        ],
        size: '21.3 MB',
        tags: ['medical', 'healthcare', 'clinical', 'diagnostics'],
    },
    {
        cluster: 'legal',
        name: 'Legal Cluster',
        description: 'Legal document analysis, contract review, compliance checking, and ' +
            'regulatory research. Streamlines legal operations with AI assistance.',
        capabilities: [
            {
                name: 'legal.document-analysis',
                description: 'Analyze legal documents for key clauses and risks',
                inputSchema: { document: 'object' },
                outputSchema: { analysis: 'object' },
            },
            {
                name: 'legal.contract-review',
                description: 'Review contracts and flag issues',
                inputSchema: { contract: 'object' },
                outputSchema: { review: 'object' },
            },
            {
                name: 'legal.compliance',
                description: 'Check compliance with regulations and standards',
                inputSchema: { context: 'object', regulation: 'string' },
                outputSchema: { compliance: 'object' },
            },
        ],
        size: '14.7 MB',
        tags: ['legal', 'compliance', 'contracts', 'regulatory'],
    },
    {
        cluster: 'robotics',
        name: 'Robotics Cluster',
        description: 'Robot control, path planning, sensor fusion, and physical world ' +
            'interaction. Bridges AI agents with robotic systems.',
        capabilities: [
            {
                name: 'robot.control',
                description: 'Control robot movements and actions',
                inputSchema: { commands: 'array' },
                outputSchema: { status: 'object' },
            },
            {
                name: 'robot.path-planning',
                description: 'Plan optimal paths for robot navigation',
                inputSchema: { map: 'object', start: 'object', end: 'object' },
                outputSchema: { path: 'array' },
            },
            {
                name: 'robot.sensor-fusion',
                description: 'Fuse data from multiple robot sensors',
                inputSchema: { sensorData: 'object' },
                outputSchema: { fusedState: 'object' },
            },
        ],
        size: '28.9 MB',
        tags: ['robotics', 'automation', 'path-planning', 'sensors'],
    },
    {
        cluster: 'vision',
        name: 'Vision Cluster',
        description: 'Image recognition, object detection, OCR, video analysis, and visual ' +
            'understanding. Enables agents to perceive and interpret visual data.',
        capabilities: [
            {
                name: 'vision.recognize',
                description: 'Recognize objects and scenes in images',
                inputSchema: { image: 'object' },
                outputSchema: { labels: 'array' },
            },
            {
                name: 'vision.detect',
                description: 'Detect and localize objects in images',
                inputSchema: { image: 'object', target: 'string' },
                outputSchema: { detections: 'array' },
            },
            {
                name: 'vision.ocr',
                description: 'Extract text from images via OCR',
                inputSchema: { image: 'object' },
                outputSchema: { text: 'string' },
            },
            {
                name: 'vision.video-analysis',
                description: 'Analyze video content and extract key frames',
                inputSchema: { video: 'object' },
                outputSchema: { analysis: 'object' },
            },
        ],
        size: '32.1 MB',
        tags: ['vision', 'image', 'ocr', 'video', 'detection'],
    },
    {
        cluster: 'data',
        name: 'Data Cluster',
        description: 'Data pipeline orchestration, ETL operations, database management, and ' +
            'data quality monitoring. The backbone for data-driven agent workflows.',
        capabilities: [
            {
                name: 'data.etl',
                description: 'Extract, transform, and load data pipelines',
                inputSchema: { source: 'object', transform: 'object', target: 'object' },
                outputSchema: { result: 'object' },
            },
            {
                name: 'data.quality',
                description: 'Monitor and validate data quality',
                inputSchema: { dataset: 'object', rules: 'array' },
                outputSchema: { qualityReport: 'object' },
            },
            {
                name: 'data.orchestrate',
                description: 'Orchestrate multi-step data workflows',
                inputSchema: { workflow: 'object' },
                outputSchema: { execution: 'object' },
            },
        ],
        size: '19.4 MB',
        tags: ['data', 'etl', 'pipeline', 'quality'],
    },
    {
        cluster: 'security',
        name: 'Security Cluster',
        description: 'Vulnerability scanning, threat detection, incident response, and security ' +
            'auditing. Protects agent operations and infrastructure.',
        capabilities: [
            {
                name: 'security.scan',
                description: 'Scan for vulnerabilities and misconfigurations',
                inputSchema: { target: 'string', type: 'string' },
                outputSchema: { findings: 'array' },
            },
            {
                name: 'security.threat-detect',
                description: 'Detect threats and anomalies in real-time',
                inputSchema: { telemetry: 'object' },
                outputSchema: { threats: 'array' },
            },
            {
                name: 'security.incident-response',
                description: 'Automate incident response playbooks',
                inputSchema: { incident: 'object' },
                outputSchema: { actions: 'array' },
            },
        ],
        size: '16.8 MB',
        tags: ['security', 'vulnerability', 'threat', 'incident-response'],
    },
    {
        cluster: 'communication',
        name: 'Communication Cluster',
        description: 'Email, messaging, notification, and multi-channel communication. ' +
            'Enables agents to interact with humans and other systems via various channels.',
        capabilities: [
            {
                name: 'comm.email',
                description: 'Send and manage email communications',
                inputSchema: { to: 'string', subject: 'string', body: 'string' },
                outputSchema: { status: 'object' },
            },
            {
                name: 'comm.message',
                description: 'Send messages across platforms',
                inputSchema: { platform: 'string', message: 'object' },
                outputSchema: { result: 'object' },
            },
            {
                name: 'comm.notify',
                description: 'Send notifications and alerts',
                inputSchema: { channel: 'string', alert: 'object' },
                outputSchema: { delivery: 'object' },
            },
        ],
        size: '11.5 MB',
        tags: ['communication', 'email', 'messaging', 'notifications'],
    },
];
let MarketplaceService = MarketplaceService_1 = class MarketplaceService {
    constructor() {
        this.logger = new common_1.Logger(MarketplaceService_1.name);
        this.registry = {
            plugins: new Map(),
            categories: new Map(),
            tags: new Map(),
        };
        this.activeCapabilities = new Map();
        this.eventListeners = new Map();
    }
    onModuleInit() {
        this.initialize();
        this.logger.log('MarketplaceService initialised');
    }
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const idx = listeners.indexOf(listener);
                if (idx >= 0)
                    listeners.splice(idx, 1);
            }
        };
    }
    emitEvent(event, payload) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(payload);
                }
                catch (err) {
                    this.logger.warn(`Event listener error on "${event}": ${err}`);
                }
            }
        }
    }
    initialize() {
        this.logger.log('Loading built-in marketplace plugins...');
        const now = new Date();
        for (const cluster of BUILT_IN_CLUSTERS) {
            const pluginId = `builtin.${cluster.cluster}`;
            const capabilities = cluster.capabilities.map((cap) => ({
                ...cap,
                agentCount: 3,
            }));
            const plugin = {
                id: pluginId,
                name: cluster.name,
                version: '1.0.0',
                description: cluster.description,
                cluster: cluster.cluster,
                author: 'AENEWS',
                homepage: `https://agents.aenews.io/clusters/${cluster.cluster}`,
                repository: `https://github.com/aenews/agent-os-x/clusters/${cluster.cluster}`,
                capabilities,
                dependencies: [],
                installed: true,
                installedAt: now,
                enabled: true,
                config: {},
                rating: 5.0,
                downloads: 0,
                size: cluster.size,
                license: 'MIT',
                tags: cluster.tags,
                compatibility: { minVersion: '0.1.0', maxVersion: '2.0.0' },
                lastUpdated: now,
            };
            this.registry.plugins.set(pluginId, plugin);
            this.addToIndex(this.registry.categories, plugin.cluster, pluginId);
            for (const tag of plugin.tags) {
                this.addToIndex(this.registry.tags, tag, pluginId);
            }
            this.activeCapabilities.set(pluginId, new Set(capabilities.map((c) => c.name)));
        }
        this.logger.log(`Loaded ${BUILT_IN_CLUSTERS.length} built-in plugins across ${this.registry.categories.size} categories`);
    }
    registerPlugin(manifest) {
        const validationErrors = this.validateManifest(manifest);
        if (validationErrors.length > 0) {
            throw new Error(`Manifest validation failed: ${validationErrors.join('; ')}`);
        }
        const pluginData = manifest.plugin;
        const pluginId = pluginData.id;
        if (this.registry.plugins.has(pluginId)) {
            throw new Error(`Plugin with id "${pluginId}" is already registered in the marketplace`);
        }
        if (!this.isVersionCompatible(CURRENT_OS_VERSION, pluginData.compatibility.minVersion, pluginData.compatibility.maxVersion)) {
            throw new Error(`Plugin "${pluginId}" is not compatible with OS version ${CURRENT_OS_VERSION} ` +
                `(requires ${pluginData.compatibility.minVersion} - ${pluginData.compatibility.maxVersion})`);
        }
        for (const dep of pluginData.dependencies) {
            if (!this.registry.plugins.has(dep.pluginId)) {
                if (dep.required) {
                    throw new Error(`Required dependency "${dep.pluginId}" for plugin "${pluginId}" is not registered in the marketplace`);
                }
                this.logger.warn(`Optional dependency "${dep.pluginId}" for plugin "${pluginId}" is not registered`);
            }
        }
        const now = new Date();
        const plugin = {
            ...pluginData,
            installed: false,
            installedAt: null,
            enabled: false,
            rating: 0,
            downloads: 0,
        };
        this.registry.plugins.set(pluginId, plugin);
        this.addToIndex(this.registry.categories, plugin.cluster, pluginId);
        for (const tag of plugin.tags) {
            this.addToIndex(this.registry.tags, tag, pluginId);
        }
        this.emitEvent('marketplace.plugin.registered', {
            pluginId,
            plugin: { ...plugin },
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin registered: "${plugin.name}" (${pluginId}) v${plugin.version} cluster=${plugin.cluster}`);
        return { ...plugin };
    }
    unregisterPlugin(pluginId) {
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" is not registered in the marketplace`);
        }
        if (plugin.installed) {
            throw new Error(`Cannot unregister plugin "${pluginId}" — it is currently installed. ` +
                'Uninstall it first before removing from the marketplace.');
        }
        for (const [id, p] of this.registry.plugins.entries()) {
            if (id === pluginId)
                continue;
            if (!p.installed)
                continue;
            const dependsOnTarget = p.dependencies.some((dep) => dep.pluginId === pluginId && dep.required);
            if (dependsOnTarget) {
                throw new Error(`Cannot unregister plugin "${pluginId}" — installed plugin "${id}" depends on it`);
            }
        }
        this.registry.plugins.delete(pluginId);
        this.removeFromIndex(this.registry.categories, plugin.cluster, pluginId);
        for (const tag of plugin.tags) {
            this.removeFromIndex(this.registry.tags, tag, pluginId);
        }
        this.activeCapabilities.delete(pluginId);
        this.emitEvent('marketplace.plugin.unregistered', {
            pluginId,
            pluginName: plugin.name,
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin unregistered: "${plugin.name}" (${pluginId})`);
    }
    installPlugin(pluginId, config) {
        const errors = [];
        const warnings = [];
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${pluginId}" not found in marketplace`,
                errors: [`Plugin "${pluginId}" is not registered`],
                warnings: [],
            };
        }
        if (plugin.installed) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${plugin.name}" is already installed`,
                errors: [`Plugin "${pluginId}" is already installed`],
                warnings: [],
            };
        }
        if (!this.isVersionCompatible(CURRENT_OS_VERSION, plugin.compatibility.minVersion, plugin.compatibility.maxVersion)) {
            errors.push(`Plugin "${pluginId}" is not compatible with OS version ${CURRENT_OS_VERSION} ` +
                `(requires ${plugin.compatibility.minVersion} - ${plugin.compatibility.maxVersion})`);
        }
        for (const dep of plugin.dependencies) {
            const depPlugin = this.registry.plugins.get(dep.pluginId);
            if (!depPlugin) {
                if (dep.required) {
                    errors.push(`Required dependency "${dep.pluginId}" is not available in the marketplace`);
                }
                else {
                    warnings.push(`Optional dependency "${dep.pluginId}" is not available — some features may be limited`);
                }
                continue;
            }
            if (!depPlugin.installed) {
                if (dep.required) {
                    this.logger.log(`Installing required dependency "${dep.pluginId}" for "${pluginId}"...`);
                    const depResult = this.installPlugin(dep.pluginId);
                    if (!depResult.success) {
                        errors.push(`Failed to install required dependency "${dep.pluginId}": ${depResult.message}`);
                    }
                    else {
                        warnings.push(`Required dependency "${dep.pluginId}" was auto-installed`);
                    }
                }
                else {
                    warnings.push(`Optional dependency "${dep.pluginId}" is not installed — some features may be limited`);
                }
                continue;
            }
            if (!this.isVersionInRange(depPlugin.version, dep.versionRange)) {
                if (dep.required) {
                    errors.push(`Required dependency "${dep.pluginId}" version ${depPlugin.version} ` +
                        `does not satisfy required range "${dep.versionRange}"`);
                }
                else {
                    warnings.push(`Optional dependency "${dep.pluginId}" version ${depPlugin.version} ` +
                        `does not satisfy range "${dep.versionRange}"`);
                }
            }
        }
        if (errors.length > 0) {
            this.logger.warn(`Installation of "${plugin.name}" (${pluginId}) failed: ${errors.join('; ')}`);
            return {
                success: false,
                pluginId,
                message: `Installation failed due to ${errors.length} error(s)`,
                errors,
                warnings,
            };
        }
        plugin.installed = true;
        plugin.installedAt = new Date();
        plugin.enabled = false;
        plugin.downloads++;
        if (config) {
            plugin.config = { ...plugin.config, ...config };
        }
        this.emitEvent('marketplace.plugin.installed', {
            pluginId,
            pluginName: plugin.name,
            version: plugin.version,
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin installed: "${plugin.name}" (${pluginId}) v${plugin.version}`);
        return {
            success: true,
            pluginId,
            message: `Plugin "${plugin.name}" v${plugin.version} installed successfully`,
            errors: [],
            warnings,
        };
    }
    uninstallPlugin(pluginId) {
        const errors = [];
        const warnings = [];
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${pluginId}" not found in marketplace`,
                errors: [`Plugin "${pluginId}" is not registered`],
                warnings: [],
            };
        }
        if (!plugin.installed) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${plugin.name}" is not installed`,
                errors: [`Plugin "${pluginId}" is not installed`],
                warnings: [],
            };
        }
        for (const [id, p] of this.registry.plugins.entries()) {
            if (id === pluginId || !p.installed)
                continue;
            const dependsOnTarget = p.dependencies.some((dep) => dep.pluginId === pluginId && dep.required);
            if (dependsOnTarget) {
                errors.push(`Installed plugin "${id}" (${p.name}) has a required dependency on "${pluginId}"`);
            }
            const optionalDepends = p.dependencies.some((dep) => dep.pluginId === pluginId && !dep.required);
            if (optionalDepends) {
                warnings.push(`Installed plugin "${id}" (${p.name}) has an optional dependency on "${pluginId}" — it may lose some features`);
            }
        }
        if (errors.length > 0) {
            this.logger.warn(`Uninstallation of "${plugin.name}" (${pluginId}) blocked: ${errors.join('; ')}`);
            return {
                success: false,
                pluginId,
                message: `Uninstallation blocked — other plugins depend on this one`,
                errors,
                warnings,
            };
        }
        if (plugin.enabled) {
            this.disablePlugin(pluginId);
            warnings.push('Plugin was disabled before uninstallation');
        }
        this.activeCapabilities.delete(pluginId);
        plugin.installed = false;
        plugin.installedAt = null;
        plugin.enabled = false;
        this.emitEvent('marketplace.plugin.uninstalled', {
            pluginId,
            pluginName: plugin.name,
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin uninstalled: "${plugin.name}" (${pluginId})`);
        return {
            success: true,
            pluginId,
            message: `Plugin "${plugin.name}" uninstalled successfully`,
            errors: [],
            warnings,
        };
    }
    enablePlugin(pluginId) {
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not found in marketplace`);
        }
        if (!plugin.installed) {
            throw new Error(`Cannot enable plugin "${pluginId}" — it is not installed`);
        }
        if (plugin.enabled) {
            this.logger.debug(`Plugin "${plugin.name}" (${pluginId}) is already enabled`);
            return;
        }
        for (const dep of plugin.dependencies) {
            if (!dep.required)
                continue;
            const depPlugin = this.registry.plugins.get(dep.pluginId);
            if (depPlugin && !depPlugin.enabled) {
                throw new Error(`Cannot enable plugin "${pluginId}" — required dependency "${dep.pluginId}" is not enabled`);
            }
        }
        plugin.enabled = true;
        const capabilityNames = new Set(plugin.capabilities.map((c) => c.name));
        this.activeCapabilities.set(pluginId, capabilityNames);
        this.emitEvent('marketplace.plugin.enabled', {
            pluginId,
            pluginName: plugin.name,
            capabilities: plugin.capabilities.map((c) => c.name),
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin enabled: "${plugin.name}" (${pluginId}) with ${plugin.capabilities.length} capabilities`);
    }
    disablePlugin(pluginId) {
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not found in marketplace`);
        }
        if (!plugin.installed) {
            throw new Error(`Cannot disable plugin "${pluginId}" — it is not installed`);
        }
        if (!plugin.enabled) {
            this.logger.debug(`Plugin "${plugin.name}" (${pluginId}) is already disabled`);
            return;
        }
        for (const [id, p] of this.registry.plugins.entries()) {
            if (id === pluginId || !p.enabled)
                continue;
            const dependsOnTarget = p.dependencies.some((dep) => dep.pluginId === pluginId && dep.required);
            if (dependsOnTarget) {
                throw new Error(`Cannot disable plugin "${pluginId}" — enabled plugin "${id}" depends on it`);
            }
        }
        plugin.enabled = false;
        const capabilities = this.activeCapabilities.get(pluginId);
        this.activeCapabilities.delete(pluginId);
        this.emitEvent('marketplace.plugin.disabled', {
            pluginId,
            pluginName: plugin.name,
            capabilities: capabilities ? [...capabilities] : [],
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin disabled: "${plugin.name}" (${pluginId})`);
    }
    configurePlugin(pluginId, config) {
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin "${pluginId}" not found in marketplace`);
        }
        if (!plugin.installed) {
            throw new Error(`Cannot configure plugin "${pluginId}" — it is not installed`);
        }
        plugin.config = this.deepMerge(plugin.config, config);
        this.emitEvent('marketplace.plugin.configured', {
            pluginId,
            pluginName: plugin.name,
            config: { ...plugin.config },
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin configured: "${plugin.name}" (${pluginId}) — keys updated: ${Object.keys(config).join(', ')}`);
        return { ...plugin.config };
    }
    searchPlugins(query, filters) {
        const results = [];
        const normalisedQuery = query.toLowerCase().trim();
        for (const [pluginId, plugin] of this.registry.plugins.entries()) {
            if (filters?.installed !== undefined) {
                if (plugin.installed !== filters.installed)
                    continue;
            }
            if (filters?.category && plugin.cluster !== filters.category)
                continue;
            if (filters?.minRating !== undefined && plugin.rating < filters.minRating)
                continue;
            if (filters?.tags && filters.tags.length > 0) {
                const pluginTagsLower = plugin.tags.map((t) => t.toLowerCase());
                const hasAllTags = filters.tags.every((ft) => pluginTagsLower.includes(ft.toLowerCase()));
                if (!hasAllTags)
                    continue;
            }
            let score = 0;
            if (normalisedQuery) {
                const nameLower = plugin.name.toLowerCase();
                const idLower = plugin.id.toLowerCase();
                if (idLower === normalisedQuery) {
                    score += 1.0;
                }
                else if (nameLower === normalisedQuery) {
                    score += 0.95;
                }
                else if (idLower.startsWith(normalisedQuery)) {
                    score += 0.8;
                }
                else if (nameLower.startsWith(normalisedQuery)) {
                    score += 0.75;
                }
                else if (idLower.includes(normalisedQuery)) {
                    score += 0.6;
                }
                else if (nameLower.includes(normalisedQuery)) {
                    score += 0.55;
                }
                else if (this.fuzzyMatch(nameLower, normalisedQuery)) {
                    score += 0.35;
                }
                const descLower = plugin.description.toLowerCase();
                if (descLower.includes(normalisedQuery)) {
                    score += 0.4;
                }
                if (plugin.cluster.toLowerCase().includes(normalisedQuery)) {
                    score += 0.5;
                }
                for (const tag of plugin.tags) {
                    if (tag.toLowerCase() === normalisedQuery) {
                        score += 0.5;
                    }
                    else if (tag.toLowerCase().includes(normalisedQuery)) {
                        score += 0.25;
                    }
                }
                for (const cap of plugin.capabilities) {
                    if (cap.name.toLowerCase().includes(normalisedQuery)) {
                        score += 0.3;
                        break;
                    }
                }
            }
            else {
                score = 0.1;
            }
            score += plugin.rating * 0.05;
            score += Math.min(plugin.downloads / 1000, 0.2);
            if (score > 0) {
                results.push({ plugin: { ...plugin }, score });
            }
        }
        results.sort((a, b) => b.score - a.score);
        return results;
    }
    getPlugin(pluginId) {
        const plugin = this.registry.plugins.get(pluginId);
        return plugin ? { ...plugin } : null;
    }
    getInstalledPlugins() {
        const result = [];
        for (const plugin of this.registry.plugins.values()) {
            if (plugin.installed) {
                result.push({ ...plugin });
            }
        }
        return result;
    }
    getEnabledPlugins() {
        const result = [];
        for (const plugin of this.registry.plugins.values()) {
            if (plugin.enabled) {
                result.push({ ...plugin });
            }
        }
        return result;
    }
    getPluginsByCategory(category) {
        const pluginIds = this.registry.categories.get(category);
        if (!pluginIds || pluginIds.length === 0)
            return [];
        const result = [];
        for (const id of pluginIds) {
            const plugin = this.registry.plugins.get(id);
            if (plugin) {
                result.push({ ...plugin });
            }
        }
        return result;
    }
    checkDependencies(pluginId) {
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            return {
                pluginId,
                satisfied: false,
                missing: [{ pluginId: '_self', versionRange: '*', required: true }],
                installed: [],
            };
        }
        const missing = [];
        const installed = [];
        for (const dep of plugin.dependencies) {
            const depPlugin = this.registry.plugins.get(dep.pluginId);
            if (!depPlugin) {
                missing.push({
                    pluginId: dep.pluginId,
                    versionRange: dep.versionRange,
                    required: dep.required,
                });
                continue;
            }
            if (!depPlugin.installed) {
                missing.push({
                    pluginId: dep.pluginId,
                    versionRange: dep.versionRange,
                    required: dep.required,
                });
                continue;
            }
            if (!this.isVersionInRange(depPlugin.version, dep.versionRange)) {
                missing.push({
                    pluginId: dep.pluginId,
                    versionRange: dep.versionRange,
                    required: dep.required,
                });
                continue;
            }
            installed.push({
                pluginId: dep.pluginId,
                version: depPlugin.version,
            });
        }
        const hasMissingRequired = missing.some((m) => m.required);
        return {
            pluginId,
            satisfied: !hasMissingRequired,
            missing,
            installed,
        };
    }
    getPluginStats() {
        let totalPlugins = 0;
        let installedPlugins = 0;
        let enabledPlugins = 0;
        let totalRating = 0;
        let ratedCount = 0;
        let totalDownloads = 0;
        const byCategory = {};
        for (const plugin of this.registry.plugins.values()) {
            totalPlugins++;
            if (plugin.installed)
                installedPlugins++;
            if (plugin.enabled)
                enabledPlugins++;
            totalDownloads += plugin.downloads;
            if (plugin.rating > 0) {
                totalRating += plugin.rating;
                ratedCount++;
            }
            byCategory[plugin.cluster] = (byCategory[plugin.cluster] ?? 0) + 1;
        }
        return {
            totalPlugins,
            installedPlugins,
            enabledPlugins,
            byCategory,
            averageRating: ratedCount > 0 ? Math.round((totalRating / ratedCount) * 100) / 100 : 0,
            totalDownloads,
        };
    }
    updatePlugin(pluginId) {
        const errors = [];
        const warnings = [];
        const plugin = this.registry.plugins.get(pluginId);
        if (!plugin) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${pluginId}" not found in marketplace`,
                errors: [`Plugin "${pluginId}" is not registered`],
                warnings: [],
            };
        }
        if (!plugin.installed) {
            return {
                success: false,
                pluginId,
                message: `Plugin "${plugin.name}" is not installed — install it first`,
                errors: [`Plugin "${pluginId}" is not installed`],
                warnings: [],
            };
        }
        const currentVersion = plugin.version;
        const patchBumped = this.bumpPatchVersion(currentVersion);
        if (!this.isVersionCompatible(CURRENT_OS_VERSION, plugin.compatibility.minVersion, plugin.compatibility.maxVersion)) {
            errors.push(`Updated version would not be compatible with OS version ${CURRENT_OS_VERSION}`);
        }
        const depCheck = this.checkDependencies(pluginId);
        if (!depCheck.satisfied) {
            const missingRequired = depCheck.missing.filter((m) => m.required);
            if (missingRequired.length > 0) {
                errors.push(`Update would break dependencies: ${missingRequired.map((m) => m.pluginId).join(', ')}`);
            }
        }
        if (errors.length > 0) {
            return {
                success: false,
                pluginId,
                message: `Update failed for "${plugin.name}"`,
                errors,
                warnings,
            };
        }
        const wasEnabled = plugin.enabled;
        if (wasEnabled) {
            this.disablePlugin(pluginId);
            warnings.push('Plugin was temporarily disabled during update');
        }
        plugin.version = patchBumped;
        plugin.lastUpdated = new Date();
        if (wasEnabled) {
            this.enablePlugin(pluginId);
            warnings.push('Plugin was re-enabled after update');
        }
        this.emitEvent('marketplace.plugin.updated', {
            pluginId,
            pluginName: plugin.name,
            previousVersion: currentVersion,
            newVersion: patchBumped,
            timestamp: Date.now(),
        });
        this.logger.log(`Plugin updated: "${plugin.name}" (${pluginId}) ${currentVersion} → ${patchBumped}`);
        return {
            success: true,
            pluginId,
            message: `Plugin "${plugin.name}" updated from ${currentVersion} to ${patchBumped}`,
            errors: [],
            warnings,
        };
    }
    getCategories() {
        return [...this.registry.categories.keys()];
    }
    getTags() {
        return [...this.registry.tags.keys()];
    }
    getActiveCapabilities(pluginId) {
        const caps = this.activeCapabilities.get(pluginId);
        return caps ? [...caps] : [];
    }
    getAllActiveCapabilities() {
        const result = new Map();
        for (const [pluginId, caps] of this.activeCapabilities.entries()) {
            result.set(pluginId, [...caps]);
        }
        return result;
    }
    clear() {
        this.registry.plugins.clear();
        this.registry.categories.clear();
        this.registry.tags.clear();
        this.activeCapabilities.clear();
        this.logger.log('Marketplace registry cleared');
    }
    validateManifest(manifest) {
        const errors = [];
        if (!manifest.manifestVersion) {
            errors.push('manifestVersion is required');
        }
        if (!manifest.entryPoint) {
            errors.push('entryPoint is required');
        }
        if (!manifest.checksum) {
            errors.push('checksum is required');
        }
        if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
            errors.push('permissions must be an array');
        }
        const p = manifest.plugin;
        if (!p.id || typeof p.id !== 'string') {
            errors.push('plugin.id is required and must be a string');
        }
        if (!p.name || typeof p.name !== 'string') {
            errors.push('plugin.name is required and must be a string');
        }
        if (!p.version || typeof p.version !== 'string') {
            errors.push('plugin.version is required and must be a string');
        }
        if (!p.description || typeof p.description !== 'string') {
            errors.push('plugin.description is required and must be a string');
        }
        if (!p.cluster || typeof p.cluster !== 'string') {
            errors.push('plugin.cluster is required and must be a string');
        }
        if (!p.author || typeof p.author !== 'string') {
            errors.push('plugin.author is required and must be a string');
        }
        if (!p.homepage || typeof p.homepage !== 'string') {
            errors.push('plugin.homepage is required and must be a string');
        }
        if (!p.repository || typeof p.repository !== 'string') {
            errors.push('plugin.repository is required and must be a string');
        }
        if (!Array.isArray(p.capabilities)) {
            errors.push('plugin.capabilities must be an array');
        }
        else {
            for (let i = 0; i < p.capabilities.length; i++) {
                const cap = p.capabilities[i];
                if (!cap.name)
                    errors.push(`plugin.capabilities[${i}].name is required`);
                if (!cap.description)
                    errors.push(`plugin.capabilities[${i}].description is required`);
                if (typeof cap.agentCount !== 'number')
                    errors.push(`plugin.capabilities[${i}].agentCount must be a number`);
            }
        }
        if (!Array.isArray(p.dependencies)) {
            errors.push('plugin.dependencies must be an array');
        }
        else {
            for (let i = 0; i < p.dependencies.length; i++) {
                const dep = p.dependencies[i];
                if (!dep.pluginId)
                    errors.push(`plugin.dependencies[${i}].pluginId is required`);
                if (!dep.versionRange)
                    errors.push(`plugin.dependencies[${i}].versionRange is required`);
            }
        }
        if (!p.size || typeof p.size !== 'string') {
            errors.push('plugin.size is required and must be a string');
        }
        if (!p.license || typeof p.license !== 'string') {
            errors.push('plugin.license is required and must be a string');
        }
        if (!Array.isArray(p.tags)) {
            errors.push('plugin.tags must be an array');
        }
        if (!p.compatibility) {
            errors.push('plugin.compatibility is required');
        }
        else {
            if (!p.compatibility.minVersion)
                errors.push('plugin.compatibility.minVersion is required');
            if (!p.compatibility.maxVersion)
                errors.push('plugin.compatibility.maxVersion is required');
        }
        if (!(p.lastUpdated instanceof Date)) {
            errors.push('plugin.lastUpdated must be a Date');
        }
        return errors;
    }
    addToIndex(index, key, value) {
        if (!index.has(key)) {
            index.set(key, []);
        }
        const list = index.get(key);
        if (!list.includes(value)) {
            list.push(value);
        }
    }
    removeFromIndex(index, key, value) {
        const list = index.get(key);
        if (!list)
            return;
        const idx = list.indexOf(value);
        if (idx >= 0) {
            list.splice(idx, 1);
        }
        if (list.length === 0) {
            index.delete(key);
        }
    }
    isVersionCompatible(version, minVersion, maxVersion) {
        return (this.compareSemver(version, minVersion) >= 0 && this.compareSemver(version, maxVersion) <= 0);
    }
    isVersionInRange(version, versionRange) {
        const trimmed = versionRange.trim();
        if (trimmed.includes(' - ')) {
            const parts = trimmed.split(' - ').map((s) => s.trim());
            const minCompare = this.compareSemver(version, this.stripRangePrefix(parts[0]));
            const maxCompare = this.compareSemver(version, this.stripRangePrefix(parts[1]));
            return minCompare >= 0 && maxCompare <= 0;
        }
        if (trimmed.startsWith('^')) {
            const target = trimmed.slice(1);
            const v = this.parseSemver(version);
            const t = this.parseSemver(target);
            if (!v || !t)
                return version === target;
            return v.major === t.major && this.compareSemver(version, target) >= 0;
        }
        if (trimmed.startsWith('~')) {
            const target = trimmed.slice(1);
            const v = this.parseSemver(version);
            const t = this.parseSemver(target);
            if (!v || !t)
                return version === target;
            return v.major === t.major && v.minor === t.minor && this.compareSemver(version, target) >= 0;
        }
        if (trimmed === '*' || trimmed === 'latest')
            return true;
        return this.compareSemver(version, trimmed) >= 0;
    }
    stripRangePrefix(version) {
        const trimmed = version.trim();
        if (trimmed.startsWith('^') || trimmed.startsWith('~')) {
            return trimmed.slice(1);
        }
        return trimmed;
    }
    compareSemver(a, b) {
        const pa = this.parseSemver(a);
        const pb = this.parseSemver(b);
        if (!pa && !pb)
            return 0;
        if (!pa)
            return -1;
        if (!pb)
            return 1;
        if (pa.major !== pb.major)
            return pa.major - pb.major;
        if (pa.minor !== pb.minor)
            return pa.minor - pb.minor;
        return pa.patch - pb.patch;
    }
    parseSemver(version) {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
        if (!match)
            return null;
        return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3], 10),
        };
    }
    bumpPatchVersion(version) {
        const parsed = this.parseSemver(version);
        if (!parsed)
            return version;
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    }
    fuzzyMatch(target, query) {
        let ti = 0;
        let qi = 0;
        while (ti < target.length && qi < query.length) {
            if (target[ti] === query[qi]) {
                qi++;
            }
            ti++;
        }
        return qi === query.length;
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] !== null &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key]) &&
                target[key] !== null &&
                typeof target[key] === 'object' &&
                !Array.isArray(target[key])) {
                result[key] = this.deepMerge(target[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = MarketplaceService_1 = __decorate([
    (0, common_1.Injectable)()
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map