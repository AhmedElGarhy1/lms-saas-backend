import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../enums/payment-status.enum';

export class UpdatePaymentDto {
  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
    required: true,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({
    description: 'Reason for status change (required for admin overrides)',
    example: 'Accounting correction - refund processed incorrectly',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
