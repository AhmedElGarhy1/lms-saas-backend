import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Center } from '@/modules/centers/entities/center.entity';

export class RequestImportOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to (format: Egyptian mobile number)',
    example: '01234567890',
  })
  @IsString()
  @Matches(/^(01)[0-2,5]\d{8}$/, {
    message: 'Phone number must be a valid Egyptian mobile number',
  })
  phone: string;

  @ApiProperty({
    description: 'Profile type to assign to the imported user',
    enum: ProfileType,
  })
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @ApiProperty({
    description: 'Center ID for the import (optional, for validation)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}
