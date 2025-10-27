import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CreateUserWithRoleDto } from '@/modules/user/dto/create-user.dto';

export class CreateStaffDto extends CreateUserWithRoleDto {
  // Staff-specific fields can be added here as needed
}
