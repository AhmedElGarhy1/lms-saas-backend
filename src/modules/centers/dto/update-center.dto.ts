import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsBoolean,
  Matches,
} from 'class-validator';
import { IsTimezone } from '@/shared/common/decorators/is-timezone.decorator';

export class UpdateCenterRequestDto {
  @ApiProperty({ description: 'Center name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Center description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Center phone' })
  @IsString()
  @IsOptional()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone?: string;

  @ApiProperty({ description: 'Center email' })
  // @NotExists(Center, 'email', { message: 'Email already exists' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Center website' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Whether the center is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Center timezone (IANA timezone identifier)',
    example: 'Africa/Cairo',
  })
  @IsString()
  @IsOptional()
  @IsTimezone({
    message: 'timezone must be a valid IANA timezone identifier (e.g., Africa/Cairo, America/New_York)',
  })
  timezone?: string;

  @ApiProperty({ description: 'Center logo' })
  @IsString()
  @IsOptional()
  logo?: string;
}
