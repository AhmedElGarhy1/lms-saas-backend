import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUserRequestDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  centerId?: string;
}
