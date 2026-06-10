import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService, AppInfo } from './app.service';

@ApiTags('default')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Returns application metadata',
    type: Object,
  })
  getInfo(): AppInfo {
    return this.appService.getInfo();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get application status' })
  @ApiResponse({
    status: 200,
    description: 'Returns application status',
  })
  getStatus(): { status: string; timestamp: string; uptime: number } {
    return this.appService.getHealthStatus();
  }
}
