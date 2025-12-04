import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';

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
}
