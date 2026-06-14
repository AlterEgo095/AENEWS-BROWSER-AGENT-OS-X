import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { AuditLog } from './entities/audit-log.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { EventModule } from '../event/event.module';
import { TenantIsolationMiddleware } from './tenant-isolation.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, AuditLog]), EventModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {
  /**
   * Register TenantIsolationMiddleware for all routes.
   * This runs AFTER the JwtAuthGuard, so req.user is already populated.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantIsolationMiddleware).forRoutes('*');
  }
}
