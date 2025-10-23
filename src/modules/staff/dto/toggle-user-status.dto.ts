import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleUserStatusRequestDto {
  @ApiProperty({ description: 'Whether user should be active or inactive' })
  @IsBoolean()
  isActive: boolean;
}

export class ToggleUserStatusResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Current user status' })
  isActive: boolean;
}
