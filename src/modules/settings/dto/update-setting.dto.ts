import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Fees percentage (e.g., 2.5 for 2.5%)',
    example: 2.5,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fees: number;

  @ApiProperty({
    description: 'Maximum debit amount in EGP',
    example: 1000.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDebit: number;

  @ApiProperty({
    description:
      'Maximum allowed negative balance for wallets when deducting system fees from cash payments (in EGP)',
    example: 1000.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxNegativeBalance: number;
}
