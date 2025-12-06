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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherPaymentStrategyDto } from './teacher-payment-strategy.dto';
import { StudentPaymentStrategyDto } from './student-payment-strategy.dto';

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
  levelId: string;

  @ApiProperty({
    description: 'Subject ID',
    example: 'uuid',
  })
  @IsUUID(4)
  subjectId: string;

  @ApiProperty({
    description: 'Teacher user profile ID',
    example: 'uuid',
  })
  @IsUUID(4)
  teacherUserProfileId: string;

  @ApiProperty({
    description: 'Branch ID',
    example: 'uuid',
  })
  @IsUUID(4)
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
  endDate?: Date;

  @ApiProperty({
    description: 'Class duration in minutes',
    example: 60,
    minimum: 1,
    maximum: 1440,
  })
  @IsInt()
  @Min(1)
  @Max(1440) // 24 hours maximum
  duration: number;
}
