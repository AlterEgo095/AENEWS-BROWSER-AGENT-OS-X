/**
 * AENEWS Agent OS X - Certification Controller
 * REST API endpoints for running certifications, checking status,
 * retrieving reports, and running domain-specific certifications.
 *
 * Routes:
 * - GET  /certification/run           — Run full certification suite
 * - GET  /certification/status        — Get last certification status
 * - GET  /certification/report        — Get last certification report
 * - POST /certification/domain/:domain — Run specific domain certification
 */

import { Controller, Get, Post, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CertificationRunnerService } from './certification-runner.service';
import { CertificationDomain, CertificationReport } from './types';

@ApiTags('certification')
@Controller('certification')
export class CertificationController {
  private readonly logger = new Logger(CertificationController.name);

  constructor(private readonly certificationRunner: CertificationRunnerService) {}

  // ─── GET /certification/run ───────────────────────────────────────

  @Get('run')
  @ApiOperation({
    summary: 'Run full certification suite',
    description:
      'Executes all certification domain tests, calculates EQI, ' +
      'and returns a comprehensive certification report.',
  })
  @ApiResponse({
    status: 200,
    description: 'Certification report generated successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'A certification run is already in progress',
  })
  async runFullCertification(): Promise<CertificationReport> {
    this.logger.log('Received request to run full certification');

    try {
      const report = await this.certificationRunner.runFullCertification();
      return report;
    } catch (error) {
      const message = (error as Error).message;

      if (message.includes('already in progress')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'A certification run is already in progress. Please wait for it to complete.',
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }

      this.logger.error(`Certification run failed: ${message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Certification run failed: ${message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── GET /certification/status ────────────────────────────────────

  @Get('status')
  @ApiOperation({
    summary: 'Get last certification status',
    description:
      'Returns the lightweight status of the last certification run, ' +
      'including EQI score, certification level, and approval status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Certification status retrieved',
  })
  async getStatus(): Promise<{
    hasReport: boolean;
    isRunning: boolean;
    eqi?: number;
    level?: string;
    approved?: boolean;
    timestamp?: Date;
  }> {
    const status = this.certificationRunner.getStatus();
    return {
      ...status,
      level: status.level as string | undefined,
    };
  }

  // ─── GET /certification/report ────────────────────────────────────

  @Get('report')
  @ApiOperation({
    summary: 'Get last certification report',
    description:
      'Returns the full certification report from the last run, ' +
      'including all domain results, test details, recommendations, ' +
      'and critical issues.',
  })
  @ApiResponse({
    status: 200,
    description: 'Certification report retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'No certification report available',
  })
  async getReport(): Promise<CertificationReport> {
    const report = this.certificationRunner.getLastReport();

    if (!report) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message:
            'No certification report available. Run a certification first using GET /certification/run',
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return report;
  }

  // ─── POST /certification/domain/:domain ───────────────────────────

  @Post('domain/:domain')
  @ApiOperation({
    summary: 'Run specific domain certification',
    description:
      'Runs the certification test suite for a specific domain only. ' +
      'Available domains: architecture, tests, orchestration, agents, ' +
      'browser, memory, security, performance, documentation.',
  })
  @ApiParam({
    name: 'domain',
    description: 'The certification domain to run',
    enum: CertificationDomain,
  })
  @ApiResponse({
    status: 200,
    description: 'Domain certification result',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid domain specified',
  })
  async runDomainCertification(@Param('domain') domain: string): Promise<{
    domain: CertificationDomain;
    weight: number;
    score: number;
    tests: any[];
    passed: boolean;
    criticalFailures: string[];
  }> {
    this.logger.log(`Received request to run domain certification: ${domain}`);

    // Validate the domain parameter
    const validDomains = Object.values(CertificationDomain);
    if (!validDomains.includes(domain as CertificationDomain)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid domain: '${domain}'. Valid domains: ${validDomains.join(', ')}`,
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.certificationRunner.runDomainCertification(
        domain as CertificationDomain,
      );
      return result;
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Domain certification failed: ${message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Domain certification failed: ${message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
