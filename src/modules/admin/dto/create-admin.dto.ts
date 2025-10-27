import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CreateUserWithRoleDto } from '@/modules/user/dto/create-user.dto';

export class CreateAdminDto extends CreateUserWithRoleDto {
  // Admin-specific fields can be added here as needed
}
