import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeMemberRoleDto {
  @ApiProperty({
    example: 'Admin',
    description: 'New role to assign to the user',
  })
  @IsString()
  role: string;
}
