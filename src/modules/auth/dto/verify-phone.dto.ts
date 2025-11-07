import { IsUUID, IsString, IsOptional } from 'class-validator';

export class VerifyPhoneRequestDto {
  @IsString()
  code: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
