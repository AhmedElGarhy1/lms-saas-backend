import { IsUUID, IsEnum, IsString, Matches } from 'class-validator';
import { PaymentSource } from '../entities/student-class-subscription.entity';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Class } from '@/modules/classes/entities/class.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { BelongsToCenter } from '@/shared/common/decorators';

export class CreateMonthlySubscriptionDto {
  @IsUUID()
  @Exists(UserProfile)
  studentUserProfileId: string;

  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;

  @IsEnum(PaymentSource)
  paymentSource: PaymentSource;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthYear must be in format YYYY-MM' })
  monthYear: string;
}
