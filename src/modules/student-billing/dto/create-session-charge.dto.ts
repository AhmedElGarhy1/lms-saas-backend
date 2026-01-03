import { IsUUID, IsEnum } from 'class-validator';
import { PaymentSource } from '../entities/student-session-charge.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { BelongsToCenter, Exists } from '@/shared/common/decorators';
import { Session } from '@/modules/sessions/entities/session.entity';

export class CreateSessionChargeDto {
  @IsUUID()
  @Exists(UserProfile)
  studentUserProfileId: string;

  @IsUUID()
  @BelongsToCenter(Session)
  sessionId: string;

  @IsEnum(PaymentSource)
  paymentSource: PaymentSource;
}
