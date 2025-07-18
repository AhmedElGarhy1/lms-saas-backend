import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { StudentGrade } from '@prisma/client';

export class QueryStudentsDto {
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filter by center ID',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filter by teacher ID',
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({ enum: StudentGrade, description: 'Filter by grade' })
  @IsEnum(StudentGrade)
  @IsOptional()
  grade?: StudentGrade;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
