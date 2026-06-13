/**
 * AENEWS Agent OS X - Marketplace Service
 * The Agent Marketplace is a plugin-based cluster system where new clusters
 * (browser, office, marketing, finance, medical, legal, robotics, vision, etc.)
 * can be added as plugins without modifying the core.
 *
 * This service manages the full plugin lifecycle: registration, installation,
 * enabling, configuration, dependency resolution, and uninstallation.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  cluster: string; // e.g., 'browser', 'office', 'medical', 'legal'
  author: string;
  homepage: string;
  repository: string;
  capabilities: PluginCapability[];
  dependencies: PluginDependency[];
  installed: boolean;
  installedAt: Date | null;
  enabled: boolean;
  config: Record<string, any>;
  rating: number; // 0-5
  downloads: number;
  size: string;
  license: string;
  tags: string[];
  compatibility: { minVersion: string; maxVersion: string };
  lastUpdated: Date;
}

export interface PluginCapability {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  agentCount: number; // How many agents provide this capability
}

export interface PluginDependency {
  pluginId: string;
  versionRange: string;
  required: boolean;
}

export interface PluginManifest {
  manifestVersion: string;
  plugin: Omit<MarketplacePlugin, 'installed' | 'installedAt' | 'enabled' | 'rating' | 'downloads'>;
  entryPoint: string;
  permissions: string[];
  checksum: string;
}

export interface PluginInstallResult {
  success: boolean;
  pluginId: string;
  message: string;
  errors: string[];
  warnings: string[];
}

export interface PluginRegistry {
  plugins: Map<string, MarketplacePlugin>;
  categories: Map<string, string[]>; // category → plugin IDs
  tags: Map<string, string[]>; // tag → plugin IDs
}

export interface PluginSearchFilters {
  installed?: boolean; // true = only installed, false = only not-installed
  category?: string;
  tags?: string[];
  minRating?: number;
}

export interface PluginStats {
  totalPlugins: number;
  installedPlugins: number;
  enabledPlugins: number;
  byCategory: Record<string, number>;
  averageRating: number;
  totalDownloads: number;
}

export interface DependencyCheckResult {
  pluginId: string;
  satisfied: boolean;
  missing: Array<{ pluginId: string; versionRange: string; required: boolean }>;
  installed: Array<{ pluginId: string; version: string }>;
}

// ─── Constants ──────────────────────────────────────────────────────

const CURRENT_OS_VERSION = '1.0.0';

/** The 11 built-in clusters registered as marketplace plugins on init. */
const BUILT_IN_CLUSTERS: Array<{
  cluster: string;
  name: string;
  description: string;
  capabilities: Array<Omit<PluginCapability, 'agentCount'>>;
  size: string;
  tags: string[];
}> = [
  {
    cluster: 'browser',
    name: 'Browser Cluster',
    description:
      'Web browsing, navigation, scraping, and automation capabilities. ' +
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
    description:
      'Document creation, editing, and management. Supports Word, Excel, ' +
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
    description:
      'SEO analysis, content strategy, social media management, and campaign ' +
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
    description:
      'Financial analysis, reporting, risk assessment, and portfolio management. ' +
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
    description:
      'Clinical decision support, medical record analysis, diagnostic assistance, ' +
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
    description:
      'Legal document analysis, contract review, compliance checking, and ' +
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
    description:
      'Robot control, path planning, sensor fusion, and physical world ' +
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
    description:
      'Image recognition, object detection, OCR, video analysis, and visual ' +
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
    description:
      'Data pipeline orchestration, ETL operations, database management, and ' +
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
    description:
      'Vulnerability scanning, threat detection, incident response, and security ' +
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
    description:
      'Email, messaging, notification, and multi-channel communication. ' +
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

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class MarketplaceService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceService.name);

  /** The core registry holding all known plugins and indexes. */
  private readonly registry: PluginRegistry = {
    plugins: new Map(),
    categories: new Map(),
    tags: new Map(),
  };

  /** Plugin ID → set of registered capability names (for enable/disable). */
  private readonly activeCapabilities: Map<string, Set<string>> = new Map();

  /** Simple event listeners — in production this would use an EventBus. */
  private readonly eventListeners: Map<string, Array<(payload: any) => void>> = new Map();

  // ─── Lifecycle ────────────────────────────────────────────────────

  onModuleInit(): void {
    this.initialize();
    this.logger.log('MarketplaceService initialised');
  }

  // ─── Event helpers ────────────────────────────────────────────────

  /**
   * Register a listener for a marketplace event.
   * Returns an unsubscribe function.
   */
  on(event: string, listener: (payload: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    };
  }

  private emitEvent(event: string, payload: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch (err) {
          this.logger.warn(`Event listener error on "${event}": ${err}`);
        }
      }
    }
  }

  // ─── 1. initialize ────────────────────────────────────────────────

  /**
   * Load the 11 built-in clusters as pre-installed, pre-enabled plugins.
   * These represent the core capabilities of the Agent OS and are always
   * available.
   */
  initialize(): void {
    this.logger.log('Loading built-in marketplace plugins...');

    const now = new Date();

    for (const cluster of BUILT_IN_CLUSTERS) {
      const pluginId = `builtin.${cluster.cluster}`;

      const capabilities: PluginCapability[] = cluster.capabilities.map((cap) => ({
        ...cap,
        agentCount: 3, // Built-in clusters have 3 agents per capability by default
      }));

      const plugin: MarketplacePlugin = {
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

      // Build category index
      this.addToIndex(this.registry.categories, plugin.cluster, pluginId);

      // Build tag indexes
      for (const tag of plugin.tags) {
        this.addToIndex(this.registry.tags, tag, pluginId);
      }

      // Register active capabilities for built-in plugins
      this.activeCapabilities.set(pluginId, new Set(capabilities.map((c) => c.name)));
    }

    this.logger.log(
      `Loaded ${BUILT_IN_CLUSTERS.length} built-in plugins across ${this.registry.categories.size} categories`,
    );
  }

  // ─── 2. registerPlugin ────────────────────────────────────────────

  /**
   * Register a new plugin in the marketplace from a manifest.
   * Validates the manifest, checks for duplicate IDs, validates
   * dependencies and compatibility, then adds to registry and indexes.
   */
  registerPlugin(manifest: PluginManifest): MarketplacePlugin {
    // --- Validate manifest structure ---
    const validationErrors = this.validateManifest(manifest);
    if (validationErrors.length > 0) {
      throw new Error(`Manifest validation failed: ${validationErrors.join('; ')}`);
    }

    const pluginData = manifest.plugin;
    const pluginId = pluginData.id;

    // --- Check for duplicate ---
    if (this.registry.plugins.has(pluginId)) {
      throw new Error(`Plugin with id "${pluginId}" is already registered in the marketplace`);
    }

    // --- Check compatibility with current OS version ---
    if (
      !this.isVersionCompatible(
        CURRENT_OS_VERSION,
        pluginData.compatibility.minVersion,
        pluginData.compatibility.maxVersion,
      )
    ) {
      throw new Error(
        `Plugin "${pluginId}" is not compatible with OS version ${CURRENT_OS_VERSION} ` +
          `(requires ${pluginData.compatibility.minVersion} - ${pluginData.compatibility.maxVersion})`,
      );
    }

    // --- Check that declared dependencies reference existing plugins ---
    for (const dep of pluginData.dependencies) {
      if (!this.registry.plugins.has(dep.pluginId)) {
        if (dep.required) {
          throw new Error(
            `Required dependency "${dep.pluginId}" for plugin "${pluginId}" is not registered in the marketplace`,
          );
        }
        // Optional missing dependencies produce a warning but don't block
        this.logger.warn(
          `Optional dependency "${dep.pluginId}" for plugin "${pluginId}" is not registered`,
        );
      }
    }

    // --- Build the full plugin record ---
    const now = new Date();
    const plugin: MarketplacePlugin = {
      ...pluginData,
      installed: false,
      installedAt: null,
      enabled: false,
      rating: 0,
      downloads: 0,
    };

    // --- Add to registry ---
    this.registry.plugins.set(pluginId, plugin);

    // --- Update indexes ---
    this.addToIndex(this.registry.categories, plugin.cluster, pluginId);
    for (const tag of plugin.tags) {
      this.addToIndex(this.registry.tags, tag, pluginId);
    }

    this.emitEvent('marketplace.plugin.registered', {
      pluginId,
      plugin: { ...plugin },
      timestamp: Date.now(),
    });

    this.logger.log(
      `Plugin registered: "${plugin.name}" (${pluginId}) v${plugin.version} cluster=${plugin.cluster}`,
    );

    return { ...plugin };
  }

  // ─── 3. unregisterPlugin ──────────────────────────────────────────

  /**
   * Remove a plugin from the marketplace. Only possible if the plugin
   * is not currently installed. Installed plugins must be uninstalled
   * first before they can be removed from the marketplace.
   */
  unregisterPlugin(pluginId: string): void {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not registered in the marketplace`);
    }

    if (plugin.installed) {
      throw new Error(
        `Cannot unregister plugin "${pluginId}" — it is currently installed. ` +
          'Uninstall it first before removing from the marketplace.',
      );
    }

    // Check if any other installed plugin depends on this one
    for (const [id, p] of this.registry.plugins.entries()) {
      if (id === pluginId) continue;
      if (!p.installed) continue;

      const dependsOnTarget = p.dependencies.some(
        (dep) => dep.pluginId === pluginId && dep.required,
      );
      if (dependsOnTarget) {
        throw new Error(
          `Cannot unregister plugin "${pluginId}" — installed plugin "${id}" depends on it`,
        );
      }
    }

    // Remove from registry
    this.registry.plugins.delete(pluginId);

    // Remove from category index
    this.removeFromIndex(this.registry.categories, plugin.cluster, pluginId);

    // Remove from tag indexes
    for (const tag of plugin.tags) {
      this.removeFromIndex(this.registry.tags, tag, pluginId);
    }

    // Clean up active capabilities if present (shouldn't be, but safety)
    this.activeCapabilities.delete(pluginId);

    this.emitEvent('marketplace.plugin.unregistered', {
      pluginId,
      pluginName: plugin.name,
      timestamp: Date.now(),
    });

    this.logger.log(`Plugin unregistered: "${plugin.name}" (${pluginId})`);
  }

  // ─── 4. installPlugin ─────────────────────────────────────────────

  /**
   * Install a plugin from the marketplace. Validates that all required
   * dependencies are already installed, installs optional dependencies
   * if available, registers the plugin's capabilities, and marks it as
   * installed. Returns a PluginInstallResult with detailed outcome info.
   */
  installPlugin(pluginId: string, config?: Record<string, any>): PluginInstallResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    // --- Validate compatibility ---
    if (
      !this.isVersionCompatible(
        CURRENT_OS_VERSION,
        plugin.compatibility.minVersion,
        plugin.compatibility.maxVersion,
      )
    ) {
      errors.push(
        `Plugin "${pluginId}" is not compatible with OS version ${CURRENT_OS_VERSION} ` +
          `(requires ${plugin.compatibility.minVersion} - ${plugin.compatibility.maxVersion})`,
      );
    }

    // --- Check / install dependencies ---
    for (const dep of plugin.dependencies) {
      const depPlugin = this.registry.plugins.get(dep.pluginId);

      if (!depPlugin) {
        if (dep.required) {
          errors.push(`Required dependency "${dep.pluginId}" is not available in the marketplace`);
        } else {
          warnings.push(
            `Optional dependency "${dep.pluginId}" is not available — some features may be limited`,
          );
        }
        continue;
      }

      if (!depPlugin.installed) {
        if (dep.required) {
          // Attempt to install the required dependency first
          this.logger.log(`Installing required dependency "${dep.pluginId}" for "${pluginId}"...`);
          const depResult = this.installPlugin(dep.pluginId);
          if (!depResult.success) {
            errors.push(
              `Failed to install required dependency "${dep.pluginId}": ${depResult.message}`,
            );
          } else {
            warnings.push(`Required dependency "${dep.pluginId}" was auto-installed`);
          }
        } else {
          warnings.push(
            `Optional dependency "${dep.pluginId}" is not installed — some features may be limited`,
          );
        }
        continue;
      }

      // Dependency is installed — check version compatibility
      if (!this.isVersionInRange(depPlugin.version, dep.versionRange)) {
        if (dep.required) {
          errors.push(
            `Required dependency "${dep.pluginId}" version ${depPlugin.version} ` +
              `does not satisfy required range "${dep.versionRange}"`,
          );
        } else {
          warnings.push(
            `Optional dependency "${dep.pluginId}" version ${depPlugin.version} ` +
              `does not satisfy range "${dep.versionRange}"`,
          );
        }
      }
    }

    // --- If errors, abort installation ---
    if (errors.length > 0) {
      this.logger.warn(
        `Installation of "${plugin.name}" (${pluginId}) failed: ${errors.join('; ')}`,
      );

      return {
        success: false,
        pluginId,
        message: `Installation failed due to ${errors.length} error(s)`,
        errors,
        warnings,
      };
    }

    // --- Perform installation ---
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

  // ─── 5. uninstallPlugin ───────────────────────────────────────────

  /**
   * Uninstall a plugin. Checks that no other installed plugins depend
   * on it, deregisters its capabilities, and marks it as uninstalled.
   */
  uninstallPlugin(pluginId: string): PluginInstallResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    // --- Check for reverse dependencies ---
    for (const [id, p] of this.registry.plugins.entries()) {
      if (id === pluginId || !p.installed) continue;

      const dependsOnTarget = p.dependencies.some(
        (dep) => dep.pluginId === pluginId && dep.required,
      );
      if (dependsOnTarget) {
        errors.push(
          `Installed plugin "${id}" (${p.name}) has a required dependency on "${pluginId}"`,
        );
      }

      // Optional reverse dependencies produce warnings
      const optionalDepends = p.dependencies.some(
        (dep) => dep.pluginId === pluginId && !dep.required,
      );
      if (optionalDepends) {
        warnings.push(
          `Installed plugin "${id}" (${p.name}) has an optional dependency on "${pluginId}" — it may lose some features`,
        );
      }
    }

    if (errors.length > 0) {
      this.logger.warn(
        `Uninstallation of "${plugin.name}" (${pluginId}) blocked: ${errors.join('; ')}`,
      );

      return {
        success: false,
        pluginId,
        message: `Uninstallation blocked — other plugins depend on this one`,
        errors,
        warnings,
      };
    }

    // --- Disable if currently enabled ---
    if (plugin.enabled) {
      this.disablePlugin(pluginId);
      warnings.push('Plugin was disabled before uninstallation');
    }

    // --- Deregister capabilities ---
    this.activeCapabilities.delete(pluginId);

    // --- Mark as uninstalled ---
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

  // ─── 6. enablePlugin ──────────────────────────────────────────────

  /**
   * Enable an installed plugin. Registers its agents/capabilities so
   * they become available to the rest of the system.
   */
  enablePlugin(pluginId: string): void {
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

    // Check that required dependencies are enabled
    for (const dep of plugin.dependencies) {
      if (!dep.required) continue;
      const depPlugin = this.registry.plugins.get(dep.pluginId);
      if (depPlugin && !depPlugin.enabled) {
        throw new Error(
          `Cannot enable plugin "${pluginId}" — required dependency "${dep.pluginId}" is not enabled`,
        );
      }
    }

    // Enable the plugin and register its capabilities
    plugin.enabled = true;

    const capabilityNames = new Set(plugin.capabilities.map((c) => c.name));
    this.activeCapabilities.set(pluginId, capabilityNames);

    this.emitEvent('marketplace.plugin.enabled', {
      pluginId,
      pluginName: plugin.name,
      capabilities: plugin.capabilities.map((c) => c.name),
      timestamp: Date.now(),
    });

    this.logger.log(
      `Plugin enabled: "${plugin.name}" (${pluginId}) with ${plugin.capabilities.length} capabilities`,
    );
  }

  // ─── 7. disablePlugin ─────────────────────────────────────────────

  /**
   * Disable an enabled plugin. Unregisters its agents/capabilities but
   * keeps the plugin installed so it can be re-enabled later.
   */
  disablePlugin(pluginId: string): void {
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

    // Check if any other enabled plugin depends on this one
    for (const [id, p] of this.registry.plugins.entries()) {
      if (id === pluginId || !p.enabled) continue;
      const dependsOnTarget = p.dependencies.some(
        (dep) => dep.pluginId === pluginId && dep.required,
      );
      if (dependsOnTarget) {
        throw new Error(
          `Cannot disable plugin "${pluginId}" — enabled plugin "${id}" depends on it`,
        );
      }
    }

    // Disable the plugin and unregister capabilities
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

  // ─── 8. configurePlugin ───────────────────────────────────────────

  /**
   * Update the configuration of an installed plugin. Merges the new
   * config with the existing configuration.
   */
  configurePlugin(pluginId: string, config: Record<string, any>): Record<string, any> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found in marketplace`);
    }

    if (!plugin.installed) {
      throw new Error(`Cannot configure plugin "${pluginId}" — it is not installed`);
    }

    // Deep merge configuration
    plugin.config = this.deepMerge(plugin.config, config);

    this.emitEvent('marketplace.plugin.configured', {
      pluginId,
      pluginName: plugin.name,
      config: { ...plugin.config },
      timestamp: Date.now(),
    });

    this.logger.log(
      `Plugin configured: "${plugin.name}" (${pluginId}) — keys updated: ${Object.keys(config).join(', ')}`,
    );

    return { ...plugin.config };
  }

  // ─── 9. searchPlugins ─────────────────────────────────────────────

  /**
   * Search plugins by name, description, tags, and/or category.
   * Supports filtering by installed status, category, tags, and minimum
   * rating. Returns results sorted by descending relevance score.
   */
  searchPlugins(
    query: string,
    filters?: PluginSearchFilters,
  ): Array<{ plugin: MarketplacePlugin; score: number }> {
    const results: Array<{ plugin: MarketplacePlugin; score: number }> = [];
    const normalisedQuery = query.toLowerCase().trim();

    for (const [pluginId, plugin] of this.registry.plugins.entries()) {
      // --- Apply filters first (hard filters) ---

      if (filters?.installed !== undefined) {
        if (plugin.installed !== filters.installed) continue;
      }

      if (filters?.category && plugin.cluster !== filters.category) continue;

      if (filters?.minRating !== undefined && plugin.rating < filters.minRating) continue;

      if (filters?.tags && filters.tags.length > 0) {
        const pluginTagsLower = plugin.tags.map((t) => t.toLowerCase());
        const hasAllTags = filters.tags.every((ft) => pluginTagsLower.includes(ft.toLowerCase()));
        if (!hasAllTags) continue;
      }

      // --- Compute search relevance score ---
      let score = 0;

      if (normalisedQuery) {
        // Name matching
        const nameLower = plugin.name.toLowerCase();
        const idLower = plugin.id.toLowerCase();

        if (idLower === normalisedQuery) {
          score += 1.0;
        } else if (nameLower === normalisedQuery) {
          score += 0.95;
        } else if (idLower.startsWith(normalisedQuery)) {
          score += 0.8;
        } else if (nameLower.startsWith(normalisedQuery)) {
          score += 0.75;
        } else if (idLower.includes(normalisedQuery)) {
          score += 0.6;
        } else if (nameLower.includes(normalisedQuery)) {
          score += 0.55;
        } else if (this.fuzzyMatch(nameLower, normalisedQuery)) {
          score += 0.35;
        }

        // Description matching
        const descLower = plugin.description.toLowerCase();
        if (descLower.includes(normalisedQuery)) {
          score += 0.4;
        }

        // Cluster matching
        if (plugin.cluster.toLowerCase().includes(normalisedQuery)) {
          score += 0.5;
        }

        // Tag matching
        for (const tag of plugin.tags) {
          if (tag.toLowerCase() === normalisedQuery) {
            score += 0.5;
          } else if (tag.toLowerCase().includes(normalisedQuery)) {
            score += 0.25;
          }
        }

        // Capability name matching
        for (const cap of plugin.capabilities) {
          if (cap.name.toLowerCase().includes(normalisedQuery)) {
            score += 0.3;
            break; // Only count once per plugin
          }
        }
      } else {
        // Empty query — return all matching plugins with a baseline score
        score = 0.1;
      }

      // Boost score for higher rating and more downloads
      score += plugin.rating * 0.05; // 0-0.25 bonus
      score += Math.min(plugin.downloads / 1000, 0.2); // up to 0.2 bonus

      if (score > 0) {
        results.push({ plugin: { ...plugin }, score });
      }
    }

    // Sort by descending score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  // ─── 10. getPlugin ────────────────────────────────────────────────

  /**
   * Get details for a specific plugin by ID.
   */
  getPlugin(pluginId: string): MarketplacePlugin | null {
    const plugin = this.registry.plugins.get(pluginId);
    return plugin ? { ...plugin } : null;
  }

  // ─── 11. getInstalledPlugins ──────────────────────────────────────

  /**
   * Get all installed plugins.
   */
  getInstalledPlugins(): MarketplacePlugin[] {
    const result: MarketplacePlugin[] = [];
    for (const plugin of this.registry.plugins.values()) {
      if (plugin.installed) {
        result.push({ ...plugin });
      }
    }
    return result;
  }

  // ─── 12. getEnabledPlugins ────────────────────────────────────────

  /**
   * Get all enabled plugins.
   */
  getEnabledPlugins(): MarketplacePlugin[] {
    const result: MarketplacePlugin[] = [];
    for (const plugin of this.registry.plugins.values()) {
      if (plugin.enabled) {
        result.push({ ...plugin });
      }
    }
    return result;
  }

  // ─── 13. getPluginsByCategory ─────────────────────────────────────

  /**
   * Get all plugins in a given category/cluster.
   */
  getPluginsByCategory(category: string): MarketplacePlugin[] {
    const pluginIds = this.registry.categories.get(category);
    if (!pluginIds || pluginIds.length === 0) return [];

    const result: MarketplacePlugin[] = [];
    for (const id of pluginIds) {
      const plugin = this.registry.plugins.get(id);
      if (plugin) {
        result.push({ ...plugin });
      }
    }
    return result;
  }

  // ─── 14. checkDependencies ────────────────────────────────────────

  /**
   * Check whether all dependencies for a plugin are satisfied.
   * Returns a detailed result showing which dependencies are met,
   * which are missing, and which have version mismatches.
   */
  checkDependencies(pluginId: string): DependencyCheckResult {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      return {
        pluginId,
        satisfied: false,
        missing: [{ pluginId: '_self', versionRange: '*', required: true }],
        installed: [],
      };
    }

    const missing: DependencyCheckResult['missing'] = [];
    const installed: DependencyCheckResult['installed'] = [];

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

      // Check version compatibility
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

    // Satisfied only if there are no missing required dependencies
    const hasMissingRequired = missing.some((m) => m.required);

    return {
      pluginId,
      satisfied: !hasMissingRequired,
      missing,
      installed,
    };
  }

  // ─── 15. getPluginStats ───────────────────────────────────────────

  /**
   * Return statistics about the marketplace: total, installed, enabled,
   * breakdown by category, average rating, and total downloads.
   */
  getPluginStats(): PluginStats {
    let totalPlugins = 0;
    let installedPlugins = 0;
    let enabledPlugins = 0;
    let totalRating = 0;
    let ratedCount = 0;
    let totalDownloads = 0;
    const byCategory: Record<string, number> = {};

    for (const plugin of this.registry.plugins.values()) {
      totalPlugins++;

      if (plugin.installed) installedPlugins++;
      if (plugin.enabled) enabledPlugins++;

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

  // ─── 16. updatePlugin ─────────────────────────────────────────────

  /**
   * Check for updates and update a plugin. In a real implementation this
   * would fetch from a remote registry. Here we simulate by checking
   * the manifest checksum and bumping the version if applicable.
   *
   * For now, this validates the current plugin state, checks compatibility
   * of any pending update, and applies it if available.
   */
  updatePlugin(pluginId: string): PluginInstallResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    // --- Simulate update check ---
    // In production, this would query a remote update server.
    // For now, we simulate by checking if the plugin version can be
    // incremented within its compatibility range.

    const currentVersion = plugin.version;
    const patchBumped = this.bumpPatchVersion(currentVersion);

    // Check if the bumped version is still within compatibility
    if (
      !this.isVersionCompatible(
        CURRENT_OS_VERSION,
        plugin.compatibility.minVersion,
        plugin.compatibility.maxVersion,
      )
    ) {
      errors.push(`Updated version would not be compatible with OS version ${CURRENT_OS_VERSION}`);
    }

    // Check dependencies still work with the "updated" version
    const depCheck = this.checkDependencies(pluginId);
    if (!depCheck.satisfied) {
      const missingRequired = depCheck.missing.filter((m) => m.required);
      if (missingRequired.length > 0) {
        errors.push(
          `Update would break dependencies: ${missingRequired.map((m) => m.pluginId).join(', ')}`,
        );
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

    // --- Apply update ---
    const wasEnabled = plugin.enabled;

    // Temporarily disable during update
    if (wasEnabled) {
      this.disablePlugin(pluginId);
      warnings.push('Plugin was temporarily disabled during update');
    }

    plugin.version = patchBumped;
    plugin.lastUpdated = new Date();

    // Re-enable if it was previously enabled
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

    this.logger.log(
      `Plugin updated: "${plugin.name}" (${pluginId}) ${currentVersion} → ${patchBumped}`,
    );

    return {
      success: true,
      pluginId,
      message: `Plugin "${plugin.name}" updated from ${currentVersion} to ${patchBumped}`,
      errors: [],
      warnings,
    };
  }

  // ─── Utility / inspection ─────────────────────────────────────────

  /**
   * Get all category names currently in the registry.
   */
  getCategories(): string[] {
    return [...this.registry.categories.keys()];
  }

  /**
   * Get all tag names currently in the registry.
   */
  getTags(): string[] {
    return [...this.registry.tags.keys()];
  }

  /**
   * Get active (enabled) capabilities for a specific plugin.
   */
  getActiveCapabilities(pluginId: string): string[] {
    const caps = this.activeCapabilities.get(pluginId);
    return caps ? [...caps] : [];
  }

  /**
   * Get all active capabilities across all enabled plugins.
   */
  getAllActiveCapabilities(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [pluginId, caps] of this.activeCapabilities.entries()) {
      result.set(pluginId, [...caps]);
    }
    return result;
  }

  /**
   * Clear the entire marketplace registry (useful for testing).
   */
  clear(): void {
    this.registry.plugins.clear();
    this.registry.categories.clear();
    this.registry.tags.clear();
    this.activeCapabilities.clear();
    this.logger.log('Marketplace registry cleared');
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Validate a plugin manifest for required fields and structural
   * correctness. Returns an array of error messages (empty = valid).
   */
  private validateManifest(manifest: PluginManifest): string[] {
    const errors: string[] = [];

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
    } else {
      for (let i = 0; i < p.capabilities.length; i++) {
        const cap = p.capabilities[i];
        if (!cap.name) errors.push(`plugin.capabilities[${i}].name is required`);
        if (!cap.description) errors.push(`plugin.capabilities[${i}].description is required`);
        if (typeof cap.agentCount !== 'number')
          errors.push(`plugin.capabilities[${i}].agentCount must be a number`);
      }
    }

    if (!Array.isArray(p.dependencies)) {
      errors.push('plugin.dependencies must be an array');
    } else {
      for (let i = 0; i < p.dependencies.length; i++) {
        const dep = p.dependencies[i];
        if (!dep.pluginId) errors.push(`plugin.dependencies[${i}].pluginId is required`);
        if (!dep.versionRange) errors.push(`plugin.dependencies[${i}].versionRange is required`);
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
    } else {
      if (!p.compatibility.minVersion) errors.push('plugin.compatibility.minVersion is required');
      if (!p.compatibility.maxVersion) errors.push('plugin.compatibility.maxVersion is required');
    }

    if (!(p.lastUpdated instanceof Date)) {
      errors.push('plugin.lastUpdated must be a Date');
    }

    return errors;
  }

  /**
   * Add a value to a Map<string, string[]> index.
   */
  private addToIndex(index: Map<string, string[]>, key: string, value: string): void {
    if (!index.has(key)) {
      index.set(key, []);
    }
    const list = index.get(key)!;
    if (!list.includes(value)) {
      list.push(value);
    }
  }

  /**
   * Remove a value from a Map<string, string[]> index.
   */
  private removeFromIndex(index: Map<string, string[]>, key: string, value: string): void {
    const list = index.get(key);
    if (!list) return;

    const idx = list.indexOf(value);
    if (idx >= 0) {
      list.splice(idx, 1);
    }

    if (list.length === 0) {
      index.delete(key);
    }
  }

  /**
   * Check if a version falls within a min/max compatibility range.
   * Uses simple semver comparison (major.minor.patch).
   */
  private isVersionCompatible(version: string, minVersion: string, maxVersion: string): boolean {
    return (
      this.compareSemver(version, minVersion) >= 0 && this.compareSemver(version, maxVersion) <= 0
    );
  }

  /**
   * Check if a version satisfies a version range string.
   * Supports: exact ("1.2.3"), caret ("^1.2.3"), tilde ("~1.2.3"),
   * and range ("^1.2.0 - ^2.0.0").
   */
  private isVersionInRange(version: string, versionRange: string): boolean {
    const trimmed = versionRange.trim();

    // Range syntax: "min - max"
    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ').map((s) => s.trim());
      const minCompare = this.compareSemver(version, this.stripRangePrefix(parts[0]));
      const maxCompare = this.compareSemver(version, this.stripRangePrefix(parts[1]));
      return minCompare >= 0 && maxCompare <= 0;
    }

    // Caret range: ^1.2.3 → compatible with same major
    if (trimmed.startsWith('^')) {
      const target = trimmed.slice(1);
      const v = this.parseSemver(version);
      const t = this.parseSemver(target);
      if (!v || !t) return version === target;
      return v.major === t.major && this.compareSemver(version, target) >= 0;
    }

    // Tilde range: ~1.2.3 → compatible with same major.minor
    if (trimmed.startsWith('~')) {
      const target = trimmed.slice(1);
      const v = this.parseSemver(version);
      const t = this.parseSemver(target);
      if (!v || !t) return version === target;
      return v.major === t.major && v.minor === t.minor && this.compareSemver(version, target) >= 0;
    }

    // Exact match or wildcard
    if (trimmed === '*' || trimmed === 'latest') return true;

    return this.compareSemver(version, trimmed) >= 0;
  }

  /**
   * Strip the range prefix (^ or ~) from a version string.
   */
  private stripRangePrefix(version: string): string {
    const trimmed = version.trim();
    if (trimmed.startsWith('^') || trimmed.startsWith('~')) {
      return trimmed.slice(1);
    }
    return trimmed;
  }

  /**
   * Compare two semver strings. Returns:
   *   -1 if a < b
   *    0 if a === b
   *    1 if a > b
   */
  private compareSemver(a: string, b: string): number {
    const pa = this.parseSemver(a);
    const pb = this.parseSemver(b);

    if (!pa && !pb) return 0;
    if (!pa) return -1;
    if (!pb) return 1;

    if (pa.major !== pb.major) return pa.major - pb.major;
    if (pa.minor !== pb.minor) return pa.minor - pb.minor;
    return pa.patch - pb.patch;
  }

  /**
   * Parse a semver string into its components.
   */
  private parseSemver(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Bump the patch version of a semver string.
   */
  private bumpPatchVersion(version: string): string {
    const parsed = this.parseSemver(version);
    if (!parsed) return version;
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  /**
   * Simple fuzzy (subsequence) match: returns true if every character in
   * `query` appears in `target` in the same order.
   */
  private fuzzyMatch(target: string, query: string): boolean {
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

  /**
   * Deep merge two objects. Arrays are replaced, not concatenated.
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
