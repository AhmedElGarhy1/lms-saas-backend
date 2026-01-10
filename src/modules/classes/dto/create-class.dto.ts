import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsNumber,
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
import { BelongsToCenter, IsUserProfile } from '@/shared/common/decorators';
import { IsoUtcDate } from '@/shared/common/decorators/is-iso-datetime.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Level } from '@/modules/levels/entities/level.entity';
import { Subject } from '@/modules/subjects/entities/subject.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';

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
  @IsUserProfile(ProfileType.TEACHER)
  teacherUserProfileId: string;

  @ApiProperty({
    description: 'Branch ID (optional, defaults to actor\'s branch)',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  branchId?: string;

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
    description:
      'Class start date (ISO 8601 format with timezone, e.g., 2024-01-01T00:00:00+02:00)',
    example: '2024-01-01T00:00:00+02:00',
    type: Date,
  })
  @IsoUtcDate()
  startDate: Date;

  @ApiProperty({
    description:
      'Class end date (optional, ISO 8601 format with timezone, e.g., 2024-12-31T23:59:59+02:00)',
    example: '2024-12-31T23:59:59+02:00',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsoUtcDate()
  @Validate((object: CreateClassDto, value: Date) => {
    // If endDate is not provided, validation passes (it's optional)
    if (!value) return true;

    // If startDate is not provided, we can't compare
    if (!object.startDate) return true;

    // endDate must be after startDate
    return value.getTime() > object.startDate.getTime();
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
