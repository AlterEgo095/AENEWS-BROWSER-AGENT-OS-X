/**
 * AENEWS Agent OS X - Development Team Module
 *
 * Provides code generation, build, testing, and deployment capabilities.
 */

import { Module } from '@nestjs/common';
import { DevelopmentTeamService } from './development-team.service';

@Module({
  providers: [DevelopmentTeamService],
  exports: [DevelopmentTeamService],
})
export class DevelopmentTeamModule {}
