/**
 * AENEWS Agent OS X - Queues Module
 *
 * Registers all Bull queue processors and queue definitions.
 * Uses the existing BullModule.forRootAsync() from AppModule.
 *
 * Queues:
 *   - mission:queue  — async mission execution (concurrency: 3)
 *   - task:queue     — agent task execution (concurrency: 5)
 *   - event:queue    — event processing & replay (concurrency: 5)
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MissionQueueProcessor } from './mission-queue.processor';
import { TaskQueueProcessor } from './task-queue.processor';
import { EventQueueProcessor } from './event-queue.processor';
import { SoftwareFactoryModule } from '../software-factory/software-factory.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { EventsModule } from '../agents/events/events.module';
import { AgentRegistryModule } from '../agents/registry/agent-registry.module';
import { CommunicationModule } from '../agents/communication/communication.module';

@Module({
  imports: [
    // Register named queues with configuration
    BullModule.registerQueue(
      {
        name: 'mission:queue',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: 600000, // 10 min max per mission
        },
      },
      {
        name: 'task:queue',
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 120000, // 2 min max per task
        },
      },
      {
        name: 'event:queue',
        defaultJobOptions: {
          removeOnComplete: 500,
          removeOnFail: 200,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          timeout: 30000,
        },
      },
    ),

    // Dependencies
    SoftwareFactoryModule,
    RealtimeModule,
    EventsModule,
    AgentRegistryModule,
    CommunicationModule,
  ],
  providers: [
    MissionQueueProcessor,
    TaskQueueProcessor,
    EventQueueProcessor,
  ],
  exports: [],
})
export class QueuesModule {}
