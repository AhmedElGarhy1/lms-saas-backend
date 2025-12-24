import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleItemDto } from './schedule-item.dto';

export class UpdateGroupDto {
  @ApiProperty({
    description: 'Group name (optional)',
    example: 'Sat 5PM Batch',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Schedule items (optional)',
    type: [ScheduleItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  scheduleItems?: ScheduleItemDto[];

  @ApiPropertyOptional({
    description:
      'Skip student conflict warnings. If true, student schedule conflicts will be ignored and operation will proceed.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipWarning?: boolean;
}
