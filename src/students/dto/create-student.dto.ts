import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

export const CreateStudentRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  grade: z.nativeEnum(StudentGrade),
  level: z.string().optional(),
  guardianId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  centerId: z.string().optional(),
  performanceScore: z.number().optional(),
  notes: z.string().optional(),
});
export type CreateStudentRequest = z.infer<typeof CreateStudentRequestSchema>;

export class CreateStudentRequestDto {
  @ApiProperty({ description: 'Student email address' })
  email: string;

  @ApiProperty({ description: 'Student full name' })
  name: string;

  @ApiProperty({ description: 'Student password' })
  password: string;

  @ApiProperty({ description: 'Student grade level', enum: StudentGrade })
  grade: StudentGrade;

  @ApiPropertyOptional({ description: 'Student level within grade' })
  level?: string;

  @ApiPropertyOptional({ description: 'Guardian ID' })
  guardianId?: string;

  @ApiPropertyOptional({ description: 'Teacher ID (for freelance teachers)' })
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Center ID to add student to' })
  centerId?: string;

  @ApiPropertyOptional({ description: 'Student performance score' })
  performanceScore?: number;

  @ApiPropertyOptional({ description: 'Additional notes about the student' })
  notes?: string;
}
