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

