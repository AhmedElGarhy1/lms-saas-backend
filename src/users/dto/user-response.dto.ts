import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

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
) {}
export class UserListResponseDto extends createZodDto(UserListResponseSchema) {}
export class UserStatsResponseDto extends createZodDto(
  UserStatsResponseSchema,
) {}
export class CreateUserResponseDto extends createZodDto(
  CreateUserResponseSchema,
) {}
export class UpdateProfileResponseDto extends createZodDto(
  UpdateProfileResponseSchema,
) {}
export class ChangePasswordResponseDto extends createZodDto(
  ChangePasswordResponseSchema,
) {}
export class ActivateUserResponseDto extends createZodDto(
  ActivateUserResponseSchema,
) {}
