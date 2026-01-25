import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { TransactionType } from '../enums/transaction-type.enum';

export class PaginateTransactionDto extends BasePaginationDto {
  @ApiProperty({
    description: 'Filter by transaction type',
    enum: TransactionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
