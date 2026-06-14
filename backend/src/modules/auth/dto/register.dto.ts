import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(256)
  email: string;

  @ApiProperty({ example: 'strongP@ssw0rd' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(128)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(128)
  lastName: string;

  @ApiPropertyOptional({ example: 'my-org' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/, {
    message: 'Tenant slug must contain only alphanumeric characters, hyphens, and underscores',
  })
  tenantSlug?: string;

  // SECURITY: Role field is intentionally OMITTED from registration DTO.
  // Users cannot self-assign roles (especially SUPER_ADMIN or TENANT_ADMIN).
  // New registrations always default to VIEWER role.
  // Role changes must go through a separate admin-only endpoint.
}
