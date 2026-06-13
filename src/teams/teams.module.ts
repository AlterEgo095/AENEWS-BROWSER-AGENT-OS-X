/**
 * AENEWS Agent OS X - Teams Module
 *
 * Aggregates all specialised team sub-modules:
 *   - BrowserTeamModule       — Web research, scraping, navigation
 *   - DevelopmentTeamModule   — Code generation, build, testing
 *   - BusinessTeamModule      — Marketing, SEO, strategy, analytics
 *   - MemoryTeamModule        — Context management, RAG, knowledge graph
 *   - CertificationTeamModule — Quality assurance, compliance, validation
 *   - DeliveryTeamModule      — Packaging, deployment, documentation
 */

import { Module } from '@nestjs/common';
import { BrowserTeamModule } from './browser-team/browser-team.module';
import { DevelopmentTeamModule } from './development-team/development-team.module';
import { BusinessTeamModule } from './business-team/business-team.module';
import { MemoryTeamModule } from './memory-team/memory-team.module';
import { CertificationTeamModule } from './certification-team/certification-team.module';
import { DeliveryTeamModule } from './delivery-team/delivery-team.module';

@Module({
  imports: [
    BrowserTeamModule,
    DevelopmentTeamModule,
    BusinessTeamModule,
    MemoryTeamModule,
    CertificationTeamModule,
    DeliveryTeamModule,
  ],
  exports: [
    BrowserTeamModule,
    DevelopmentTeamModule,
    BusinessTeamModule,
    MemoryTeamModule,
    CertificationTeamModule,
    DeliveryTeamModule,
  ],
})
export class TeamsModule {}
