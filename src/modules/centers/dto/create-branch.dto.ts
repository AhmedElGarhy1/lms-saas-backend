import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({
    description: 'City of the branch',
    example: 'Cairo',
  })
  @IsString()
  city: string;

  @ApiProperty({
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
