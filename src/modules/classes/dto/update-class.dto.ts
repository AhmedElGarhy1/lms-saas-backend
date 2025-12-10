import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(
  OmitType(CreateClassDto, [
    'levelId',
    'subjectId',
    'branchId',
    'teacherUserProfileId',
  ] as const),
) {}
