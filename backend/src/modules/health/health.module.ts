import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AgentHealthIndicator } from './health.indicator';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
  ],
  controllers: [HealthController],
  providers: [HealthService, AgentHealthIndicator],
  exports: [HealthService, AgentHealthIndicator],
})
export class HealthModule {}
