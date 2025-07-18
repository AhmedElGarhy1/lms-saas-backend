import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'User ID of the teacher',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Teacher biography',
    example:
      'Experienced mathematics teacher with 10+ years of teaching experience in advanced calculus and algebra.',
  })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience',
    example: 10,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({
    description: 'Teacher specialization or subject area',
    example: 'Mathematics, Advanced Calculus, Linear Algebra',
  })
  @IsOptional()
  @IsString()
  specialization?: string;
}

export class UpdateTeacherDto {
  @ApiPropertyOptional({
    description: 'Teacher biography',
    example:
      'Experienced mathematics teacher with 10+ years of teaching experience in advanced calculus and algebra.',
  })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience',
    example: 10,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({
    description: 'Teacher specialization or subject area',
    example: 'Mathematics, Advanced Calculus, Linear Algebra',
  })
  @IsOptional()
  @IsString()
  specialization?: string;
}

export class TeacherResponseDto {
  @ApiProperty({
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID of the teacher',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Teacher biography',
    example:
      'Experienced mathematics teacher with 10+ years of teaching experience in advanced calculus and algebra.',
  })
  biography?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience',
    example: 10,
  })
  experienceYears?: number;

  @ApiPropertyOptional({
    description: 'Teacher specialization or subject area',
    example: 'Mathematics, Advanced Calculus, Linear Algebra',
  })
  specialization?: string;

  @ApiProperty({
    description: 'Number of profile views',
    example: 150,
  })
  profileViews: number;

  @ApiProperty({
    description: 'Teacher rating (0-5)',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Number of students taught',
    example: 45,
  })
  studentsCount?: number;

  @ApiPropertyOptional({
    description: 'Number of centers the teacher works at',
    example: 2,
  })
  centersCount?: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
  })
  user?: {
    id: string;
    name: string;
    email: string;
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
  @IsUUID()
  id: string;
}
