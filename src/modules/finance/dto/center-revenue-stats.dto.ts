import { ApiProperty } from '@nestjs/swagger';
import { Money } from '@/shared/common/utils/money.util';
import { DateRangeDto } from '@/shared/common/dto/date-range.dto';

export class CenterRevenueBranchDetailDto {
  @ApiProperty({ description: 'Branch ID' })
  branchId: string;

  @ApiProperty({ description: 'Branch name (city)' })
  branchName: string;

  @ApiProperty({
    description: 'Cashbox balance for this branch',
    type: () => Money,
  })
  cashbox: Money;

  @ApiProperty({
    description: 'Wallet balance for this branch',
    type: () => Money,
  })
  wallet: Money;
}

export class CenterTreasuryStatsDto {
  @ApiProperty({
    description: 'Total revenue across all branches',
    type: () => Money,
  })
  total: Money;

  @ApiProperty({
    description: 'Total cashbox balance across all branches',
    type: () => Money,
  })
  cashbox: Money;

  @ApiProperty({
    description: 'Total wallet balance across all branches',
    type: () => Money,
  })
  wallet: Money;

  @ApiProperty({
    description: 'Detailed breakdown by branch',
    type: [CenterRevenueBranchDetailDto],
  })
  details: CenterRevenueBranchDetailDto[];
}

import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

export class CenterStatementItemDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'User ID who created the transaction' })
  createdBy: string;

  @ApiProperty({
    description: 'User ID who updated the transaction',
    nullable: true,
  })
  updatedBy?: string;

  @ApiProperty({ description: 'Sender wallet ID', nullable: true })
  fromWalletId?: string;

  @ApiProperty({ description: 'Receiver wallet ID', nullable: true })
  toWalletId?: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Transaction correlation ID' })
  correlationId: string;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter: number;

  @ApiProperty({ description: 'Readable name of the sender', nullable: true })
  fromName?: string;

  @ApiProperty({ description: 'Readable name of the receiver', nullable: true })
  toName?: string;
}

export class CenterCashStatementItemDto {
  @ApiProperty({ description: 'Cash transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Branch ID where transaction occurred' })
  branchId: string;

  @ApiProperty({ description: 'Cashbox ID' })
  cashboxId: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Transaction direction' })
  direction: string;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter: number;

  @ApiProperty({ description: 'Profile ID who paid', nullable: true })
  paidByProfileId?: string;

  @ApiProperty({ description: 'Profile ID who received' })
  receivedByProfileId: string;

  @ApiProperty({ description: 'Readable name of who paid', nullable: true })
  paidByName?: string;

  @ApiProperty({ description: 'Readable name of who received' })
  receivedByName: string;
}

export class UserCashStatementItemDto {
  @ApiProperty({ description: 'Cash transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Branch ID where transaction occurred' })
  branchId: string;

  @ApiProperty({ description: 'Cashbox ID' })
  cashboxId: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: number;

  @ApiProperty({ description: 'Transaction direction' })
  direction: string;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Balance after transaction' })
  balanceAfter: number;

  @ApiProperty({ description: 'Profile ID who paid', nullable: true })
  paidByProfileId?: string;

  @ApiProperty({ description: 'Profile ID who received' })
  receivedByProfileId: string;

  @ApiProperty({ description: 'Readable name of who paid', nullable: true })
  paidByName?: string;

  @ApiProperty({ description: 'Readable name of who received' })
  receivedByName: string;

  @ApiProperty({ description: 'User role in transaction (payer/receiver)' })
  userRole: 'payer' | 'receiver';
}

export class CenterIdParamDto {
  @ApiProperty({
    description: 'Center ID',
    example: 'uuid',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;
}
