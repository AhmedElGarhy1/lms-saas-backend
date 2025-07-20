import {
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    description: 'Student grade level',
    enum: StudentGrade,
  })
  @IsOptional()
  @IsEnum(StudentGrade)
  grade?: StudentGrade;

  @ApiPropertyOptional({ description: 'Student level within grade' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ description: 'Guardian ID' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiPropertyOptional({ description: 'Teacher ID (for freelance teachers)' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Student performance score' })
  @IsOptional()
  @IsNumber()
  performanceScore?: number;

  @ApiPropertyOptional({ description: 'Additional notes about the student' })
  @IsOptional()
  @IsString()
  notes?: string;
}
