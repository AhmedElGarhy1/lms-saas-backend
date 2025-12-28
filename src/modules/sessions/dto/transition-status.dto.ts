import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../enums/session-status.enum';

export class TransitionStatusDto {
  @ApiProperty({
    description: 'New session status',
    example: SessionStatus.CHECKING_IN,
    enum: SessionStatus,
  })
  @IsEnum(SessionStatus)
  status: SessionStatus;
}
