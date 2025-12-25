import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleItemDto } from './schedule-item.dto';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Class } from '../entities/class.entity';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToBranch(Class)
  classId: string;

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
    description: 'Schedule items',
    type: [ScheduleItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  scheduleItems: ScheduleItemDto[];
}
