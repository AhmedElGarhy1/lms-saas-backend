import { IsUUID, IsEnum, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '@/modules/classes/entities/class.entity';
import { Session } from '@/modules/sessions/entities/session.entity';

export enum ChargeType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  SESSION = 'SESSION',
}

export class CreateStudentChargeDto {
  @ApiProperty({
    description: 'Type of charge',
    enum: ChargeType,
    example: ChargeType.SUBSCRIPTION,
  })
  @IsEnum(ChargeType)
  type: ChargeType;

  @ApiProperty({
    description: 'Student user profile ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  // For subscription charges - required when type is SUBSCRIPTION
  @ApiProperty({
    description: 'Class ID (required for subscription charges)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @ValidateIf(o => o.type === ChargeType.SUBSCRIPTION)
  @IsUUID()
  @BelongsToCenter(Class)
  classId?: string;

  // For session charges - required when type is SESSION
  @ApiProperty({
    description: 'Session ID (required for session charges)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @ValidateIf(o => o.type === ChargeType.SESSION)
  @IsUUID()
  @BelongsToCenter(Session)
  sessionId?: string;

  // For subscription charges - required when type is SUBSCRIPTION
  @ApiProperty({
    description: 'Year for subscription (required for subscription charges)',
    example: 2024,
    required: false,
  })
  @ValidateIf(o => o.type === ChargeType.SUBSCRIPTION)
  @IsInt()
  @Min(2020)
  @Max(2030)
  year?: number;

  @ApiProperty({
    description: 'Month for subscription (1-12, required for subscription charges)',
    example: 1,
    required: false,
  })
  @ValidateIf(o => o.type === ChargeType.SUBSCRIPTION)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
