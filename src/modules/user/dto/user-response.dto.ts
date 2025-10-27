import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type, Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User email' })
  @Expose()
  email?: string;

  @ApiProperty({ description: 'User phone' })
  @Expose()
  phone?: string;

  @ApiProperty({ description: 'User name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Number of failed login attempts' })
  @Expose()
  failedLoginAttempts: number;

  @ApiProperty({ description: 'Lockout until date', required: false })
  @Expose()
  @Type(() => Date)
  lockoutUntil?: Date;

  @ApiProperty({
    description: 'Two-factor authentication secret',
    required: false,
  })
  @Expose()
  twoFactorSecret?: string;

  @ApiProperty({ description: 'Whether two-factor authentication is enabled' })
  @Expose()
  twoFactorEnabled: boolean;

  // Profile ID removed - use /users/:id/profile endpoint for profile data

  @ApiProperty({ description: 'Whether the user is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user is accessible to the target profile',
  })
  @Expose()
  isProfileAccessible?: boolean;

  @ApiProperty({
    description: 'User profiles',
  })
  @Exclude()
  userProfiles: UserProfile[];

  @ApiProperty({
    description: 'User profiles',
  })
  @Expose()
  userProfile: UserProfile;

  @ApiProperty({ description: 'Whether the user has center access' })
  @Expose()
  isCenterAccessible?: boolean;

  @ApiProperty({ description: 'Whether the user has role access' })
  @Expose()
  isRoleAccessible?: boolean;

  @ApiProperty({ description: 'Whether the user has branch access' })
  @Expose()
  isBranchAccessible?: boolean;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Updated by user ID', required: false })
  @Expose()
  updatedBy?: string;

  @ApiProperty({ description: 'Deleted by user ID', required: false })
  @Expose()
  deletedBy?: string;

  @ApiProperty({ description: 'Deletion date', required: false })
  @Expose()
  @Type(() => Date)
  deletedAt?: Date;

  @ApiProperty({ description: 'User role' })
  @Expose()
  @Type(() => RoleResponseDto)
  role?: RoleResponseDto;

  // Exclude userRoles from response - we only want the single role
  @Exclude()
  userRoles?: any[];
}
