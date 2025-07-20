import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

export const StudentResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teacherId: z.string().optional(),
  centerId: z.string().optional(),
  grade: z.nativeEnum(StudentGrade),
  level: z.string().optional(),
  guardianId: z.string().optional(),
  performanceScore: z.number().optional(),
  totalSessionsAttended: z.number(),
  totalPayments: z.number(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.any().optional(),
  teacher: z.any().optional(),
  center: z.any().optional(),
  guardian: z.any().optional(),
  groups: z.array(z.any()).optional(),
});
export type StudentResponse = z.infer<typeof StudentResponseSchema>;

export class StudentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  teacherId?: string;

  @ApiPropertyOptional()
  centerId?: string;

  @ApiProperty({ enum: StudentGrade })
  grade: StudentGrade;

  @ApiPropertyOptional()
  level?: string;

  @ApiPropertyOptional()
  guardianId?: string;

  @ApiPropertyOptional()
  performanceScore?: number;

  @ApiProperty()
  totalSessionsAttended: number;

  @ApiProperty()
  totalPayments: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: Object })
  user?: any;

  @ApiPropertyOptional({ type: Object })
  teacher?: any;

  @ApiPropertyOptional({ type: Object })
  center?: any;

  @ApiPropertyOptional({ type: Object })
  guardian?: any;

  @ApiPropertyOptional({ type: [Object] })
  groups?: any[];
}
