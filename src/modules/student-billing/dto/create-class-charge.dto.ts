import { IsUUID, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '@/modules/classes/entities/class.entity';

export class CreateClassChargeDto {
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialPaymentAmount: number; // Required: Initial payment amount for installment payments

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
