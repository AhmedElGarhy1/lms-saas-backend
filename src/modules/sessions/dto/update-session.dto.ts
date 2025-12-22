import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: 'Session title/topic name',
    example: 'Organic Chemistry Intro',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Session start time (ISO 8601 format)',
    example: '2024-01-15T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time (ISO 8601 format)',
    example: '2024-01-15T16:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}

