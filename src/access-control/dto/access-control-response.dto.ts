import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Permission Response Schema
export const PermissionResponseSchema = z.object({
  id: z.string().describe('Permission ID'),
  action: z.string().describe('Permission action'),
  resource: z.string().describe('Permission resource'),
  description: z.string().optional().describe('Permission description'),
  isActive: z.boolean().describe('Permission active status'),
  createdAt: z.date().describe('Permission creation timestamp'),
  updatedAt: z.date().describe('Permission last update timestamp'),
});

// Role Response Schema
export const RoleResponseSchema = z.object({
  id: z.string().describe('Role ID'),
  name: z.string().describe('Role name'),
  description: z.string().optional().describe('Role description'),
  scope: z.enum(['GLOBAL', 'CENTER']).describe('Role scope'),
  centerId: z.string().optional().describe('Center ID (for CENTER scope)'),
  isAdmin: z.boolean().describe('Whether this is an admin role'),
  isActive: z.boolean().describe('Role active status'),
  createdAt: z.date().describe('Role creation timestamp'),
  updatedAt: z.date().describe('Role last update timestamp'),
  permissions: z
    .array(PermissionResponseSchema)
    .optional()
    .describe('Role permissions'),
});

// User Access Response Schema
export const UserAccessResponseSchema = z.object({
  userId: z.string().describe('User ID'),
  permissions: z
    .array(
      z.object({
        permission: PermissionResponseSchema.describe('Permission information'),
        scopeType: z.enum(['GLOBAL', 'CENTER']).describe('Permission scope'),
        centerId: z
          .string()
          .optional()
          .describe('Center ID (for CENTER scope)'),
        isActive: z.boolean().describe('Permission assignment active status'),
        grantedAt: z.date().describe('When permission was granted'),
      }),
    )
    .describe('User permissions'),
  roles: z
    .array(
      z.object({
        role: RoleResponseSchema.describe('Role information'),
        assignedAt: z.date().describe('When role was assigned'),
      }),
    )
    .describe('User roles'),
});

// Permission List Response Schema
export const PermissionListResponseSchema = z.object({
  permissions: z
    .array(PermissionResponseSchema)
    .describe('List of permissions'),
  total: z.number().describe('Total number of permissions'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Role List Response Schema
export const RoleListResponseSchema = z.object({
  roles: z.array(RoleResponseSchema).describe('List of roles'),
  total: z.number().describe('Total number of roles'),
  page: z.number().describe('Current page number'),
  limit: z.number().describe('Number of items per page'),
  totalPages: z.number().describe('Total number of pages'),
});

// Create Permission Response Schema
export const CreatePermissionResponseSchema = z.object({
  message: z.string().describe('Success message'),
  permission: PermissionResponseSchema.describe(
    'Created permission information',
  ),
});

// Create Role Response Schema
export const CreateRoleResponseSchema = z.object({
  message: z.string().describe('Success message'),
  role: RoleResponseSchema.describe('Created role information'),
});

// Update Role Response Schema
export const UpdateRoleResponseSchema = z.object({
  message: z.string().describe('Success message'),
  role: RoleResponseSchema.describe('Updated role information'),
});

// Assign Permission Response Schema
export const AssignPermissionResponseSchema = z.object({
  message: z.string().describe('Success message'),
  assignment: z
    .object({
      userId: z.string().describe('User ID'),
      permissionId: z.string().describe('Permission ID'),
      scopeType: z.enum(['GLOBAL', 'CENTER']).describe('Permission scope'),
      centerId: z.string().optional().describe('Center ID (for CENTER scope)'),
      isActive: z.boolean().describe('Assignment active status'),
    })
    .describe('Permission assignment information'),
});

// Grant User Access Response Schema
export const GrantUserAccessResponseSchema = z.object({
  message: z.string().describe('Success message'),
  access: z
    .object({
      userId: z.string().describe('User ID'),
      roleId: z.string().describe('Role ID'),
      centerId: z.string().optional().describe('Center ID (for CENTER scope)'),
      isActive: z.boolean().describe('Access active status'),
    })
    .describe('User access information'),
});

// Create DTOs using nestjs-zod
export class PermissionResponseDto extends createZodDto(
  PermissionResponseSchema,
) {}
export class RoleResponseDto extends createZodDto(RoleResponseSchema) {}
export class UserAccessResponseDto extends createZodDto(
  UserAccessResponseSchema,
) {}
export class PermissionListResponseDto extends createZodDto(
  PermissionListResponseSchema,
) {}
export class RoleListResponseDto extends createZodDto(RoleListResponseSchema) {}
export class CreatePermissionResponseDto extends createZodDto(
  CreatePermissionResponseSchema,
) {}
export class CreateRoleResponseDto extends createZodDto(
  CreateRoleResponseSchema,
) {}
export class UpdateRoleResponseDto extends createZodDto(
  UpdateRoleResponseSchema,
) {}
export class AssignPermissionResponseDto extends createZodDto(
  AssignPermissionResponseSchema,
) {}
export class GrantUserAccessResponseDto extends createZodDto(
  GrantUserAccessResponseSchema,
) {}
