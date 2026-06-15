import { Controller, Get, Put, Param, Body, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserRole } from './entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { TenantScoped } from '../tenant/decorators/tenant-scoped.decorator';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
@TenantScoped()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'List users' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('tenantId') tenantIdQueryParam?: string,
    @Req() req?: Request & { user?: any; tenantId?: string },
  ) {
    // Tenant isolation: non-SUPER_ADMIN can only see their own tenant's users
    const tenantId = req?.tenantId ?? tenantIdQueryParam;
    return this.userService.findAll(tenantId, pagination.page, pagination.limit);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Update password' })
  async updatePassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePasswordDto) {
    return this.userService.updatePassword(id, dto.currentPassword, dto.newPassword);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate user' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.activate(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deactivate(id);
  }
}
