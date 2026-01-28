import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletTopupDto {
  @ApiProperty({
    description: 'Top-up amount',
    example: 100.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description:
      'Idempotency key (UUID or string) to prevent duplicate top-ups',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
