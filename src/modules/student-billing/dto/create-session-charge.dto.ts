import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Session } from '@/modules/sessions/entities/session.entity';

export class CreateSessionChargeDto {
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  @IsUUID()
  @BelongsToCenter(Session)
  sessionId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
