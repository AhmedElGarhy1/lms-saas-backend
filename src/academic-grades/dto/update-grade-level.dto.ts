import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGradeLevelDto {
  @ApiProperty({ example: 'Primary 6', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Final year of primary school', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 6, required: false })
  @IsOptional()
  @IsInt()
  level?: number;

  @ApiProperty({ example: 'center-uuid', required: false })
  @IsOptional()
  @IsString()
  centerId?: string;
}
