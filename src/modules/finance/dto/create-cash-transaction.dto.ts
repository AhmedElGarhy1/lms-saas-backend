import { IsUUID, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CashTransactionDirection } from '../enums/cash-transaction-direction.enum';
import { CashTransactionType } from '../enums/cash-transaction-type.enum';
import { Exists, IsUserProfile } from '@/shared/common/decorators';
import { Cashbox } from '../entities/cashbox.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class CreateCashTransactionDto {
  @ApiProperty({
    description: 'Branch ID (optional, defaults to actor\'s branch)',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  branchId?: string;

  @ApiProperty({
    description: 'Cashbox ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(Cashbox)
  cashboxId: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 100.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Transaction direction',
    enum: CashTransactionDirection,
    example: CashTransactionDirection.IN,
  })
  @IsEnum(CashTransactionDirection)
  direction: CashTransactionDirection;

  @ApiProperty({
    description: 'Transaction type',
    enum: CashTransactionType,
    example: CashTransactionType.DEPOSIT,
  })
  @IsEnum(CashTransactionType)
  type: CashTransactionType;

  @ApiProperty({
    description: 'Profile ID of the person who received/processed the cash',
    example: 'uuid',
  })
  @IsUUID(4)
  @IsUserProfile(ProfileType.STAFF)
  receivedByProfileId: string;

  @ApiProperty({
    description: 'Profile ID of the person who paid/provided the cash (parent/customer for payments, staff for withdrawals)',
    example: 'uuid',
    required: true,
  })
  @IsUUID(4)
  @IsUserProfile()
  paidByProfileId: string;
}
