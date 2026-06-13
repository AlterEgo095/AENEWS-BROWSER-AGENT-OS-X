import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { AuditLog } from './entities/audit-log.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { EventModule } from '../event/event.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, AuditLog]), EventModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
