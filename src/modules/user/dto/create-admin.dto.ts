import { CreateUserWithRoleDto } from './create-user.dto';

/**
 * DTO for creating admins
 * Extends CreateUserWithRoleDto with admin-specific fields
 */
export class CreateAdminDto extends CreateUserWithRoleDto {
  // Future admin-specific fields will be added here
  // @ApiProperty({ description: 'Admin access level' })
  // @IsOptional()
  // @IsEnum(AdminAccessLevel)
  // accessLevel?: AdminAccessLevel;
  // @ApiProperty({ description: 'Admin department' })
  // @IsOptional()
  // @IsString()
  // department?: string;
}
