import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Permission action (e.g., user:view, center:manage)',
    example: 'user:view',
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Human-readable permission name',
    example: 'View Users',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Is this an admin permission?',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
