import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Wallet } from '../entities/wallet.entity';

export class WalletStatementDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(Wallet)
  walletId: string;
}

export class UserWalletStatementItemDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Sender wallet ID', nullable: true })
  fromWalletId?: string;

  @ApiProperty({ description: 'Receiver wallet ID', nullable: true })
  toWalletId?: string;

  @ApiProperty({ description: 'Transaction amount (always positive)' })
  amount: number;

  @ApiProperty({
    description:
      'Signed transaction amount (negative for outgoing, positive for incoming)',
  })
  signedAmount: number;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter: number;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Transaction correlation ID' })
  correlationId: string;

  @ApiProperty({ description: 'Readable name of the sender', nullable: true })
  fromName?: string;

  @ApiProperty({ description: 'Readable name of the receiver', nullable: true })
  toName?: string;

  @ApiProperty({ description: 'User role in transaction (sender/receiver)' })
  userRole: 'sender' | 'receiver';
}
