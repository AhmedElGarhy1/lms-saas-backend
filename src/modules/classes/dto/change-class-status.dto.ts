import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClassStatus } from '../enums/class-status.enum';

export class ChangeClassStatusDto {
  @ApiProperty({
    description: 'New status for the class',
    enum: ClassStatus,
    example: ClassStatus.ACTIVE,
  })
  @IsEnum(ClassStatus)
  status: ClassStatus;

  @ApiPropertyOptional({
    description:
      'Reason for the status change (recommended for CANCELED and PAUSED transitions)',
    example: 'Class paused due to holiday break',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
