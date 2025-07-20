import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreatePermissionRequestSchema = z.object({
  action: z.string().min(1),
  name: z.string().min(1),
  isAdmin: z.boolean().optional(),
});
export type CreatePermissionRequest = z.infer<
  typeof CreatePermissionRequestSchema
>;

export class CreatePermissionRequestDto {
  @ApiProperty({
    description: 'Permission action (e.g., user:view, center:manage)',
    example: 'user:view',
  })
  action: string;

  @ApiProperty({
    description: 'Human-readable permission name',
    example: 'View Users',
  })
  name: string;

  @ApiProperty({
    description: 'Is this an admin permission?',
    example: false,
    required: false,
  })
  isAdmin?: boolean;
}
