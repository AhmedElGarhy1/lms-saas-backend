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
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { Class } from '../entities/class.entity';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @HasBranchAccessViaResource(Class)
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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  scheduleItems: ScheduleItemDto[];
}
