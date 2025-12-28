import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch } from '@/shared/common/decorators/belongs-to-branch.decorator';
import { Enrollment } from '../entities/enrollment.entity';

export class EnrollmentIdParamDto {
  @ApiProperty({
    description: 'Enrollment ID',
    example: 'uuid',
  })
  @IsUUID()
  @BelongsToBranch(Enrollment)
  enrollmentId: string;
}
