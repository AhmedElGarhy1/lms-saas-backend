import { IsUUID, IsEnum } from 'class-validator';
import { PaymentSource } from '../entities/student-charge.entity';
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

  @IsEnum(PaymentSource)
  paymentSource: PaymentSource;
}
