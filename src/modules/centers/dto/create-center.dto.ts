import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '@/modules/user/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateCenterRequestDto } from './update-center.dto';

export class CreateCenterDto extends UpdateCenterRequestDto {
  // User object for center admin
  @ApiProperty({ type: CreateUserDto })
  @ValidateNested()
  @Type(() => CreateUserDto)
  user: CreateUserDto;
}
