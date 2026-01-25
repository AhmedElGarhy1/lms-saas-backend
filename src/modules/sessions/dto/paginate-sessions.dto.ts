import {
  IsOptional,
  IsEnum,
  IsUUID,
  Validate,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import {
  BelongsToBranch,
  BelongsToCenter,
  IsUserProfile,
} from '@/shared/common/decorators';
import { IsoUtcDate } from '@/shared/common/decorators/is-iso-datetime.decorator';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Group } from '@/modules/classes/entities/group.entity';
import { Class } from '@/modules/classes/entities/class.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { SessionStatus } from '../enums/session-status.enum';
import { StudentPaymentType } from '@/modules/classes/enums/student-payment-type.enum';

/**
 * Custom validator to ensure dateTo is not in the future (for sessions pagination)
 * Validates at the property level
 */
function IsDateToNotInFuture(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateToNotInFuture',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // dateTo must be less than or equal to current time
          const now = new Date();
          return value.getTime() <= now.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          return '"dateTo" must not be in the future';
        },
      },
    });
  };
}

export class PaginateSessionsDto extends BasePaginationDto {
  // Override dateTo to add additional validation for sessions (no future dates)
  @ApiProperty({
    description:
      'Filter to date (ISO 8601 format with timezone, e.g., 2024-01-31T23:59:59+02:00). Must not be in the future for sessions.',
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsoUtcDate()
  @Validate(IsDateToNotInFuture, {
    message: '"dateTo" must not be in the future',
  })
  declare dateTo?: Date;

  @ApiProperty({
    description: 'Filter by group ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Group)
  groupId?: string;

  @ApiProperty({
    description: 'Filter by class ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToBranch(Class)
  classId?: string;

  @ApiProperty({
    description: 'Filter by branch ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @BelongsToCenter(Branch)
  branchId?: string;

  @ApiProperty({
    description: 'Filter by teacher user profile ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @IsUserProfile(ProfileType.TEACHER)
  teacherUserProfileId?: string;

  @ApiProperty({
    description: 'Filter by student user profile ID',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  @IsUserProfile(ProfileType.STUDENT)
  studentUserProfileId?: string;

  @ApiProperty({
    description: 'Filter by session status',
    enum: SessionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiProperty({
    description: 'Filter sessions by the student payment type of their class',
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
