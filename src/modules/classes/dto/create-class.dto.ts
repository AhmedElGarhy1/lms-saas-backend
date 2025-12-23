import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  Validate,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherPaymentStrategyDto } from './teacher-payment-strategy.dto';
import { StudentPaymentStrategyDto } from './student-payment-strategy.dto';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { BelongsToCenter } from '@/shared/common/decorators/belongs-to-center.decorator';
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
  @IsProfileType(ProfileType.TEACHER)
  teacherUserProfileId: string;

  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
  })
  @IsUUID(4)
  @BelongsToCenter(Branch)
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
    description: 'Class start date (YYYY-MM-DD format, interpreted as midnight in center timezone)',
    example: '2024-01-01',
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate: string;

  @ApiProperty({
    description: 'Class end date (optional, YYYY-MM-DD format, interpreted as midnight in center timezone)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  @Validate((object: CreateClassDto, value: string) => {
    // If endDate is not provided, validation passes (it's optional)
    if (!value) return true;

    // If startDate is not provided, we can't compare
    if (!object.startDate) return true;

    // endDate must be after startDate
    return value > object.startDate;
  })
  endDate?: string;

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
