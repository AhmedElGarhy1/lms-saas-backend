import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Center Response Schema
export const CenterResponseSchema = z.object({
  id: z.string().describe('Center ID'),
  name: z.string().describe('Center name'),
  description: z.string().optional().describe('Center description'),
  location: z.string().optional().describe('Center location'),
  isActive: z.boolean().describe('Center active status'),
  createdAt: z.date().describe('Center creation timestamp'),
  updatedAt: z.date().describe('Center last update timestamp'),
});

// Center List Response Schema
export const CenterListResponseSchema = z.object({
  centers: z.array(CenterResponseSchema).describe('List of centers'),
  total: z.number().describe('Total number of centers'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Center Member Response Schema
export const CenterMemberResponseSchema = z.object({
  userId: z.string().describe('User ID'),
  centerId: z.string().describe('Center ID'),
  role: z.string().describe('Role name'),
  createdBy: z.string().describe('ID of the user who added this member'),
  createdAt: z.date().describe('Date the member was added'),
  user: z
    .object({
      id: z.string().describe('User ID'),
      name: z.string().describe('User name'),
      email: z.string().email().describe('User email'),
      isActive: z.boolean().describe('User active status'),
    })
    .optional()
    .describe('User object'),
  roleObj: z
    .object({
      id: z.string().describe('Role ID'),
      name: z.string().describe('Role name'),
      scope: z.enum(['GLOBAL', 'CENTER']).describe('Role scope'),
    })
    .optional()
    .describe('Role object'),
});

// Center Members List Response Schema
export const CenterMembersListResponseSchema = z.object({
  members: z
    .array(CenterMemberResponseSchema)
    .describe('List of center members'),
  total: z.number().describe('Total number of members'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Center Access Response Schema
export const CenterAccessResponseSchema = z.object({
  userId: z.string().describe('User ID'),
  centerId: z.string().describe('Center ID'),
  role: z.string().describe('Role name'),
  isActive: z.boolean().describe('Access active status'),
  createdAt: z.date().describe('Access creation timestamp'),
  updatedAt: z.date().describe('Access last update timestamp'),
});

// Center Access List Response Schema
export const CenterAccessListResponseSchema = z.object({
  accesses: z
    .array(CenterAccessResponseSchema)
    .describe('List of center accesses'),
  total: z.number().describe('Total number of accesses'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Center Response Schema
export const CreateCenterResponseSchema = z.object({
  message: z.string().describe('Success message'),
  center: CenterResponseSchema.describe('Created center information'),
});

// Update Center Response Schema
export const UpdateCenterResponseSchema = z.object({
  message: z.string().describe('Success message'),
  center: CenterResponseSchema.describe('Updated center information'),
});

// Add Member Response Schema
export const AddMemberResponseSchema = z.object({
  message: z.string().describe('Success message'),
  member: CenterMemberResponseSchema.describe('Added member information'),
});

// Change Member Role Response Schema
export const ChangeMemberRoleResponseSchema = z.object({
  message: z.string().describe('Success message'),
  member: CenterMemberResponseSchema.describe('Updated member information'),
});

// Grant Center Access Response Schema
export const GrantCenterAccessResponseSchema = z.object({
  message: z.string().describe('Success message'),
  access: CenterAccessResponseSchema.describe('Granted access information'),
});

// Create DTOs using nestjs-zod
export class CenterResponseDto extends createZodDto(CenterResponseSchema) {}
export class CenterListResponseDto extends createZodDto(
  CenterListResponseSchema,
) {}
export class CenterMemberResponseDto extends createZodDto(
  CenterMemberResponseSchema,
) {}
export class CenterMembersListResponseDto extends createZodDto(
  CenterMembersListResponseSchema,
) {}
export class CenterAccessResponseDto extends createZodDto(
  CenterAccessResponseSchema,
) {}
export class CenterAccessListResponseDto extends createZodDto(
  CenterAccessListResponseSchema,
) {}
export class CreateCenterResponseDto extends createZodDto(
  CreateCenterResponseSchema,
) {}
export class UpdateCenterResponseDto extends createZodDto(
  UpdateCenterResponseSchema,
) {}
export class AddMemberResponseDto extends createZodDto(
  AddMemberResponseSchema,
) {}
export class ChangeMemberRoleResponseDto extends createZodDto(
  ChangeMemberRoleResponseSchema,
) {}
export class GrantCenterAccessResponseDto extends createZodDto(
  GrantCenterAccessResponseSchema,
) {}
