import { CreateUserWithRoleDto } from './create-user.dto';

/**
 * DTO for creating teachers
 * Extends CreateUserWithRoleDto with teacher-specific fields
 */
export class CreateTeacherDto extends CreateUserWithRoleDto {
  // Future teacher-specific fields will be added here
  // @ApiProperty({ description: 'Teacher subject specialization' })
  // @IsOptional()
  // @IsString()
  // subject?: string;
  // @ApiProperty({ description: 'Teacher experience years' })
  // @IsOptional()
  // @IsNumber()
  // experienceYears?: number;
  // @ApiProperty({ description: 'Teacher qualification' })
  // @IsOptional()
  // @IsString()
  // qualification?: string;
}
