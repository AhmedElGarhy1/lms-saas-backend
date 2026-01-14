import {
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentReason } from '../enums/payment-reason.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentReferenceType } from '../enums/payment-reference-type.enum';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Sender ID',
    example: 'uuid',
  })
  @IsUUID(4)
  senderId: string;

  @ApiProperty({
    description: 'Sender type',
    enum: WalletOwnerType,
    example: WalletOwnerType.USER_PROFILE,
  })
  @IsEnum(WalletOwnerType)
  senderType: WalletOwnerType;

  @ApiProperty({
    description: 'Receiver ID',
    example: 'uuid',
  })
  @IsUUID(4)
  receiverId: string;

  @ApiProperty({
    description: 'Receiver type',
    enum: WalletOwnerType,
    example: WalletOwnerType.USER_PROFILE,
  })
  @IsEnum(WalletOwnerType)
  receiverType: WalletOwnerType;

  @ApiProperty({
    description:
      'Payment reason. Only TOPUP and SUBSCRIPTION are allowed from public endpoint. SESSION payments should be created internally by SessionsModule.',
    enum: PaymentReason,
    example: PaymentReason.TOPUP,
    enumName: 'PaymentReason',
  })
  @IsEnum(PaymentReason)
  reason: PaymentReason;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.WALLET,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Reference type (if payment references a transaction)',
    enum: PaymentReferenceType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentReferenceType)
  referenceType?: PaymentReferenceType;

  @ApiProperty({
    description: 'Reference ID (if payment references a transaction)',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @Validate((object: CreatePaymentDto, value: string) => {
    if (!value) return true;
    if (object.referenceType === PaymentReferenceType.TRANSACTION) {
      return true; // Will be validated by custom validator if needed
    }
    if (object.referenceType === PaymentReferenceType.CASH_TRANSACTION) {
      return true; // Will be validated by custom validator if needed
    }
    return true;
  })
  referenceId?: string;

  @ApiProperty({
    description: 'Correlation ID (for split payments)',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  correlationId?: string;

  @ApiProperty({
    description: 'Idempotency key (UUID or string) to prevent duplicate payments',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

