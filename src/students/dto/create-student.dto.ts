import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { StudentGrade } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'User ID for the student',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    required: false,
    description: 'Teacher ID if student belongs to a freelance teacher',
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    required: false,
    description: 'Center ID if student belongs to a center',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiProperty({ enum: StudentGrade, description: 'Student grade (enum)' })
  @IsEnum(StudentGrade)
  grade: StudentGrade;

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
