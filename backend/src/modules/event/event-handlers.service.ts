import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventService } from './event.service';

@Injectable()
export class EventHandlersService implements OnModuleInit {
  private readonly logger = new Logger(EventHandlersService.name);

  constructor(private readonly eventService: EventService) {}

  onModuleInit() {
    // ─── Agent lifecycle events ───────────────────────────────────────
    this.eventService.on('agent.created', (payload) => {
      this.logger.log(`Agent created: ${payload.payload?.name}`);
    });

    this.eventService.on('agent.started', (payload) => {
      this.logger.log(`Agent started: ${payload.payload?.name}`);
    });

    this.eventService.on('agent.stopped', (payload) => {
      this.logger.log(`Agent stopped: ${payload.payload?.name}`);
    });

    this.eventService.on('agent.error', (payload) => {
      this.logger.error(
        `Agent error: ${payload.payload?.name} - ${payload.payload?.error}`,
      );
    });

    // ─── Task events ──────────────────────────────────────────────────
    this.eventService.on('task.created', (payload) => {
      this.logger.log(`Task created: ${payload.payload?.type}`);
    });

    this.eventService.on('task.completed', (payload) => {
      this.logger.log(`Task completed: ${payload.payload?.id}`);
    });

    this.eventService.on('task.failed', (payload) => {
      this.logger.error(
        `Task failed: ${payload.payload?.id} - ${payload.payload?.error}`,
      );
    });

    // ─── System events ───────────────────────────────────────────────
    this.eventService.on('system.health', (payload) => {
      this.logger.debug(`Health check: ${payload.payload?.status}`);
    });

    this.logger.log('Event handlers registered');
  }
}
