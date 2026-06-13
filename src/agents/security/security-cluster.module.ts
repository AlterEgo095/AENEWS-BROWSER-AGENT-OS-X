/**
 * AENEWS Agent OS X - Security Cluster Module
 * Aggregates all 6 security agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all security agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { ThreatDetectionAgentService } from './threat-detection/threat-detection-agent.service';
import { AuthenticationAgentService } from './authentication/authentication-agent.service';
import { EncryptionAgentService } from './encryption/encryption-agent.service';
import { AccessControlAgentService } from './access-control/access-control-agent.service';
import { AuditAgentService } from './audit/audit-agent.service';
import { IncidentResponseAgentService } from './incident-response/incident-response-agent.service';

@Module({
  imports: [BaseAgentModule],
  providers: [
    // 1. Threat Detection — scanForThreats, analyzeAnomaly, detectIntrusion, monitorTraffic, assessVulnerability, generateThreatReport
    ThreatDetectionAgentService,
    // 2. Authentication — authenticate, validateToken, manageMFA, configureSSO, revokeAccess, auditAuthEvents
    AuthenticationAgentService,
    // 3. Encryption — encryptData, decryptData, generateKey, manageCertificate, rotateKeys, verifySignature
    EncryptionAgentService,
    // 4. Access Control — grantAccess, revokeAccess, checkPermission, manageRole, auditAccess, definePolicy
    AccessControlAgentService,
    // 5. Audit — performAudit, checkCompliance, analyzeLogs, generateAuditReport, trackChanges, reviewPermissions
    AuditAgentService,
    // 6. Incident Response — createIncident, investigateIncident, containThreat, remediateIssue, generateForensicReport, postMortem
    IncidentResponseAgentService,
  ],
  exports: [
    ThreatDetectionAgentService,
    AuthenticationAgentService,
    EncryptionAgentService,
    AccessControlAgentService,
    AuditAgentService,
    IncidentResponseAgentService,
  ],
})
export class SecurityClusterModule {}
