import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsInt, Min } from 'class-validator';

export class QuerySessionsDto {
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filter by teacher ID',
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

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
    description: 'Filter by group ID',
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filter by subject ID',
  })
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (inclusive)',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (inclusive)',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

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
