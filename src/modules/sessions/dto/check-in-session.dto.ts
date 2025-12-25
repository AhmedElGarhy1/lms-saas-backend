import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { IsSessionId } from '../decorators/is-session-id.decorator';

export class CheckInSessionDto {
  @ApiProperty({
    description:
      'Session ID - either a real session UUID or a virtual session ID (format: virtual|groupId|startTimeISO|scheduleItemId)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    examples: [
      '550e8400-e29b-41d4-a716-446655440000',
      'virtual|550e8400-e29b-41d4-a716-446655440000|2025-01-15T09:00:00.000Z|schedule-item-uuid',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsSessionId()
  sessionId: string;
}


