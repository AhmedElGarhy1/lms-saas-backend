import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { IsoUtcDate } from '@/shared/common/decorators/is-iso-datetime.decorator';
import { Group } from '@/modules/classes/entities/group.entity';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Group ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId: string;

  @ApiPropertyOptional({
    description: 'Session title/topic name',
    example: 'Organic Chemistry Intro',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description:
      'Session start time (ISO 8601 format with timezone, e.g., 2024-01-15T14:30:00+02:00)',
    example: '2024-01-15T14:30:00+02:00',
    type: Date,
  })
  @IsoUtcDate()
  startTime: Date;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 120,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  duration: number;
}
