import { IsNumber, IsPositive, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BranchWalletWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw from branch wallet (in EGP)',
    example: 500.00,
    minimum: 0.01,
    maximum: 100000.00,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01, { message: 'Minimum withdrawal amount is 0.01 EGP' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Optional notes for the withdrawal',
    example: 'Office supplies purchase',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
