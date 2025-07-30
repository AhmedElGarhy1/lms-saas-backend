import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { CenterStatus } from '../entities/center.entity';

// Center Response Schema
export const CenterResponseSchema = z.object({
  id: z.string().describe('Center ID'),
  name: z.string().describe('Center name'),
  description: z.string().nullable().describe('Center description'),
  status: z.nativeEnum(CenterStatus).describe('Center status'),
  address: z.string().nullable().describe('Center address'),
  city: z.string().nullable().describe('City'),
  state: z.string().nullable().describe('State/Province'),
  postalCode: z.string().nullable().describe('Postal code'),
  country: z.string().nullable().describe('Country'),
  phone: z.string().nullable().describe('Phone number'),
  email: z.string().nullable().describe('Email address'),
  website: z.string().nullable().describe('Website URL'),
  currentEnrollment: z.number().describe('Current enrollment'),
  logo: z.string().nullable().describe('Logo URL'),
  settings: z
    .record(z.string(), z.any())
    .nullable()
    .describe('Center settings'),
  createdBy: z.string().nullable().describe('Creator user ID'),
  createdAt: z.date().describe('Creation date'),
  updatedAt: z.date().describe('Last update date'),
  isActive: z
    .boolean()
    .describe('Whether the center is active (derived from status)'),
});

// Center List Response Schema
export const CenterListResponseSchema = z.object({
  data: z.array(CenterResponseSchema).describe('List of centers'),
  meta: z
    .object({
      itemsPerPage: z.number().describe('Items per page'),
      totalItems: z.number().describe('Total number of items'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number'),
      sortBy: z
        .array(z.tuple([z.string(), z.string()]))
        .describe('Sort configuration'),
      searchBy: z.array(z.string()).describe('Search fields'),
      search: z.string().describe('Search term'),
      select: z.array(z.string()).describe('Selected fields'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Applied filters'),
    })
    .describe('Pagination metadata'),
});

// Center Stats Response Schema
export const CenterStatsResponseSchema = z.object({
  totalCenters: z.number().describe('Total number of centers'),
  activeCenters: z.number().describe('Number of active centers'),
  inactiveCenters: z.number().describe('Number of inactive centers'),
  suspendedCenters: z.number().describe('Number of suspended centers'),
  totalEnrollment: z.number().describe('Total enrollment across all centers'),
  averageEnrollment: z.number().describe('Average enrollment per center'),
  centersByStatus: z
    .record(z.string(), z.number())
    .describe('Centers count by status'),
  topCenters: z
    .array(
      z.object({
        id: z.string().describe('Center ID'),
        name: z.string().describe('Center name'),
        enrollment: z.number().describe('Enrollment count'),
      }),
    )
    .describe('Top centers by enrollment'),
});

// Create Center Response Schema
export const CreateCenterResponseSchema = z.object({
  message: z.string().describe('Success message'),
  center: CenterResponseSchema.describe('Created center'),
});

// Update Center Response Schema
export const UpdateCenterResponseSchema = z.object({
  message: z.string().describe('Success message'),
  center: CenterResponseSchema.describe('Updated center'),
});

// Center User Assignment Schema
export const CenterUserAssignmentSchema = z.object({
  userId: z.string().describe('User ID to assign'),
  centerId: z.string().describe('Center ID to assign user to'),
  roleId: z.string().optional().describe('Role ID to assign to user'),
});

// Center Admin Assignment Schema
export const CenterAdminAssignmentSchema = z.object({
  adminId: z.string().describe('Admin user ID to assign'),
  centerId: z.string().describe('Center ID to assign admin to'),
  grantedBy: z.string().describe('User ID who granted the admin access'),
});

// DTOs
export class CenterResponseDto extends createZodDto(CenterResponseSchema) {
  @ApiProperty({
    description: 'Center ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  declare id: string;

  @ApiProperty({
    description: 'Center name',
    example: 'ABC Learning Center',
  })
  declare name: string;

  @ApiProperty({
    description: 'Center description',
    example: 'A comprehensive learning center for students of all ages',
    nullable: true,
  })
  declare description: string | null;

  @ApiProperty({
    description: 'Center status',
    example: CenterStatus.ACTIVE,
    enum: Object.values(CenterStatus),
  })
  declare status: CenterStatus;

  @ApiProperty({
    description: 'Center address',
    example: '123 Main Street',
    nullable: true,
  })
  declare address: string | null;

  @ApiProperty({
    description: 'City',
    example: 'New York',
    nullable: true,
  })
  declare city: string | null;

  @ApiProperty({
    description: 'State/Province',
    example: 'NY',
    nullable: true,
  })
  declare state: string | null;

  @ApiProperty({
    description: 'Postal code',
    example: '10001',
    nullable: true,
  })
  declare postalCode: string | null;

  @ApiProperty({
    description: 'Country',
    example: 'USA',
    nullable: true,
  })
  declare country: string | null;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
    nullable: true,
  })
  declare phone: string | null;

  @ApiProperty({
    description: 'Email address',
    example: 'info@abclearning.com',
    nullable: true,
  })
  declare email: string | null;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://www.abclearning.com',
    nullable: true,
  })
  declare website: string | null;

  @ApiProperty({
    description: 'Current enrollment',
    example: 250,
  })
  declare currentEnrollment: number;

  @ApiProperty({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  declare logo: string | null;

  @ApiProperty({
    description: 'Center settings (JSON object)',
    example: { theme: 'dark', notifications: true },
    nullable: true,
  })
  declare settings: Record<string, any> | null;

  @ApiProperty({
    description: 'Creator user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  declare createdBy: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  declare createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  declare updatedAt: Date;

  @ApiProperty({
    description: 'Whether the center is active (derived from status)',
    example: true,
  })
  declare isActive: boolean;
}

export class CenterListResponseDto extends createZodDto(
  CenterListResponseSchema,
) {
  @ApiProperty({
    description: 'List of centers',
    type: [CenterResponseDto],
  })
  declare data: CenterResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  declare meta: {
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    sortBy: [string, string][];
    searchBy: string[];
    search: string;
    select: string[];
    filter?: Record<string, any>;
  };
}

export class CenterStatsResponseDto extends createZodDto(
  CenterStatsResponseSchema,
) {
  @ApiProperty({
    description: 'Total number of centers',
    example: 100,
  })
  declare totalCenters: number;

  @ApiProperty({
    description: 'Number of active centers',
    example: 80,
  })
  declare activeCenters: number;

  @ApiProperty({
    description: 'Number of inactive centers',
    example: 15,
  })
  declare inactiveCenters: number;

  @ApiProperty({
    description: 'Number of suspended centers',
    example: 5,
  })
  declare suspendedCenters: number;

  @ApiProperty({
    description: 'Total enrollment across all centers',
    example: 5000,
  })
  declare totalEnrollment: number;

  @ApiProperty({
    description: 'Average enrollment per center',
    example: 50,
  })
  declare averageEnrollment: number;

  @ApiProperty({
    description: 'Centers count by status',
    example: { ACTIVE: 80, INACTIVE: 15, SUSPENDED: 5 },
  })
  declare centersByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Top centers by enrollment',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        name: { type: 'string', example: 'ABC Learning Center' },
        enrollment: { type: 'number', example: 500 },
      },
    },
  })
  declare topCenters: Array<{
    id: string;
    name: string;
    enrollment: number;
  }>;
}

export class CreateCenterResponseDto extends createZodDto(
  CreateCenterResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'Center created successfully',
  })
  declare message: string;

  @ApiProperty({
    description: 'Created center',
    type: CenterResponseDto,
  })
  declare center: CenterResponseDto;
}

export class UpdateCenterResponseDto extends createZodDto(
  UpdateCenterResponseSchema,
) {
  @ApiProperty({
    description: 'Success message',
    example: 'Center updated successfully',
  })
  declare message: string;

  @ApiProperty({
    description: 'Updated center',
    type: CenterResponseDto,
  })
  declare center: CenterResponseDto;
}

export class CenterUserAssignmentDto extends createZodDto(
  CenterUserAssignmentSchema,
) {
  @ApiProperty({
    description: 'User ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  declare userId: string;

  @ApiProperty({
    description: 'Center ID to assign user to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  declare centerId: string;

  @ApiProperty({
    description: 'Role ID to assign to user',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  declare roleId?: string;
}

export class CenterAdminAssignmentDto extends createZodDto(
  CenterAdminAssignmentSchema,
) {
  @ApiProperty({
    description: 'Admin user ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  declare adminId: string;

  @ApiProperty({
    description: 'Center ID to assign admin to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  declare centerId: string;

  @ApiProperty({
    description: 'User ID who granted the admin access',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  declare grantedBy: string;
}
