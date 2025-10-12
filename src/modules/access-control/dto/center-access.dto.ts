import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean } from 'class-validator';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';

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
    description:
      'Whether this is global access (for admins) or local access (for center users)',
    default: false,
    required: true,
  })
  @IsBoolean()
  global: boolean;
}
