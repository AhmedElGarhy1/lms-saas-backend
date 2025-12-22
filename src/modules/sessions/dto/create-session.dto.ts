import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsInt,
  Min,
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
    description: 'Date for the session (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Session start time (HH:mm format, 24-hour)',
    example: '14:30',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 120,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  duration: number;
}
