import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum } from 'class-validator';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
// Note: Ownership validation is handled in controller/service layer
// since owner can be UserProfile, Center, Branch, etc. with different validation logic

export class WalletOwnerParamsDto {
  @ApiProperty({
    description: 'Owner ID',
    example: 'uuid',
  })
  @IsUUID()
  ownerId: string;

  @ApiProperty({
    description: 'Owner type',
    enum: WalletOwnerType,
    example: WalletOwnerType.USER_PROFILE,
  })
  @IsEnum(WalletOwnerType)
  ownerType: WalletOwnerType;
}
