import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const GradeLevelResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  level: z.number(),
  centerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GradeLevelResponse = z.infer<typeof GradeLevelResponseSchema>;

export class GradeLevelResponseDto {
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
