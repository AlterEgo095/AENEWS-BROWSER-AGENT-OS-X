/**
 * AENEWS Agent OS X - Gateway Module
 * Provides the Memory Gateway, Security Gateway, and Documentation Gateway.
 * All agents must route through these gateways for memory, security, and docs.
 */

import { Module } from '@nestjs/common';
import { MemoryGatewayService } from './memory/memory-gateway.service';
import { SecurityGatewayService } from './security/security-gateway.service';
import { DocumentationGeneratorService } from './documentation/documentation-generator.service';

@Module({
  providers: [MemoryGatewayService, SecurityGatewayService, DocumentationGeneratorService],
  exports: [MemoryGatewayService, SecurityGatewayService, DocumentationGeneratorService],
})
export class GatewayModule {}
