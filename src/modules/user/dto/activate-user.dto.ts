import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ScopeEnum } from '@/common/constants/role-scope.enum';

export const ActivateUserRequestSchema = z.object({
  isActive: z
    .boolean()
    .describe('Whether the user should be active or inactive'),
  centerId: z
    .string()
    .optional()
    .describe('Center ID for center-specific activation'),
});

export type ActivateUserRequest = z.infer<typeof ActivateUserRequestSchema>;

export class ActivateUserRequestDto {
  declare isActive: boolean;
  declare centerId?: string;
}
