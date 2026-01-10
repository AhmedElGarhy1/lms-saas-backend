import { IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';

export class PayInstallmentDto {
  @ApiProperty({
    description: 'Installment amount to pay',
    example: 200.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.WALLET,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}