/**
 * AENEWS Agent OS X - Business Team Module
 *
 * Provides marketing, SEO, strategy, and analytics capabilities.
 */

import { Module } from '@nestjs/common';
import { BusinessTeamService } from './business-team.service';

@Module({
  providers: [BusinessTeamService],
  exports: [BusinessTeamService],
})
export class BusinessTeamModule {}
