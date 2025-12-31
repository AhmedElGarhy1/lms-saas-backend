import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators';
import { Payment } from '../entities/payment.entity';

export class PaymentIdParamDto {
  @ApiProperty({
    description: 'Payment ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(Payment)
  id: string;
}
