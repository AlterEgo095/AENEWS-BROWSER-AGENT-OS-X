/**
 * AENEWS Agent OS X - Certification Team Module
 *
 * Provides quality assurance, compliance, and validation capabilities.
 */

import { Module } from '@nestjs/common';
import { CertificationTeamService } from './certification-team.service';

@Module({
  providers: [CertificationTeamService],
  exports: [CertificationTeamService],
})
export class CertificationTeamModule {}
