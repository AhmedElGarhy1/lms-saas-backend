import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginateUsersDto } from '@/modules/user/dto/paginate-users.dto';

export class PaginateAdminDto extends PaginateUsersDto {
  // Admin-specific filters can be added here as needed
}
