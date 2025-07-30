import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

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
) {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    required: false,
  })
  declare name?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  declare phone?: string;

  @ApiProperty({
    description: 'User address',
    example: '123 Main St, City, State 12345',
    required: false,
  })
  declare address?: string;

  @ApiProperty({
    description: 'Date of birth (ISO 8601 format)',
    example: '1990-01-01T00:00:00.000Z',
    format: 'date-time',
    required: false,
  })
  declare dateOfBirth?: string;

  @ApiProperty({
    description: 'Gender',
    example: 'Male',
    required: false,
  })
  declare gender?: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    format: 'uri',
    required: false,
  })
  declare avatar?: string;
}

// Alias for backward compatibility
export class UpdateProfileDto extends UpdateProfileRequestDto {}
