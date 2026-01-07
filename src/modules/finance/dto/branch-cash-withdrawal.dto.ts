import { IsNumber, IsPositive, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BranchCashWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw from branch cashbox (in EGP)',
    example: 200.00,
    minimum: 0.01,
    maximum: 50000.00,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01, { message: 'Minimum withdrawal amount is 0.01 EGP' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Optional notes for the withdrawal',
    example: ' Petty cash for daily expenses',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
