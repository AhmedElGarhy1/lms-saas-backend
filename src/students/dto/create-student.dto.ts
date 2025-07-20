import { IsEmail, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentGrade } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ description: 'Student email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Student full name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Student password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Student grade level', enum: StudentGrade })
  @IsEnum(StudentGrade)
  grade: StudentGrade;

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

  @ApiPropertyOptional({ description: 'Center ID to add student to' })
  @IsOptional()
  @IsString()
  centerId?: string;

  @ApiPropertyOptional({ description: 'Student performance score' })
  @IsOptional()
  performanceScore?: number;

  @ApiPropertyOptional({ description: 'Additional notes about the student' })
  @IsOptional()
  @IsString()
  notes?: string;
}
