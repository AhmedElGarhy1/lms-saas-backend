import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateSubjectRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  centerId: z.string().min(1),
  gradeLevelId: z.string().optional(),
  credits: z.number().optional(),
  duration: z.number().optional(),
});
export type CreateSubjectRequest = z.infer<typeof CreateSubjectRequestSchema>;

export class CreateSubjectRequestDto {
  @ApiProperty({ example: 'Mathematics', description: 'Name of the subject' })
  name: string;

  @ApiProperty({
    example: 'Advanced mathematics for primary students',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 'center-uuid', description: 'Center ID' })
  centerId: string;

  @ApiProperty({
    example: 'grade-uuid',
    required: false,
    description: 'Grade level ID',
  })
  gradeLevelId?: string;

  @ApiProperty({
    example: 4,
    required: false,
    description: 'Number of credits',
  })
  credits?: number;

  @ApiProperty({
    example: 60,
    required: false,
    description: 'Duration in minutes',
  })
  duration?: number;
}
