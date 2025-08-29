import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantAdminCenterAccessRequestDto {
  @ApiProperty({ description: 'Admin user ID' })
  @IsString()
  adminUserId: string;

  @ApiProperty({ description: 'Center ID' })
  @IsString()
  centerId: string;

  @ApiProperty({ description: 'Permission IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];

  @ApiProperty({ description: 'Granted by user ID' })
  @IsString()
  grantedBy: string;
}
