import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class RestoreUserResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}
