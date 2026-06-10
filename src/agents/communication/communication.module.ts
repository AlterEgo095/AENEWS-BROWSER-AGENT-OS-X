/**
 * AENEWS Agent OS X - Communication Module
 * Provides inter-agent communication and message broker services.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterAgentCommService } from './inter-agent-comm.service';
import { MessageBrokerService } from './message-broker.service';
import { EventsModule } from '../events/events.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';

@Module({
  imports: [ConfigModule, EventsModule, AgentRegistryModule],
  providers: [InterAgentCommService, MessageBrokerService],
  exports: [InterAgentCommService, MessageBrokerService],
})
export class CommunicationModule {}
