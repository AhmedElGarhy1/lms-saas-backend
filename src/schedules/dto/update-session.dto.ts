import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  Validate,
} from 'class-validator';
import { ValidateStartBeforeEnd } from './validate-start-before-end';

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Teacher ID',
    type: String,
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

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

  @ApiPropertyOptional({
    description: 'Session start time',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule (e.g., weekly, iCal RRULE)',
  })
  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Is session cancelled', default: false })
  @IsBoolean()
  @IsOptional()
  isCancelled?: boolean;

  @Validate(ValidateStartBeforeEnd)
  validateTimes?: boolean;
}
