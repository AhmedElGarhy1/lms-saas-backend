import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const UpdateProfileRequestSchema = z.object({
  fullName: z.string().optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export class UpdateProfileRequestDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'Jane Doe',
    required: false,
  })
  fullName?: string;
}
