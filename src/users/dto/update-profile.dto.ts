import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().describe('Phone number'),
  address: z.string().optional().describe('Address'),
  dateOfBirth: z.string().datetime().optional().describe('Date of birth'),
  gender: z.string().optional().describe('Gender'),
  avatar: z.string().url().optional().describe('Avatar URL'),
});

export class UpdateProfileRequestDto extends createZodDto(
  UpdateProfileRequestSchema,
) {}

// Alias for backward compatibility
export class UpdateProfileDto extends UpdateProfileRequestDto {}
