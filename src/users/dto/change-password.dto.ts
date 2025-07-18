import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'oldpassword' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password (min 6 chars)',
    example: 'newpassword123',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
