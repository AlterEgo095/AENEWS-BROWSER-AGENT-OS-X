/**
 * AENEWS Agent OS X - Browser Team Module
 *
 * Provides web research, scraping, and browser automation capabilities.
 */

import { Module } from '@nestjs/common';
import { BrowserTeamService } from './browser-team.service';

@Module({
  providers: [BrowserTeamService],
  exports: [BrowserTeamService],
})
export class BrowserTeamModule {}
