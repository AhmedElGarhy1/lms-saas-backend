import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';

export class UpdateAdminDto extends UpdateUserDto {
  // Admin-specific fields can be added here as needed
}
