/**
 * AENEWS Agent OS X - Health Module
 * Provides agent health monitoring and metrics collection services.
 */

import { Module } from '@nestjs/common';
import { AgentHealthService } from './agent-health.service';
import { AgentMetricsService } from './agent-metrics.service';
import { EventsModule } from '../events/events.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';

@Module({
  imports: [EventsModule, AgentRegistryModule],
  providers: [AgentHealthService, AgentMetricsService],
  exports: [AgentHealthService, AgentMetricsService],
})
export class HealthModule {}
