import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({
    description: 'Location/address of the branch',
    example: 'Downtown Los Angeles',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  location: string;

  @ApiPropertyOptional({
    description: 'Full address of the branch',
    example: '123 Main St, Los Angeles, CA 90210',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Email address of the branch',
    example: 'downtown@school.edu',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Whether the branch is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
