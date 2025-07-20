import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const AssignTeacherRequestSchema = z.object({
  teacherId: z.string().min(1),
});
export type AssignTeacherRequest = z.infer<typeof AssignTeacherRequestSchema>;

export class AssignTeacherRequestDto {
  @ApiProperty({ description: 'Teacher ID', example: 'teacher-uuid' })
  teacherId: string;
}
