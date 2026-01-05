import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { PayoutStatus } from '../enums/payout-status.enum';
import { IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

export class PaginateTeacherPayoutsDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by teacher user profile ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @IsUserProfile(ProfileType.TEACHER)
  teacherUserProfileId?: string;

  @ApiProperty({
    description: 'Filter by class ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiProperty({
    description: 'Filter by payout status',
    enum: PayoutStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiProperty({
    description: 'Filter by unit type',
    enum: TeacherPaymentUnit,
    required: false,
  })
  @IsOptional()
  @IsEnum(TeacherPaymentUnit)
  unitType?: TeacherPaymentUnit;

}
