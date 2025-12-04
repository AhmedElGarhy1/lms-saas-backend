import { IsEnum, IsNumber, Min, ValidateIf } from 'class-validator';
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
    description:
      'Count (required for SESSION, HOUR, and MONTH, ignored for CLASS)',
    example: 10,
    minimum: 1,
    required: false,
  })
  @ValidateIf(
    (o: StudentPaymentStrategyDto) => o.per !== StudentPaymentUnit.CLASS,
  )
  @IsNumber()
  @Min(1)
  count?: number;

  @ApiProperty({
    description: 'Amount (per unit for SESSION/HOUR/MONTH, total for CLASS)',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
