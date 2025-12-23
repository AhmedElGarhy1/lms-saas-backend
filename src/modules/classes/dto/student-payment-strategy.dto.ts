import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StudentPaymentUnit } from '../enums/student-payment-unit.enum';

export class StudentPaymentStrategyDto {
  @ApiProperty({
    description: 'Payment unit type',
    enum: StudentPaymentUnit,
    example: StudentPaymentUnit.SESSION,
  })
  @IsEnum(StudentPaymentUnit)
  per: StudentPaymentUnit;

  @ApiProperty({
    description: 'Amount (per unit for SESSION/HOUR/MONTH, total for CLASS)',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
