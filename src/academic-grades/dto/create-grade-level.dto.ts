import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGradeLevelDto {
  @ApiProperty({ example: 'Primary 6', description: 'Name of the grade level' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Final year of primary school', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 6,
    required: false,
    description: 'Numeric rank for sorting',
  })
  @IsOptional()
  @IsInt()
  level?: number;

  @ApiProperty({
    example: 'center-uuid',
    required: false,
    description: 'Center ID if grade is center-specific',
  })
  @IsOptional()
  @IsString()
  centerId?: string;
}
