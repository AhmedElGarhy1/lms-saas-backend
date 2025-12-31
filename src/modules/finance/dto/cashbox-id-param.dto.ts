import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { BelongsToBranch, Exists } from '@/shared/common/decorators';
import { Cashbox } from '../entities/cashbox.entity';

export class CashboxIdParamDto {
  @ApiProperty({
    description: 'Cashbox ID',
    example: 'uuid',
  })
  @IsUUID()
  @Exists(Cashbox)
  @BelongsToBranch(Cashbox)
  id: string;
}
