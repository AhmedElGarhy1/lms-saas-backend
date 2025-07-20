import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const AddMemberRequestSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
  roleId: z.string().uuid().optional(),
});
export type AddMemberRequest = z.infer<typeof AddMemberRequestSchema>;

export class AddMemberRequestDto {
  @ApiProperty({ example: 'user-uuid', description: 'ID of the user to add' })
  userId: string;

  @ApiProperty({
    example: 'Teacher',
    description:
      'Role name to assign to the user (e.g., Teacher, Student, Owner)',
    required: false,
  })
  role?: string;

  @ApiProperty({
    example: 'role-uuid',
    description: 'Role ID to assign to the user (alternative to role name)',
    required: false,
  })
  roleId?: string;
}
