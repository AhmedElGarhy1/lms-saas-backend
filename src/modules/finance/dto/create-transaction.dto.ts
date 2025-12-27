import { IsUUID, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../enums/transaction-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Wallet } from '../entities/wallet.entity';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'From wallet ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @Exists(Wallet)
  fromWalletId?: string;

  @ApiProperty({
    description: 'To wallet ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @Exists(Wallet)
  toWalletId?: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.INTERNAL_TRANSFER,
  })
  @IsEnum(TransactionType)
  type: TransactionType;
}

