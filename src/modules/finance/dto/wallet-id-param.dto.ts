import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators';
import { Wallet } from '../entities/wallet.entity';

export class WalletIdParamDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(Wallet)
  walletId: string;
}
