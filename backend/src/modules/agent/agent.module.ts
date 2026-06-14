import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { Execution } from './entities/execution.entity';
import { Task } from '../task/entities/task.entity';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentRegistryService } from './registry/agent-registry.service';
import { AgentRegistryCache } from './registry/agent-registry-cache.service';
import { AgentLifecycleService } from './lifecycle/agent-lifecycle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Execution, Task])],
  controllers: [AgentController],
  providers: [AgentService, AgentRegistryService, AgentRegistryCache, AgentLifecycleService],
  exports: [AgentService, AgentRegistryService, AgentRegistryCache, AgentLifecycleService],
})
export class AgentModule {}
