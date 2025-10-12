import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class UserAccessDto {
  @ApiProperty({ description: 'Granter user ID' })
  @IsUUID()
  @Exists(User)
  granterUserId: string;

  @ApiProperty({ description: 'Target user ID' })
  @IsUUID()
  @Exists(User)
  targetUserId: string;

  @ApiProperty({ description: 'Center ID', required: false })
  @IsOptional()
  @IsUUID()
  @Exists(Center)
  centerId?: string;
}
