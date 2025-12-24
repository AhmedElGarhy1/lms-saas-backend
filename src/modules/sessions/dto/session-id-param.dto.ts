import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Session } from '../entities/session.entity';

export class SessionIdParamDto {
  @ApiProperty({ description: 'Session ID', type: String })
  @IsUUID(4)
  @Exists(Session)
  sessionId: string;
}
