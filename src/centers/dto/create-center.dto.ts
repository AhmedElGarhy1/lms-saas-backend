import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCenterRequestSchema = z.object({
  name: z.string().min(2, 'Center name must be at least 2 characters'),
  description: z.string().optional().describe('Center description'),
  location: z.string().optional().describe('Center location'),
});

export class CreateCenterRequestDto extends createZodDto(
  CreateCenterRequestSchema,
) {}
