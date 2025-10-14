import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';
import { ActivityType } from '../entities/activity-log.entity';

export class ExportActivityLogsDto extends ExportQueryDto {
  @ApiProperty({
    description: 'Filter by activity type',
    required: false,
    enum: ActivityType,
    example: ActivityType.USER_LOGIN,
  })
  @IsOptional()
  @IsString()
  type?: ActivityType;

  @ApiProperty({
    description: 'Filter by user ID who performed the action',
    required: false,
    example: 'uuid-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Filter by center ID',
    required: false,
    example: 'uuid-456',
  })
  @IsOptional()
  @IsString()
  centerId?: string;

  @ApiProperty({
    description: 'Filter by start date (ISO string)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Filter by end date (ISO string)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by IP address',
    required: false,
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
