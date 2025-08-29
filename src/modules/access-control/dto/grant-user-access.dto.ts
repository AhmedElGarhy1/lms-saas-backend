import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantUserAccessRequestDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsString()
  centerId?: string;
}
