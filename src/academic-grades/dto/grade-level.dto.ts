import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GradeLevelDto {
  @ApiProperty({ example: 'grade-uuid', description: 'Grade level ID' })
  id: string;

  @ApiProperty({ example: 'Primary 6', description: 'Name of the grade level' })
  name: string;

  @ApiProperty({
    example: 'Final year of primary school',
    description: 'Description of the grade level',
  })
  description: string;

  @ApiProperty({ example: 6, description: 'Numeric rank for sorting' })
  level: number;

  @ApiProperty({
    example: 'center-uuid',
    description: 'Center ID if grade is center-specific',
  })
  centerId: string;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Creation date',
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-07-17T12:34:56.789Z',
    description: 'Last update date',
  })
  updatedAt: string;
}
