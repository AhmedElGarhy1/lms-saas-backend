import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { ClassStatus } from '../enums/class-status.enum';
import { StudentPaymentType } from '../enums/student-payment-type.enum';
import { Transform } from 'class-transformer';

export class PaginateClassesDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  branchId?: string;

  @ApiProperty({
    description: 'Filter by level ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  levelId?: string;

  @ApiProperty({
    description: 'Filter by subject ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  subjectId?: string;

  @ApiProperty({
    description: 'Filter by teacher user profile ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @IsUserProfile(ProfileType.TEACHER)
  teacherUserProfileId?: string;

  @ApiProperty({
    description: 'Filter by class status',
    enum: ClassStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiProperty({
    description: 'Filter classes by student payment type',
    enum: StudentPaymentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(StudentPaymentType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value as StudentPaymentType;
  })
  studentPaymentType?: StudentPaymentType;
}
