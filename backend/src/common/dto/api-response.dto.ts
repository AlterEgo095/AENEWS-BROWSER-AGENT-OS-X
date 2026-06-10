import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  errors?: any[];

  @ApiProperty({ required: false })
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
