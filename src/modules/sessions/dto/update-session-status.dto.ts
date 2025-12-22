import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SessionStatus } from '../enums/session-status.enum';

export class UpdateSessionStatusDto {
  @ApiProperty({
    description: 'New session status',
    enum: SessionStatus,
    example: SessionStatus.CANCELED,
  })
  @IsEnum(SessionStatus)
  status: SessionStatus;
}

