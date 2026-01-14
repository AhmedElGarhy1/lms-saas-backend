import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from '../enums/payout-status.enum';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';

export class UpdatePayoutStatusDto {
  @ApiProperty({
    description: 'New payout status',
    enum: PayoutStatus,
    example: PayoutStatus.PAID,
  })
  @IsEnum(PayoutStatus)
  status: PayoutStatus;

  @ApiProperty({
    description: 'Payment method (required when approving payout to PAID)',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  paymentId?: string; // Internal field for storing payment transaction ID
}
