import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Whether user is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'User profile information' })
  profile?: {
    phone?: string;
    address?: string;
    dateOfBirth?: Date;
  };

  @ApiProperty({ description: 'User roles' })
  roles?: Array<{
    id: string;
    name: string;
    type: string;
  }>;

  @ApiProperty({ description: 'User permissions' })
  permissions?: string[];

  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update date' })
  updatedAt: Date;
}

export class UserListResponseDto {
  @ApiProperty({ description: 'List of users' })
  data: UserProfileResponseDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class UserStatsResponseDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Number of inactive users' })
  inactiveUsers: number;

  @ApiProperty({ description: 'Number of verified users' })
  verifiedUsers: number;

  @ApiProperty({ description: 'Number of unverified users' })
  unverifiedUsers: number;
}

export class CreateUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class UpdateProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class ActivateUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
