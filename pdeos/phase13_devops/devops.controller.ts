/**
 * PDEOS Phase 13 — DevOps Controller
 */
import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProjectManagerAgent } from './agents/project-manager/project-manager.agent';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';

@Controller('api/v1/devops')
export class DevOpsController {
  constructor(private pm: ProjectManagerAgent) {}

  @Post('projects')
  @Roles(UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async createProject(@Body() body: { prompt: string; user?: any }) {
    const project = await this.pm.createProject(body.prompt, body.user || { id: 'system', tenantId: 'default' });
    return { success: true, data: project };
  }

  @Get('projects')
  @Roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async list() { return { success: true, data: await this.pm.listProjects() }; }

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async health() {
    return { success: true, data: { status: 'ok', service: 'devops', version: '1.0.0', agentsCount: 25, timestamp: new Date().toISOString() } };
  }
}
