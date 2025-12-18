import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Notification } from '../entities/notification.entity';

export class NotificationIdParamDto {
  @ApiProperty({
    description: 'Notification ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Notification)
  id: string;
}
