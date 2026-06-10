import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserRole } from './entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

class UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  async findAll(@Query() pagination: PaginationDto, @Query('tenantId') tenantId?: string) {
    return this.userService.findAll(tenantId, pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Update password' })
  async updatePassword(@Param('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.userService.updatePassword(id, dto.currentPassword, dto.newPassword);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate user' })
  async activate(@Param('id') id: string) {
    return this.userService.activate(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(@Param('id') id: string) {
    return this.userService.deactivate(id);
  }
}
