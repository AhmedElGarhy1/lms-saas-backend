import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ChangeMemberRoleRequestSchema = z.object({
  role: z.string().min(1),
});
export type ChangeMemberRoleRequest = z.infer<
  typeof ChangeMemberRoleRequestSchema
>;

export class ChangeMemberRoleRequestDto {
  @ApiProperty({ description: 'Role name', example: 'Teacher' })
  role: string;
}
