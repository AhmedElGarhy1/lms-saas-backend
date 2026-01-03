import { IsUUID, IsEnum, IsString, Matches, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { BelongsToCenter } from '@/shared/common/decorators';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
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
  @Exists(UserProfile)
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
    description: 'Month and year for subscription (YYYY-MM format, required for subscription charges)',
    example: '2024-01',
    required: false,
  })
  @ValidateIf(o => o.type === ChargeType.SUBSCRIPTION)
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in format YYYY-MM' })
  monthYear?: string;
}
