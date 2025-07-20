import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateGradeLevelRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  level: z.number().optional(),
  centerId: z.string().optional(),
});
export type CreateGradeLevelRequest = z.infer<
  typeof CreateGradeLevelRequestSchema
>;

export class CreateGradeLevelRequestDto {
  @ApiProperty({ example: 'Primary 6', description: 'Name of the grade level' })
  name: string;

  @ApiProperty({ example: 'Final year of primary school', required: false })
  description?: string;

  @ApiProperty({
    example: 6,
    required: false,
    description: 'Numeric rank for sorting',
  })
  level?: number;

  @ApiProperty({
    example: 'center-uuid',
    required: false,
    description: 'Center ID if grade is center-specific',
  })
  centerId?: string;
}
