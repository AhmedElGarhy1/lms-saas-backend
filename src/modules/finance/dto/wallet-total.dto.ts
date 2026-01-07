import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsUserProfile } from '@/shared/common/decorators';
import { Money } from '@/shared/common/utils/money.util';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';

export class WalletDetailDto {
  @ApiProperty({
    description: 'User profile ID',
    example: 'uuid-1',
  })
  @IsUUID()
  @IsUserProfile()
  userProfileId: string;

  @ApiProperty({
    description: 'User profile type (student, teacher, etc.)',
    example: 'student',
  })
  userProfileType: string;

  @ApiProperty({
    description: 'Wallet owner type',
    enum: WalletOwnerType,
    example: 'USER_PROFILE',
  })
  walletType: WalletOwnerType;

  @ApiProperty({
    description: 'Wallet balance',
    example: { value: '50.75' },
  })
  balance: Money;

}

export class WalletTotalDto {
  @ApiProperty({
    description: 'Total available balance across all user wallets',
    example: { value: '150.75' },
  })
  totalBalance: Money;


  @ApiProperty({
    description: 'Number of wallets included in the total',
    example: 3,
  })
  walletCount: number;

  @ApiProperty({
    description: 'Detailed breakdown by user profile',
    type: [WalletDetailDto],
  })
  details: WalletDetailDto[];
}
