/**
 * PDEOS Phase 11 — Infrastructure Controller
 */
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('api/v1/infrastructure')
export class InfrastructureController {
  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async health() {
    return { success: true, data: { status: 'ok', service: 'infrastructure', version: '1.0.0', watchersCount: 30, timestamp: new Date().toISOString() } };
  }
}
