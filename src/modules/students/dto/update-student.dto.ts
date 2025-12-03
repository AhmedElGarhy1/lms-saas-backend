import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';

export class UpdateStudentDto extends UpdateUserDto {
  // Student-specific fields can be added here as needed
}

