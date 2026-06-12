/**
 * AENEWS Agent OS X - Events Module
 * Provides all event-related services: event bus, event store,
 * dead letter queue, and event replay.
 * Wires up cross-service dependencies after DI completes.
 */

import { Module, OnModuleInit, Injectable } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventStoreService } from './event-store.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { EventReplayService } from './event-replay.service';

/**
 * Module initializer that wires up cross-service dependencies
 * after dependency injection is complete.
 */
@Injectable()
export class EventsModuleInitializer implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly deadLetterQueue: DeadLetterQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Wire up the dead letter queue's event bus reference
    // This is needed because of the circular dependency between
    // EventBusService and DeadLetterQueueService
    this.deadLetterQueue.setEventBus(this.eventBus);
  }
}

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
    }),
  ],
  providers: [
    EventBusService,
    EventStoreService,
    DeadLetterQueueService,
    EventReplayService,
    EventsModuleInitializer,
  ],
  exports: [EventBusService, EventStoreService, DeadLetterQueueService, EventReplayService],
})
export class EventsModule {}
