import { IsString } from 'class-validator';

export class AssignCenterDto {
  @IsString()
  centerId: string;

  @IsString()
  roleId: string;
}
