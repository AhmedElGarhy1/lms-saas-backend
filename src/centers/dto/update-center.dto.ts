import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const UpdateCenterRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCenterRequest = z.infer<typeof UpdateCenterRequestSchema>;

export class UpdateCenterRequestDto {
  @ApiProperty({ example: 'Springfield High', required: false })
  name?: string;

  @ApiProperty({
    example: 'A public high school in Springfield',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}
