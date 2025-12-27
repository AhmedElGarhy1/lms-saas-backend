import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Wallet } from '../entities/wallet.entity';

export class TransferWalletDto {
  @ApiProperty({
    description: 'From wallet ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(Wallet)
  fromWalletId: string;

  @ApiProperty({
    description: 'To wallet ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(Wallet)
  toWalletId: string;

  @ApiProperty({
    description: 'Transfer amount',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}

