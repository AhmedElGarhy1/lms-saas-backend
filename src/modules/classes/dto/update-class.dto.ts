import { PartialType, OmitType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(
  OmitType(CreateClassDto, [
    'levelId',
    'subjectId',
    'branchId',
    'teacherUserProfileId',
    'studentPaymentStrategy',
    'teacherPaymentStrategy',
  ] as const),
) {
  @ApiPropertyOptional({
    description: 'Skip student conflict warnings. If true, student schedule conflicts will be ignored and operation will proceed.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipWarning?: boolean;
}
