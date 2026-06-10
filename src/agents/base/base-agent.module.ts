/**
 * AENEWS Agent OS X - Base Agent Module
 * Provides the base agent service infrastructure and shared providers.
 * All agent modules should import this module to access the event bus,
 * memory service, and other shared infrastructure.
 */

import { Module, Global } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';
import { MemoryService } from '../memory/memory.service';
import { EventsModule } from '../events/events.module';
import { MemoryModule } from '../memory/memory.module';

@Global()
@Module({
  imports: [EventsModule, MemoryModule],
  providers: [],
  exports: [EventsModule, MemoryModule, EventBusService, MemoryService],
})
export class BaseAgentModule {}
