import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsOptional()
  centerId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
