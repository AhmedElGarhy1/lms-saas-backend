import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AbsenteePolicy } from '../enums/absentee-policy.enum';

export class UpdateAbsenteePolicyDto {
  @ApiProperty({
    description: 'Absentee payment policy for the class',
    example: AbsenteePolicy.FLEXIBLE,
    enum: AbsenteePolicy,
  })
  @IsEnum(AbsenteePolicy)
  absenteePolicy: AbsenteePolicy;
}
