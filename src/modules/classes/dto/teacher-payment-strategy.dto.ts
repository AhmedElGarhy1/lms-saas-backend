import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';

export class TeacherPaymentStrategyDto {
  @ApiProperty({
    description: 'Payment unit type',
    enum: TeacherPaymentUnit,
    example: TeacherPaymentUnit.SESSION,
  })
  @IsEnum(TeacherPaymentUnit)
  per: TeacherPaymentUnit;

  @ApiProperty({
    description: 'Amount per unit (or total for CLASS)',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description:
      'Initial payment amount for CLASS payouts (optional, creates payout with initial payment)',
    example: 200.0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialPaymentAmount?: number;

  @ApiProperty({
    description:
      'Payment method for initial payment (required if initialPaymentAmount is provided)',
    enum: PaymentMethod,
    example: PaymentMethod.WALLET,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
