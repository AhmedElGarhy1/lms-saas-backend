import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

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
