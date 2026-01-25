import { IsNumber, IsPositive, IsUUID } from 'class-validator';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Class } from '@/modules/classes/entities/class.entity';

export class PayClassInstallmentDto {
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId: string;

  @IsUUID()
  @BelongsToCenter(Class)
  classId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  // Removed paymentSource - now handled by separate endpoints
}
