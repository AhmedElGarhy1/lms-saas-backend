import { IsUUID, IsEnum, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class CashDepositDto {
  @ApiProperty({
    description: 'Branch ID (where the cash deposit is recorded)',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToBranch(Branch)
  branchId: string;

  @ApiProperty({
    description: 'Deposit amount',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Student profile ID (who is paying the cash)',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(UserProfile)
  payerProfileId: string;

  @ApiProperty({
    description: 'Idempotency key (UUID or string) to prevent duplicate deposits',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

