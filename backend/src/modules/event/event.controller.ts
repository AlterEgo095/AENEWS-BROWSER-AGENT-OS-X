import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventService, EventPayload } from './event.service';
import { EventSeverity } from './entities/event.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
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
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emit a new event' })
  async emit(@Body() dto: EmitEventDto) {
    return this.eventService.emit(dto as EventPayload);
  }

  @Get()
  @ApiOperation({ summary: 'List events with optional filters' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('namespace') namespace?: string,
    @Query('type') type?: string,
    @Query('tenantId') tenantId?: string,
    @Query('severity') severity?: EventSeverity,
  ) {
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
  @ApiOperation({ summary: 'Get event by ID' })
  async findOne(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }
}
