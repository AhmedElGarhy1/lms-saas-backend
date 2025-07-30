import { z } from 'zod';

// Base validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.array(z.tuple([z.string(), z.enum(['ASC', 'DESC'])])).optional(),
  filter: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional(),
});

export const idSchema = z.object({
  id: z.string().uuid(),
});

export const emailSchema = z.object({
  email: z.string().email(),
});

// Comprehensive password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(
    /(?=.*[!@#$%^&*(),.?":{}|<>])/,
    'Password must contain at least one special character',
  );

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  twoFactorCode: z.string().optional(),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const twoFactorSchema = z.object({
  code: z.string().length(6),
});

// Role validation schemas
export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  scope: z.enum(['ADMIN', 'CENTER']),
  type: z.enum(['SYSTEM', 'CUSTOM']),
  permissions: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
  permissions: z.array(z.string().uuid()).optional(),
});

// Permission validation schemas
export const createPermissionSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
});

export const assignPermissionSchema = z.object({
  userId: z.string().uuid(),
  permissionId: z.string().uuid(),
});

// Access control validation schemas
export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const assignUserToCenterSchema = z.object({
  userId: z.string().uuid(),
  centerId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
});
