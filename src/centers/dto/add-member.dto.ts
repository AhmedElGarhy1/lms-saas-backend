import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: 'user-uuid', description: 'ID of the user to add' })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'Teacher',
    description: 'Role to assign to the user',
  })
  @IsString()
  role: string;
}
