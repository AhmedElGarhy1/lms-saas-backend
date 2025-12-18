import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherPaymentStrategyDto } from './teacher-payment-strategy.dto';
import { StudentPaymentStrategyDto } from './student-payment-strategy.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
import { HasBranchAccess } from '@/shared/common/decorators/has-branch-access.decorator';
import { HasCenterAccess } from '@/shared/common/decorators/has-center-access.decorator';
import { IsProfileType } from '@/shared/common/decorators/is-profile-type.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Level } from '@/modules/levels/entities/level.entity';
import { Subject } from '@/modules/subjects/entities/subject.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';

export class CreateClassDto {
  @ApiProperty({
    description: 'Class name (optional)',
    example: 'Math Primary 3',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Level ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToCenter(Level)
  levelId: string;

  @ApiProperty({
    description: 'Subject ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToCenter(Subject)
  subjectId: string;

  @ApiProperty({
    description: 'Teacher user profile ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @Exists(UserProfile)
  @HasCenterAccess()
  @IsProfileType(ProfileType.TEACHER)
  teacherUserProfileId: string;

  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToCenter(Branch)
  @HasBranchAccess()
  branchId: string;

  @ApiProperty({
    description: 'Student payment strategy',
    type: StudentPaymentStrategyDto,
  })
  @ValidateNested()
  @Type(() => StudentPaymentStrategyDto)
  studentPaymentStrategy: StudentPaymentStrategyDto;

  @ApiProperty({
    description: 'Teacher payment strategy',
    type: TeacherPaymentStrategyDto,
  })
  @ValidateNested()
  @Type(() => TeacherPaymentStrategyDto)
  teacherPaymentStrategy: TeacherPaymentStrategyDto;

  @ApiProperty({
    description: 'Class start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  startDate: Date = new Date();

  @ApiProperty({
    description: 'Class end date (optional)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate((object: CreateClassDto, value: Date) => {
    // If endDate is not provided, validation passes (it's optional)
    if (!value) return true;

    // If startDate is not provided, we can't compare
    if (!object.startDate) return true;

    // endDate must be after startDate
    return new Date(value) > new Date(object.startDate);
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Class duration in minutes',
    example: 60,
    minimum: 10,
    maximum: 24 * 60,
  })
  @IsInt()
  @Min(10)
  @Max(24 * 60) // 24 hours maximum
  duration: number;
}
