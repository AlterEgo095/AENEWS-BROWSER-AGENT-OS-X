/**
 * AENEWS Agent OS X - Delivery Team Module
 *
 * Provides packaging, deployment, and documentation capabilities.
 */

import { Module } from '@nestjs/common';
import { DeliveryTeamService } from './delivery-team.service';

@Module({
  providers: [DeliveryTeamService],
  exports: [DeliveryTeamService],
})
export class DeliveryTeamModule {}
