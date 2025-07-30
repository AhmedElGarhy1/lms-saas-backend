import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { RoleTypeEnum } from '../constants/role-type.enum';

export const CreateRoleRequestSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  type: z.enum(RoleTypeEnum).describe('Role type in the hierarchy'),
  description: z.string().optional().describe('Role description'),
  centerId: z
    .string()
    .optional()
    .describe('Center ID (for center-specific roles)'),
  permissions: z
    .array(z.string())
    .optional()
    .describe('Array of permission IDs'),
  isAdmin: z.boolean().default(false).describe('Whether this is an admin role'),
  isActive: z.boolean().default(true).describe('Whether the role is active'),
});

export class CreateRoleRequestDto extends createZodDto(
  CreateRoleRequestSchema,
) {
  @ApiProperty({
    description: 'Role name (minimum 2 characters)',
    example: 'Center Manager',
    minLength: 2,
    required: true,
  })
  declare name: string;

  @ApiProperty({
    description: 'Role type in the hierarchy',
    example: 'CENTER_ADMIN',
    enum: RoleTypeEnum,
    required: true,
  })
  declare type: RoleTypeEnum;

  @ApiProperty({
    description: 'Role description',
    example: 'Manages center operations and user access',
    required: false,
  })
  declare description?: string;

  @ApiProperty({
    description: 'Center ID (for center-specific roles)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  declare centerId?: string;

  @ApiProperty({
    description: 'Array of permission IDs',
    example: ['user:view', 'user:create', 'center:manage'],
    type: [String],
    required: false,
  })
  declare permissions?: string[];

  @ApiProperty({
    description: 'Whether this is an admin role',
    example: false,
    default: false,
    required: false,
  })
  declare isAdmin: boolean;

  @ApiProperty({
    description: 'Whether the role is active',
    example: true,
    default: true,
    required: false,
  })
  declare isActive: boolean;
}
