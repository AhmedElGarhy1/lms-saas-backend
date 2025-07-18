import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { StudentGrade } from '@prisma/client';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Teacher ID if student belongs to a freelance teacher',
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Center ID if student belongs to a center',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiPropertyOptional({
    enum: StudentGrade,
    description: 'Student grade (enum)',
  })
  @IsEnum(StudentGrade)
  @IsOptional()
  grade?: StudentGrade;

  @ApiPropertyOptional({
    description:
      'Academic level or curriculum (e.g. IGCSE, American, National)',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Guardian ID if linked',
  })
  @IsUUID()
  @IsOptional()
  guardianId?: string;

  @ApiPropertyOptional({ description: 'Performance score (float)' })
  @IsNumber()
  @IsOptional()
  performanceScore?: number;

  @ApiPropertyOptional({ description: 'Total sessions attended', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  totalSessionsAttended?: number;

  @ApiPropertyOptional({ description: 'Total payments (float)', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPayments?: number;

  @ApiPropertyOptional({ description: 'Notes about the student' })
  @IsString()
  @IsOptional()
  notes?: string;
}
