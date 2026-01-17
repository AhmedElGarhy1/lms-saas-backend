import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginateTransactionDto } from './paginate-transaction.dto';

export class CenterStatementQueryDto extends PaginateTransactionDto {
  @ApiPropertyOptional({
    description: 'Filter by specific branch ID within the center',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
