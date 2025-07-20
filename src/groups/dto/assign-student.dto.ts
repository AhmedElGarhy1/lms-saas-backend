import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const AssignStudentRequestSchema = z.object({
  studentId: z.string().min(1),
});
export type AssignStudentRequest = z.infer<typeof AssignStudentRequestSchema>;

export class AssignStudentRequestDto {
  @ApiProperty({ description: 'Student ID', example: 'student-uuid' })
  studentId: string;
}
