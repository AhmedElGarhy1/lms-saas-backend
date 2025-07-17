import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignPermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  centerId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
