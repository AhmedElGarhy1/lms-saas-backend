import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Exists } from '@/shared/common/decorators';
import { StudentSessionCharge } from '../entities/student-session-charge.entity';

export class ChargeIdParamDto {
  @ApiProperty({
    description: 'Session charge ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(StudentSessionCharge)
  chargeId: string;
}
