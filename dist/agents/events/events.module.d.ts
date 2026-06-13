import { OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
export declare class EventsModuleInitializer implements OnModuleInit {
    private readonly eventBus;
    private readonly deadLetterQueue;
    constructor(eventBus: EventBusService, deadLetterQueue: DeadLetterQueueService);
    onModuleInit(): Promise<void>;
}
export declare class EventsModule {
}
