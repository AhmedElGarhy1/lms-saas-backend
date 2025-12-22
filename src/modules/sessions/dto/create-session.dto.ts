import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
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
    description: 'Session start time (ISO 8601 format)',
    example: '2024-01-15T14:30:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Session end time (ISO 8601 format)',
    example: '2024-01-15T16:30:00Z',
  })
  @IsDateString()
  endTime: string;
}
