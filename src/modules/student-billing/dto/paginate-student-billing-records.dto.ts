import { IsOptional, IsEnum, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { StudentChargeType, StudentChargeStatus } from '../enums';
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
    description: 'Filter by charge status',
    enum: StudentChargeStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(StudentChargeStatus)
  status?: StudentChargeStatus;

  @ApiProperty({
    description: 'Filter by student user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId?: string;

  @ApiProperty({
    description: 'Filter by class ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiProperty({
    description: 'Filter by branch ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
