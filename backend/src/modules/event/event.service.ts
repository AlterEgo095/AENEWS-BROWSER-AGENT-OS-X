import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventSeverity } from './entities/event.entity';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

export interface EventPayload {
  type: string;
  namespace: string;
  payload: any;
  source: string;
  severity?: EventSeverity;
  tenantId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventEmitter: EventEmitter2,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Emit an event through all channels:
   * 1. Persist to database
   * 2. Emit locally via EventEmitter2
   * 3. Publish to RabbitMQ for distributed systems
   */
  async emit(event: EventPayload): Promise<Event> {
    // Persist to database
    const entity = this.eventRepository.create({
      type: event.type,
      namespace: event.namespace,
      payload: event.payload,
      source: event.source,
      severity: event.severity || EventSeverity.INFO,
      tenantId: event.tenantId,
      metadata: event.metadata || {},
    });
    const saved = await this.eventRepository.save(entity);

    // Emit locally via EventEmitter2
    const eventKey = `${event.namespace}.${event.type}`;
    this.eventEmitter.emit(eventKey, saved);

    // Publish to RabbitMQ for distributed systems
    try {
      await this.rabbitMQService.publish('system.events', eventKey, saved);
    } catch (error: any) {
      this.logger.warn(`Failed to publish to RabbitMQ: ${error?.message}`);
    }

    return saved;
  }

  /**
   * Register a local event listener via EventEmitter2.
   * The handler will be invoked when an event matching eventKey is emitted
   * within the same process.
   */
  async on(
    eventKey: string,
    handler: (payload: any) => void | Promise<void>,
  ): Promise<void> {
    this.eventEmitter.on(eventKey, handler);
  }

  /**
   * Subscribe to a RabbitMQ queue bound to the system.events exchange.
   * This enables cross-process event consumption for distributed deployments.
   */
  async subscribe(
    eventKey: string,
    queue: string,
    handler: (payload: any) => Promise<void>,
  ): Promise<void> {
    await this.rabbitMQService.subscribe(
      queue,
      'system.events',
      eventKey,
      handler,
    );
  }

  /**
   * Query events with optional filters and pagination.
   */
  async getEvents(filter: {
    namespace?: string;
    type?: string;
    tenantId?: string;
    severity?: EventSeverity;
    page?: number;
    limit?: number;
  }): Promise<{ data: Event[]; total: number }> {
    const { namespace, type, tenantId, severity, page = 1, limit = 20 } = filter;
    const query = this.eventRepository.createQueryBuilder('event');

    if (namespace) query.andWhere('event.namespace = :namespace', { namespace });
    if (type) query.andWhere('event.type = :type', { type });
    if (tenantId) query.andWhere('event.tenantId = :tenantId', { tenantId });
    if (severity) query.andWhere('event.severity = :severity', { severity });

    query.orderBy('event.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Retrieve a single event by its primary key.
   */
  async getEventById(id: string): Promise<Event | null> {
    return this.eventRepository.findOne({ where: { id } });
  }
}
