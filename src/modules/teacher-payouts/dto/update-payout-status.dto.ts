import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from '../enums/payout-status.enum';
import { PaymentSource } from '../entities/teacher-payout-record.entity';

export class UpdatePayoutStatusDto {
  @ApiProperty({
    description: 'New payout status',
    enum: PayoutStatus,
    example: PayoutStatus.PAID,
  })
  @IsEnum(PayoutStatus)
  status: PayoutStatus;

  @ApiProperty({
    description: 'Payment source (required when approving payout to PAID)',
    enum: PaymentSource,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentSource)
  paymentSource?: PaymentSource;

  paymentId?: string; // Internal field for storing payment transaction ID
}
