import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// User Profile Response Schema
export const UserProfileResponseSchema = z.object({
  id: z.string().describe('User ID'),
  email: z.string().email().describe('User email'),
  name: z.string().describe('User name'),
  isActive: z.boolean().describe('User active status'),
  isEmailVerified: z.boolean().describe('Email verification status'),
  twoFactorEnabled: z.boolean().describe('2FA enabled status'),
  createdAt: z.date().describe('User creation timestamp'),
  updatedAt: z.date().describe('User last update timestamp'),
  profile: z
    .object({
      id: z.string().describe('Profile ID'),
      type: z
        .enum(['TEACHER', 'STUDENT', 'GUARDIAN', 'BASE_USER'])
        .describe('Profile type'),
      teacher: z
        .object({
          id: z.string().describe('Teacher profile ID'),
          biography: z.string().optional().describe('Teacher biography'),
          experienceYears: z
            .number()
            .optional()
            .describe('Years of teaching experience'),
          specialization: z
            .string()
            .optional()
            .describe('Teacher specialization'),
          profileViews: z.number().describe('Number of profile views'),
          rating: z.number().describe('Teacher rating'),
          studentsCount: z.number().describe('Number of students'),
          centersCount: z.number().describe('Number of centers'),
          createdAt: z.date().describe('Teacher profile creation timestamp'),
          updatedAt: z.date().describe('Teacher profile last update timestamp'),
        })
        .optional()
        .describe('Teacher profile data'),
      student: z
        .object({
          id: z.string().describe('Student profile ID'),
          grade: z
            .enum([
              'PRIMARY_1',
              'PRIMARY_2',
              'PRIMARY_3',
              'PRIMARY_4',
              'PRIMARY_5',
              'PRIMARY_6',
              'SECONDARY_1',
              'SECONDARY_2',
              'SECONDARY_3',
              'SECONDARY_4',
              'SECONDARY_5',
              'OTHER',
            ])
            .describe('Student grade'),
          level: z.string().optional().describe('Student level'),
          performanceScore: z.number().optional().describe('Performance score'),
          totalSessionsAttended: z.number().describe('Total sessions attended'),
          totalPayments: z.number().describe('Total payments made'),
          notes: z.string().optional().describe('Additional notes'),
          gradeLevelId: z.string().optional().describe('Grade level ID'),
          createdAt: z.date().describe('Student profile creation timestamp'),
          updatedAt: z.date().describe('Student profile last update timestamp'),
        })
        .optional()
        .describe('Student profile data'),
      guardian: z
        .object({
          id: z.string().describe('Guardian profile ID'),
          phone: z.string().optional().describe('Phone number'),
          relationship: z
            .string()
            .optional()
            .describe('Relationship to student'),
          emergencyContact: z
            .string()
            .optional()
            .describe('Emergency contact information'),
          createdAt: z.date().describe('Guardian profile creation timestamp'),
          updatedAt: z
            .date()
            .describe('Guardian profile last update timestamp'),
        })
        .optional()
        .describe('Guardian profile data'),
    })
    .optional()
    .describe('User profile information'),
});

// User List Response Schema
export const UserListResponseSchema = z.object({
  users: z.array(UserProfileResponseSchema).describe('List of users'),
  total: z.number().describe('Total number of users'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// User Stats Response Schema
export const UserStatsResponseSchema = z.object({
  totalUsers: z.number().describe('Total number of users'),
  activeUsers: z.number().describe('Number of active users'),
  inactiveUsers: z.number().describe('Number of inactive users'),
  verifiedUsers: z.number().describe('Number of email verified users'),
  unverifiedUsers: z.number().describe('Number of email unverified users'),
  teachers: z.number().describe('Number of teachers'),
  students: z.number().describe('Number of students'),
  guardians: z.number().describe('Number of guardians'),
  baseUsers: z.number().describe('Number of base users'),
});

// Create User Response Schema
export const CreateUserResponseSchema = z.object({
  message: z.string().describe('Success message'),
  user: UserProfileResponseSchema.describe('Created user information'),
});

// Update Profile Response Schema
export const UpdateProfileResponseSchema = z.object({
  message: z.string().describe('Success message'),
  user: UserProfileResponseSchema.describe('Updated user information'),
});

// Change Password Response Schema
export const ChangePasswordResponseSchema = z.object({
  message: z.string().describe('Success message'),
});

// Activate User Response Schema
export const ActivateUserResponseSchema = z.object({
  message: z.string().describe('Success message'),
  user: UserProfileResponseSchema.describe('Updated user information'),
});

// Create DTOs using nestjs-zod
export class UserProfileResponseDto extends createZodDto(
  UserProfileResponseSchema,
) {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  declare id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  declare email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  declare name: string;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  declare isActive: boolean;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: true,
  })
  declare isEmailVerified: boolean;

  @ApiProperty({
    description: 'Whether two-factor authentication is enabled',
    example: false,
  })
  declare twoFactorEnabled: boolean;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  declare createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  declare updatedAt: Date;
}

export class UserListResponseDto extends createZodDto(UserListResponseSchema) {
  @ApiProperty({
    description: 'List of users',
    type: [UserProfileResponseDto],
  })
  declare users: UserProfileResponseDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 100,
  })
  declare total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  declare page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  declare limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  declare totalPages: number;
}

export class UserStatsResponseDto extends createZodDto(
  UserStatsResponseSchema,
) {
  @ApiProperty({
    description: 'Total number of users',
    example: 1000,
  })
  declare totalUsers: number;

  @ApiProperty({
    description: 'Number of active users',
    example: 850,
  })
  declare activeUsers: number;

  @ApiProperty({
    description: 'Number of inactive users',
    example: 150,
  })
  declare inactiveUsers: number;

  @ApiProperty({
    description: 'Number of email verified users',
    example: 900,
  })
  declare verifiedUsers: number;

  @ApiProperty({
    description: 'Number of email unverified users',
    example: 100,
  })
  declare unverifiedUsers: number;

  @ApiProperty({
    description: 'Number of teachers',
    example: 200,
  })
  declare teachers: number;

  @ApiProperty({
    description: 'Number of students',
    example: 600,
  })
  declare students: number;

  @ApiProperty({
    description: 'Number of guardians',
    example: 150,
  })
  declare guardians: number;

  @ApiProperty({
    description: 'Number of base users',
    example: 50,
  })
  declare baseUsers: number;
}

export class CreateUserResponseDto extends createZodDto(
  CreateUserResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'User created successfully',
  })
  declare message: string;

  @ApiProperty({
    description: 'Created user information',
    type: UserProfileResponseDto,
  })
  declare user: UserProfileResponseDto;
}

export class UpdateProfileResponseDto extends createZodDto(
  UpdateProfileResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'Profile updated successfully',
  })
  declare message: string;

  @ApiProperty({
    description: 'Updated user information',
    type: UserProfileResponseDto,
  })
  declare user: UserProfileResponseDto;
}

export class ChangePasswordResponseDto extends createZodDto(
  ChangePasswordResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'Password changed successfully',
  })
  declare message: string;
}

export class ActivateUserResponseDto extends createZodDto(
  ActivateUserResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'User activation status updated successfully',
  })
  declare message: string;

  @ApiProperty({
    description: 'Updated user information',
    type: UserProfileResponseDto,
  })
  declare user: UserProfileResponseDto;
}
