import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { StudentChargeType } from '../enums';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class PaginateStudentBillingRecordsDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by charge type',
    enum: StudentChargeType,
    required: false,
  })
  @IsOptional()
  @IsEnum(StudentChargeType)
  chargeType?: StudentChargeType;

  @ApiProperty({
    description: 'Filter by student user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId?: string;
}
