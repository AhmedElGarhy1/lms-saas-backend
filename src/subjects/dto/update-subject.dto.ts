import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const UpdateSubjectRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  gradeLevelId: z.string().optional(),
  credits: z.number().optional(),
  duration: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSubjectRequest = z.infer<typeof UpdateSubjectRequestSchema>;

export class UpdateSubjectRequestDto {
  @ApiProperty({ example: 'Mathematics', required: false })
  name?: string;

  @ApiProperty({
    example: 'Advanced mathematics for primary students',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 'grade-uuid', required: false })
  gradeLevelId?: string;

  @ApiProperty({ example: 4, required: false })
  credits?: number;

  @ApiProperty({ example: 60, required: false })
  duration?: number;

  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}
