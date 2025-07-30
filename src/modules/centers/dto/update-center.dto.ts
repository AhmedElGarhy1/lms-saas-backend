import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { CenterStatus } from '../entities/center.entity';

export const UpdateCenterRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Center name must be at least 2 characters')
    .optional(),
  description: z.string().optional().describe('Center description'),
  status: z.nativeEnum(CenterStatus).optional().describe('Center status'),
  address: z.string().optional().describe('Center address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State/Province'),
  postalCode: z.string().optional().describe('Postal code'),
  country: z.string().optional().describe('Country'),
  phone: z.string().optional().describe('Phone number'),
  email: z.string().email().optional().describe('Email address'),
  website: z.string().url().optional().describe('Website URL'),
  logo: z.string().url().optional().describe('Logo URL'),
  settings: z
    .record(z.string(), z.any())
    .optional()
    .describe('Center settings'),
});

export class UpdateCenterRequestDto extends createZodDto(
  UpdateCenterRequestSchema,
) {
  @ApiProperty({
    description: 'Center name (minimum 2 characters)',
    example: 'ABC Learning Center',
    minLength: 2,
    required: false,
  })
  declare name?: string;

  @ApiProperty({
    description: 'Center description',
    example: 'A comprehensive learning center for students of all ages',
    required: false,
  })
  declare description?: string;

  @ApiProperty({
    description: 'Center status',
    example: CenterStatus.ACTIVE,
    enum: Object.values(CenterStatus),
    required: false,
  })
  declare status?: CenterStatus;

  @ApiProperty({
    description: 'Center address',
    example: '123 Main Street',
    required: false,
  })
  declare address?: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
    required: false,
  })
  declare city?: string;

  @ApiProperty({
    description: 'State/Province',
    example: 'NY',
    required: false,
  })
  declare state?: string;

  @ApiProperty({
    description: 'Postal code',
    example: '10001',
    required: false,
  })
  declare postalCode?: string;

  @ApiProperty({
    description: 'Country',
    example: 'USA',
    required: false,
  })
  declare country?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  declare phone?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'info@abclearning.com',
    format: 'email',
    required: false,
  })
  declare email?: string;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://www.abclearning.com',
    format: 'uri',
    required: false,
  })
  declare website?: string;

  @ApiProperty({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    format: 'uri',
    required: false,
  })
  declare logo?: string;

  @ApiProperty({
    description: 'Center settings (JSON object)',
    example: { theme: 'dark', notifications: true },
    required: false,
  })
  declare settings?: Record<string, any>;
}
