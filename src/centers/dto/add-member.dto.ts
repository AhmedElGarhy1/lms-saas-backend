import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: 'user-uuid', description: 'ID of the user to add' })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'Teacher',
    description:
      'Role name to assign to the user (e.g., Teacher, Student, Owner)',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    example: 'role-uuid',
    description: 'Role ID to assign to the user (alternative to role name)',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;
}
