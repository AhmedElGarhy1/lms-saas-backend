import { IsUUID, IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '@/modules/classes/entities/class.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMonthlySubscriptionDto {
  @ApiProperty({
    description: 'Student user profile ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  @ApiProperty({
    description: 'Class ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.WALLET,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Subscription year',
    example: 2024,
    minimum: 2020,
    maximum: 2030,
  })
  @IsInt()
  @Min(2020)
  @Max(2030)
  year: number;

  @ApiProperty({
    description: 'Subscription month (1-12)',
    example: 12,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate charges',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
