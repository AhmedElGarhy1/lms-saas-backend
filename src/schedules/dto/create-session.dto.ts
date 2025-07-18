import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateStartBeforeEnd } from './validate-start-before-end';

export class CreateSessionDto {
  @ApiProperty({ description: 'Session title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Teacher ID', type: String, format: 'uuid' })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Center ID',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Group ID',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Subject ID',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Grade (if no group)' })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiProperty({
    description: 'Session start time',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Session end time',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule (e.g., weekly, iCal RRULE)',
  })
  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Is session cancelled', default: false })
  @IsBoolean()
  @IsOptional()
  isCancelled?: boolean = false;

  @Validate(ValidateStartBeforeEnd)
  validateTimes?: boolean;
}
