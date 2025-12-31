import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { BillingRecordType } from '../entities/student-billing-record.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { Exists } from '@/shared/common/decorators';

export class PaginateStudentBillingRecordsDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by billing record type',
    enum: BillingRecordType,
    required: false,
  })
  @IsOptional()
  @IsEnum(BillingRecordType)
  type?: BillingRecordType;

  @ApiProperty({
    description: 'Filter by student user profile ID',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Exists(UserProfile)
  studentUserProfileId?: string;
}
