import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateCenterRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().uuid().optional(),
});
export type CreateCenterRequest = z.infer<typeof CreateCenterRequestSchema>;

export class CreateCenterRequestDto {
  @ApiProperty({
    example: 'Springfield High',
    description: 'Name of the center',
  })
  name: string;

  @ApiProperty({
    example: 'A public high school in Springfield',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  isActive?: boolean = true;

  @ApiProperty({
    example: 'uuid-of-role',
    description:
      'Role ID for the center owner (optional, defaults to Owner role)',
    required: false,
  })
  roleId?: string;
}
