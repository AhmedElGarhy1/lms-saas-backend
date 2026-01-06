import { ApiProperty } from '@nestjs/swagger';

export class MarkAllAbsentResponseDto {
  @ApiProperty({
    description: 'Number of students marked as absent',
    example: 5,
  })
  markedCount: number;

  @ApiProperty({
    description: 'Session ID',
    example: 'uuid-session-id',
  })
  sessionId: string;
}
