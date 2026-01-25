import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletTransferDto {
  @ApiProperty({
    description: 'Source user profile ID (from which to transfer money)',
    example: 'uuid-from-profile',
  })
  @IsUUID(4)
  fromProfileId: string;

  @ApiProperty({
    description: 'Destination user profile ID (to which to transfer money)',
    example: 'uuid-to-profile',
  })
  @IsUUID(4)
  toProfileId: string;

  @ApiProperty({
    description: 'Transfer amount',
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description:
      'Idempotency key (UUID or string) to prevent duplicate transfers',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
