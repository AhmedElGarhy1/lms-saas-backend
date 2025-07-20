import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateGroupRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  centerId: z.string().min(1),
  gradeLevelId: z.string().optional(),
  maxStudents: z.number().optional(),
});
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;

export class CreateGroupRequestDto {
  @ApiProperty({ example: 'Class 6A', description: 'Name of the group' })
  name: string;

  @ApiProperty({ example: 'Primary 6 Section A', required: false })
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
    example: 30,
    required: false,
    description: 'Maximum number of students',
  })
  maxStudents?: number;
}
