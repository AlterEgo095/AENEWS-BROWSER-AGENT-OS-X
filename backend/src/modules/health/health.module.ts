import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AgentHealthIndicator } from './health.indicator';
import { InfrastructureHealthIndicator } from './infrastructure-health.indicator';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
  ],
  controllers: [HealthController],
  providers: [HealthService, AgentHealthIndicator, InfrastructureHealthIndicator],
  exports: [HealthService, AgentHealthIndicator, InfrastructureHealthIndicator],
})
export class HealthModule {}
