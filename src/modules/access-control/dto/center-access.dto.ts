import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsEnum } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class CenterAccessDto {
  @ApiProperty({
    description: 'The ID of the user to grant center access to',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(User)
  userId: string;

  @ApiProperty({
    description: 'The ID of the center for which to grant access',
    format: 'uuid',
  })
  @IsUUID()
  @Exists(Center)
  centerId: string;

  @ApiProperty({
    description: 'The profile type of the user to grant center access to',
    enum: ProfileType,
    default: ProfileType.STAFF,
    required: true,
  })
  @IsEnum(ProfileType)
  profileType: ProfileType;
}
