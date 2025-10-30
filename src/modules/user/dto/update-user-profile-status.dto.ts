import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserProfileStatusDto {
  @ApiProperty({ description: 'Set profile active status', example: true })
  @IsBoolean()
  isActive: boolean;
}
