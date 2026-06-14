import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventService, EventPayload } from './event.service';
import { EventSeverity } from './entities/event.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { TenantScoped } from '../tenant/decorators/tenant-scoped.decorator';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

class EmitEventDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  namespace: string;

  @IsObject()
  payload: any;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsOptional()
  @IsEnum(EventSeverity)
  severity?: EventSeverity;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emit a new event' })
  async emit(@Body() dto: EmitEventDto, @Req() req: Request & { user?: any; tenantId?: string }) {
    // Enforce tenant: non-SUPER_ADMIN must emit events in their own tenant
    const tenantId = req.tenantId ?? dto.tenantId;
    return this.eventService.emit({ ...dto, tenantId } as EventPayload);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List events with optional filters' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('namespace') namespace?: string,
    @Query('type') type?: string,
    @Query('tenantId') tenantIdQueryParam?: string,
    @Query('severity') severity?: EventSeverity,
    @Req() req?: Request & { user?: any; tenantId?: string },
  ) {
    // Tenant isolation: non-SUPER_ADMIN can only see their own tenant's data
    const tenantId = req.tenantId ?? tenantIdQueryParam;
    return this.eventService.getEvents({
      namespace,
      type,
      tenantId,
      severity,
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get event by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.getEventById(id);
  }
}
