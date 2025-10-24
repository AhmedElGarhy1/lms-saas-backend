import { CreateUserWithRoleDto } from './create-user.dto';

/**
 * DTO for creating students
 * Extends CreateUserWithRoleDto with student-specific fields
 */
export class CreateStudentDto extends CreateUserWithRoleDto {
  // Future student-specific fields will be added here
  // @ApiProperty({ description: 'Student grade level' })
  // @IsOptional()
  // @IsString()
  // gradeLevel?: string;
  // @ApiProperty({ description: 'Student parent/guardian info' })
  // @IsOptional()
  // @IsString()
  // guardianInfo?: string;
  // @ApiProperty({ description: 'Student enrollment date' })
  // @IsOptional()
  // @IsDateString()
  // enrollmentDate?: string;
}
