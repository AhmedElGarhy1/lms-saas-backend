import { CreateUserWithRoleDto } from './create-user.dto';

/**
 * DTO for creating staff members
 * Extends CreateUserWithRoleDto with staff-specific fields
 */
export class CreateStaffDto extends CreateUserWithRoleDto {
  // Future staff-specific fields will be added here
  // @ApiProperty({ description: 'Staff department' })
  // @IsOptional()
  // @IsString()
  // department?: string;
  // @ApiProperty({ description: 'Staff position' })
  // @IsOptional()
  // @IsString()
  // position?: string;
}
