import { OmitType } from '@nestjs/swagger';
import { CreateUserProfileDto } from './create-user-profile.dto';

/**
 * Update User Profile DTO for PUT requests
 * Extends CreateUserProfileDto but:
 * - Omits password (password updates should use separate endpoint)
 * - Omits profileType (profile type cannot be changed after creation)
 * - All other fields are required (PUT is full replacement)
 */
export class UpdateUserProfileDto extends OmitType(CreateUserProfileDto, [
  'password',
  'profileType',
] as const) {}
