import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserToCenterRequestDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Center ID' })
  @IsUUID()
  centerId: string;

  @ApiProperty({ description: 'Role ID', required: false })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
