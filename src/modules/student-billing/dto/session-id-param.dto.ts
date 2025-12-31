import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists, BelongsToCenter } from '@/shared/common/decorators';
import { Session } from '@/modules/sessions/entities/session.entity';

export class SessionIdParamDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(Session)
  @BelongsToCenter(Session)
  sessionId: string;
}
