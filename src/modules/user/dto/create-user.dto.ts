import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { passwordSchema } from '../../../common/validation/zod.config';

// Enhanced validation schema with comprehensive rules
export const CreateUserRequestSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must not exceed 100 characters')
    .toLowerCase()
    .trim(),

  password: passwordSchema,

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z\s\-_']+$/,
      'Name can only contain letters, spaces, hyphens, underscores, and apostrophes',
    )
    .trim(),

  isActive: z.boolean().default(true).optional(),

  centerId: z.string().uuid('Center ID must be a valid UUID').optional(),

  roleId: z.string().uuid('Role ID must be a valid UUID').optional(),
});

export type CreateUserRequestDto = z.infer<typeof CreateUserRequestSchema>;

// Swagger DTO for documentation
export class CreateUserRequestSwaggerDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    minLength: 5,
    maxLength: 100,
  })
  email: string;

  @ApiProperty({
    description: 'User password (must meet security requirements)',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128,
  })
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
    default: true,
    required: false,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Center ID to assign the user to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  centerId?: string;

  @ApiProperty({
    description: 'Role ID to assign to the user',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  roleId?: string;
}
