import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserCenterParamsDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Center ID' })
  @IsString()
  centerId: string;
}
