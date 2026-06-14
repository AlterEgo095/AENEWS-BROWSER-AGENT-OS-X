import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get system info' })
  getInfo() {
    return this.appService.getSystemInfo();
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  getVersion() {
    return this.appService.getVersion();
  }
}
