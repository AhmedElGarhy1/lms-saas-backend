import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Guardian Response Schema (User-Centric)
export const GuardianResponseSchema = z.object({
  id: z.string().describe('User ID'),
  email: z.string().email().describe('User email'),
  name: z.string().describe('User name'),
  isActive: z.boolean().describe('User active status'),
  createdAt: z.date().describe('User creation timestamp'),
  updatedAt: z.date().describe('User last update timestamp'),
  profile: z
    .object({
      id: z.string().describe('Profile ID'),
      type: z
        .enum(['TEACHER', 'STUDENT', 'GUARDIAN', 'BASE_USER'])
        .describe('Profile type'),
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

// Guardian List Response Schema
export const GuardianListResponseSchema = z.object({
  guardians: z.array(GuardianResponseSchema).describe('List of guardians'),
  total: z.number().describe('Total number of guardians'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Guardian Response Schema
export const CreateGuardianResponseSchema = z.object({
  message: z.string().describe('Success message'),
  guardian: GuardianResponseSchema.describe('Created guardian information'),
});

// Update Guardian Response Schema
export const UpdateGuardianResponseSchema = z.object({
  message: z.string().describe('Success message'),
  guardian: GuardianResponseSchema.describe('Updated guardian information'),
});

// Guardian Stats Response Schema
export const GuardianStatsResponseSchema = z.object({
  totalGuardians: z.number().describe('Total number of guardians'),
  activeGuardians: z.number().describe('Number of active guardians'),
  inactiveGuardians: z.number().describe('Number of inactive guardians'),
  averageStudentsPerGuardian: z
    .number()
    .describe('Average number of students per guardian'),
});

// Create DTOs using nestjs-zod
export class GuardianResponseDto extends createZodDto(GuardianResponseSchema) {}
export class GuardianListResponseDto extends createZodDto(
  GuardianListResponseSchema,
) {}
export class CreateGuardianResponseDto extends createZodDto(
  CreateGuardianResponseSchema,
) {}
export class UpdateGuardianResponseDto extends createZodDto(
  UpdateGuardianResponseSchema,
) {}
export class GuardianStatsResponseDto extends createZodDto(
  GuardianStatsResponseSchema,
) {}
