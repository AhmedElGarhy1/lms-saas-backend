import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

// Enhanced validation schema for center creation
export const CreateCenterRequestSchema = z.object({
  name: z
    .string()
    .min(2, 'Center name must be at least 2 characters')
    .max(100, 'Center name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_()&.]+$/,
      'Center name can only contain letters, numbers, spaces, hyphens, underscores, parentheses, ampersands, and periods',
    )
    .trim(),

  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),

  location: z.object({
    address: z
      .string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address must not exceed 200 characters')
      .trim(),

    city: z
      .string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must not exceed 50 characters')
      .regex(
        /^[a-zA-Z\s\-']+$/,
        'City can only contain letters, spaces, hyphens, and apostrophes',
      )
      .trim(),

    country: z
      .string()
      .length(2, 'Country must be a 2-letter ISO country code')
      .regex(/^[A-Z]{2}$/, 'Country must be a valid 2-letter ISO country code')
      .toUpperCase(),

    postalCode: z
      .string()
      .min(3, 'Postal code must be at least 3 characters')
      .max(10, 'Postal code must not exceed 10 characters')
      .regex(
        /^[a-zA-Z0-9\s\-]+$/,
        'Postal code can only contain letters, numbers, spaces, and hyphens',
      )
      .optional(),

    coordinates: z
      .object({
        latitude: z
          .number()
          .min(-90, 'Latitude must be between -90 and 90')
          .max(90, 'Latitude must be between -90 and 90'),

        longitude: z
          .number()
          .min(-180, 'Longitude must be between -180 and 180')
          .max(180, 'Longitude must be between -180 and 180'),
      })
      .optional(),
  }),

  contact: z
    .object({
      phone: z
        .string()
        .regex(
          /^[\+]?[1-9][\d]{0,15}$/,
          'Phone number must be a valid international format',
        )
        .optional(),

      email: z
        .string()
        .email('Please provide a valid email address')
        .max(100, 'Email must not exceed 100 characters')
        .optional(),

      website: z
        .string()
        .url('Please provide a valid website URL')
        .max(200, 'Website URL must not exceed 200 characters')
        .optional(),
    })
    .optional(),

  adminInfo: z.object({
    email: z
      .string()
      .email('Please provide a valid admin email address')
      .min(5, 'Admin email must be at least 5 characters')
      .max(100, 'Admin email must not exceed 100 characters')
      .toLowerCase()
      .trim(),

    name: z
      .string()
      .min(2, 'Admin name must be at least 2 characters')
      .max(100, 'Admin name must not exceed 100 characters')
      .regex(
        /^[a-zA-Z\s\-_']+$/,
        'Admin name can only contain letters, spaces, hyphens, underscores, and apostrophes',
      )
      .trim(),

    password: z
      .string()
      .min(8, 'Admin password must be at least 8 characters')
      .max(128, 'Admin password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Admin password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
      ),

    phone: z
      .string()
      .regex(
        /^[\+]?[1-9][\d]{0,15}$/,
        'Admin phone number must be a valid international format',
      )
      .optional(),
  }),

  settings: z
    .object({
      maxCapacity: z
        .number()
        .int('Maximum capacity must be a whole number')
        .min(1, 'Maximum capacity must be at least 1')
        .max(10000, 'Maximum capacity must not exceed 10,000')
        .optional()
        .default(100),

      timezone: z
        .string()
        .regex(
          /^[A-Za-z_]+[A-Za-z0-9_-]*\/[A-Za-z_]+[A-Za-z0-9_-]*$/,
          'Timezone must be in IANA format (e.g., America/New_York)',
        )
        .optional()
        .default('UTC'),

      language: z
        .string()
        .length(2, 'Language must be a 2-letter ISO language code')
        .regex(
          /^[a-z]{2}$/,
          'Language must be a valid 2-letter ISO language code',
        )
        .optional()
        .default('en'),
    })
    .optional()
    .default(() => ({
      maxCapacity: 100,
      timezone: 'UTC',
      language: 'en',
    })),
});

export type CreateCenterRequestDto = z.infer<typeof CreateCenterRequestSchema>;

// Swagger DTO for documentation
export class CreateCenterRequestSwaggerDto {
  @ApiProperty({
    description: 'Center name',
    example: 'Tech Learning Center',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Center description',
    example: 'A modern learning center focused on technology education',
    maxLength: 500,
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Center location information',
    example: {
      address: '123 Main Street',
      city: 'New York',
      country: 'US',
      postalCode: '10001',
      coordinates: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    },
  })
  location: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @ApiProperty({
    description: 'Center contact information',
    example: {
      phone: '+1234567890',
      email: 'contact@techlearning.com',
      website: 'https://techlearning.com',
    },
    required: false,
  })
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };

  @ApiProperty({
    description: 'Center administrator information',
    example: {
      email: 'admin@techlearning.com',
      name: 'John Admin',
      password: 'SecurePass123!',
      phone: '+1234567890',
    },
  })
  adminInfo: {
    email: string;
    name: string;
    password: string;
    phone?: string;
  };

  @ApiProperty({
    description: 'Center settings',
    example: {
      maxCapacity: 500,
      timezone: 'America/New_York',
      language: 'en',
    },
    required: false,
  })
  settings?: {
    maxCapacity?: number;
    timezone?: string;
    language?: string;
  };
}
