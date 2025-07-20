import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const UpdateGroupRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  gradeLevelId: z.string().optional(),
  maxStudents: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;

export class UpdateGroupRequestDto {
  @ApiProperty({ example: 'Class 6A', required: false })
  name?: string;

  @ApiProperty({ example: 'Primary 6 Section A', required: false })
  description?: string;

  @ApiProperty({ example: 'grade-uuid', required: false })
  gradeLevelId?: string;

  @ApiProperty({ example: 30, required: false })
  maxStudents?: number;

  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}
