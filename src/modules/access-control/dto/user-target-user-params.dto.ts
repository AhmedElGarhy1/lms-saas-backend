import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserTargetUserParamsDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsString()
  centerId?: string;
}
