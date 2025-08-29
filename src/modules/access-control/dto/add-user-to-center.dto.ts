import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserToCenterRequestDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Center ID' })
  @IsString()
  centerId: string;

  @ApiProperty({ description: 'Role IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
