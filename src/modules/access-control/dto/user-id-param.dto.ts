import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserIdParamDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;
}
