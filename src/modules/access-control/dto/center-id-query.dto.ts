import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CenterIdQueryDto {
  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsString()
  centerId?: string;
}
