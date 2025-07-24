import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Request DTOs using nestjs-zod
export const UpdateTeacherRequestSchema = z.object({
  biography: z.string().optional().describe('Teacher biography'),
  experienceYears: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe('Years of teaching experience (0-50)'),
  specialization: z
    .string()
    .optional()
    .describe('Teacher specialization or subject area'),
});

export const CreateTeacherRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  biography: z.string().optional().describe('Teacher biography'),
  experienceYears: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe('Years of teaching experience (0-50)'),
  specialization: z
    .string()
    .optional()
    .describe('Teacher specialization or subject area'),
});

export class UpdateTeacherRequestDto extends createZodDto(
  UpdateTeacherRequestSchema,
) {}
export class CreateTeacherRequestDto extends createZodDto(
  CreateTeacherRequestSchema,
) {}

// Response DTOs (keeping as ApiProperty for output documentation)
export class TeacherResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User profile information',
  })
  profile?: {
    id: string;
    type: string;
    teacher?: {
      id: string;
      biography?: string;
      experienceYears?: number;
      specialization?: string;
      profileViews: number;
      rating: number;
      studentsCount?: number;
      centersCount?: number;
      createdAt: Date;
      updatedAt: Date;
    };
  };
}

export class TeacherListResponseDto {
  @ApiProperty({
    description: 'List of teachers',
    type: [TeacherResponseDto],
  })
  teachers: TeacherResponseDto[];

  @ApiProperty({
    description: 'Total number of teachers',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;
}

export class IncrementProfileViewsDto {
  @ApiProperty({
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;
}
