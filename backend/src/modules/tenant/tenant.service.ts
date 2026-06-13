import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { EventService } from '../event/event.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly eventService: EventService,
  ) {}

  async create(dto: { name: string; slug: string; plan?: string; config?: Record<string, any> }): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      name: dto.name,
      slug: dto.slug,
      plan: dto.plan || 'free',
      config: dto.config || {},
    });
    const saved = await this.tenantRepository.save(tenant);
    await this.eventService.emit({
      type: 'tenant.created',
      namespace: 'tenant',
      payload: saved,
      source: 'TenantService',
      tenantId: saved.id,
    });
    return saved;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Tenant[]; total: number }> {
    const [data, total] = await this.tenantRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async update(id: string, dto: Partial<Tenant>): Promise<Tenant> {
    await this.tenantRepository.update(id, dto);
    const updated = await this.findOne(id);
    await this.eventService.emit({
      type: 'tenant.updated',
      namespace: 'tenant',
      payload: updated,
      source: 'TenantService',
      tenantId: id,
    });
    return updated;
  }

  async activate(id: string): Promise<Tenant> {
    return this.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<Tenant> {
    return this.update(id, { isActive: false });
  }

  async updateQuotas(id: string, quotas: { maxAgents?: number; maxTasks?: number; maxStorage?: number; maxConcurrentExecutions?: number }): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.quotas = { ...tenant.quotas, ...quotas };
    return this.tenantRepository.save(tenant);
  }
}
