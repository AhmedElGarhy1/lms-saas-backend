import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportQueryDto } from '@/shared/common/dto/export-query.dto';

export class ExportUsersDto extends ExportQueryDto {
  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter by profile type',
    required: false,
    example: 'STUDENT',
  })
  @IsOptional()
  @IsString()
  profileType?: string;

  @ApiProperty({
    description: 'Filter by two-factor authentication status',
    required: false,
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiProperty({
    description: 'Filter by email verification status',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({
    description: 'Filter by center ID',
    required: false,
    example: 'uuid-123',
  })
  @IsOptional()
  @IsString()
  centerId?: string;
}
