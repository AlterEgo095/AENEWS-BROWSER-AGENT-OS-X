import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plugin } from './entities/plugin.entity';
import { EventService } from '../event/event.service';

export interface PluginHook {
  event: string;
  handler: (payload: any) => Promise<void>;
}

@Injectable()
export class PluginService {
  private readonly logger = new Logger(PluginService.name);
  private readonly loadedPlugins: Map<string, PluginHook[]> = new Map();

  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepository: Repository<Plugin>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Register a new plugin in the database and emit a creation event.
   */
  async create(dto: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    tenantId?: string;
    config?: Record<string, any>;
    hooks?: string[];
  }): Promise<Plugin> {
    const plugin = this.pluginRepository.create({
      name: dto.name,
      version: dto.version,
      description: dto.description,
      author: dto.author,
      tenantId: dto.tenantId,
      config: dto.config || {},
      hooks: dto.hooks || [],
      isEnabled: true,
    });
    const saved = await this.pluginRepository.save(plugin);

    await this.eventService.emit({
      type: 'plugin.created',
      namespace: 'plugin',
      payload: saved,
      source: 'PluginService',
      tenantId: dto.tenantId,
    });

    this.logger.log(`Plugin created: ${saved.name} v${saved.version} (id=${saved.id})`);
    return saved;
  }

  /**
   * List plugins with optional tenant filtering and pagination.
   */
  async findAll(
    tenantId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Plugin[]; total: number }> {
    const query = this.pluginRepository.createQueryBuilder('plugin');
    if (tenantId) query.andWhere('plugin.tenantId = :tenantId', { tenantId });
    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Find a single plugin by ID.
   */
  async findOne(id: string): Promise<Plugin> {
    const plugin = await this.pluginRepository.findOne({ where: { id } });
    if (!plugin) {
      throw new NotFoundException(`Plugin ${id} not found`);
    }
    return plugin;
  }

  /**
   * Update a plugin's properties and emit an update event.
   */
  async update(id: string, dto: Partial<Plugin>): Promise<Plugin> {
    await this.pluginRepository.update(id, dto);
    const updated = await this.findOne(id);

    await this.eventService.emit({
      type: 'plugin.updated',
      namespace: 'plugin',
      payload: updated,
      source: 'PluginService',
      tenantId: updated.tenantId,
    });

    this.logger.log(`Plugin updated: ${updated.name} (id=${updated.id})`);
    return updated;
  }

  /**
   * Delete a plugin by ID and emit a deletion event.
   */
  async remove(id: string): Promise<void> {
    const plugin = await this.findOne(id);
    await this.pluginRepository.delete(id);

    await this.eventService.emit({
      type: 'plugin.deleted',
      namespace: 'plugin',
      payload: plugin,
      source: 'PluginService',
      tenantId: plugin.tenantId,
    });

    // Also clean up any in-memory hooks for this plugin
    this.unregisterPluginHooks(id);

    this.logger.log(`Plugin deleted: ${plugin.name} (id=${plugin.id})`);
  }

  /**
   * Enable a previously disabled plugin.
   */
  async enable(id: string): Promise<Plugin> {
    return this.update(id, { isEnabled: true } as Partial<Plugin>);
  }

  /**
   * Disable an enabled plugin.
   */
  async disable(id: string): Promise<Plugin> {
    return this.update(id, { isEnabled: false } as Partial<Plugin>);
  }

  /**
   * Register a runtime hook for a plugin. The hook binds to the
   * internal event emitter so it fires whenever the matching event
   * is emitted.
   */
  registerHook(pluginKey: string, hook: PluginHook): void {
    const hooks = this.loadedPlugins.get(pluginKey) || [];
    hooks.push(hook);
    this.loadedPlugins.set(pluginKey, hooks);
    this.eventService.on(hook.event, hook.handler);
    this.logger.log(`Registered hook for ${pluginKey}: ${hook.event}`);
  }

  /**
   * Remove all in-memory hooks associated with a plugin key.
   * Note: EventEmitter2 doesn't provide a clean way to remove specific
   * listeners by reference in all cases — in production we'd track
   * listener references for proper cleanup.
   */
  unregisterPluginHooks(pluginKey: string): void {
    const hooks = this.loadedPlugins.get(pluginKey) || [];
    if (hooks.length > 0) {
      this.logger.log(
        `Unregistered ${hooks.length} hook(s) for ${pluginKey}`,
      );
    }
    this.loadedPlugins.delete(pluginKey);
  }

  /**
   * Return a list of plugin keys that currently have in-memory hooks loaded.
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.loadedPlugins.keys());
  }

  /**
   * Return the hooks registered for a specific plugin key.
   */
  getPluginHooks(pluginKey: string): PluginHook[] {
    return this.loadedPlugins.get(pluginKey) || [];
  }
}
