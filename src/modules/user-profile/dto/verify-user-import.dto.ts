import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

export class VerifyUserImportDto {
  @ApiProperty({
    description: 'Phone number that received OTP (format: Egyptian mobile number)',
    example: '01234567890',
  })
  @IsString()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;

  @ApiProperty({
    description: 'OTP code received via SMS',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP code must be exactly 6 digits',
  })
  code: string;

  @ApiProperty({
    description: 'Profile type to assign to the imported user',
    enum: ProfileType,
  })
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @ApiProperty({
    description: 'Center ID for the import (optional, defaults to actor\'s centerId)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}

