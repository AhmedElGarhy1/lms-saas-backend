import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators';
import { StudentClassSubscription } from '../entities/student-class-subscription.entity';

export class SubscriptionIdParamDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(StudentClassSubscription)
  subscriptionId: string;
}
