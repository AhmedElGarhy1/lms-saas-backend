import { IsUUID, IsEnum } from 'class-validator';
import { PaymentSource } from '../entities/student-charge.entity';
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

  @IsEnum(PaymentSource)
  paymentSource: PaymentSource;
}
