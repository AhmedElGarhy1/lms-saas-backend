import { PartialType, OmitType } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Update User DTO
 * Reuses CreateUserDto but:
 * - Omits password (password updates use separate endpoint)
 * - Makes all fields optional (PartialType)
 * - Removes @NotExists decorator from phone (validated in service layer to exclude current user)
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiProperty({ description: 'User phone number', required: false })
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  // Note: @NotExists is intentionally omitted - phone uniqueness is validated in service layer
  phone?: string;
}
