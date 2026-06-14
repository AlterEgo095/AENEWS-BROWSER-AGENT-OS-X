import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../user/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'strongP@ssw0rd' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({ example: 'my-org' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.TENANT_ADMIN })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;
}
