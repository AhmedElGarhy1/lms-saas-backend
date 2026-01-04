import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { StudentBillingType } from '../entities/student-billing-record.entity';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class PaginateStudentBillingRecordsDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by billing record type',
    enum: StudentBillingType,
    required: false,
  })
  @IsOptional()
  @IsEnum(StudentBillingType)
  type?: StudentBillingType;

  @ApiProperty({
    description: 'Filter by student user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId?: string;
}
