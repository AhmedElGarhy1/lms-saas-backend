import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

export const UpdateStudentRequestSchema = z.object({
  grade: z.nativeEnum(StudentGrade).optional(),
  level: z.string().optional(),
  guardianId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  performanceScore: z.number().optional(),
  notes: z.string().optional(),
});
export type UpdateStudentRequest = z.infer<typeof UpdateStudentRequestSchema>;

export class UpdateStudentRequestDto {
  @ApiPropertyOptional({
    description: 'Student grade level',
    enum: StudentGrade,
  })
  grade?: StudentGrade;

  @ApiPropertyOptional({ description: 'Student level within grade' })
  level?: string;

  @ApiPropertyOptional({ description: 'Guardian ID' })
  guardianId?: string;

  @ApiPropertyOptional({ description: 'Teacher ID (for freelance teachers)' })
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Student performance score' })
  performanceScore?: number;

  @ApiPropertyOptional({ description: 'Additional notes about the student' })
  notes?: string;
}
