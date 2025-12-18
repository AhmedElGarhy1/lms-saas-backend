import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { HasBranchAccessViaResource } from '@/shared/common/decorators/has-branch-access-via-resource.decorator';
import { Class } from '../entities/class.entity';

export class ClassIdParamDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'uuid',
  })
  @IsUUID()
  @HasBranchAccessViaResource(Class)
  classId: string;
}
