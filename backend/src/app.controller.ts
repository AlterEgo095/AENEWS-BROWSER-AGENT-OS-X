import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get system info' })
  getInfo() {
    return this.appService.getSystemInfo();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  getVersion() {
    return this.appService.getVersion();
  }
}
