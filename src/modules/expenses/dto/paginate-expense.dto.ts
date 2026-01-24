import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BasePaginationDto } from '@/shared/common/dto/base-pagination.dto';
import { ExpenseStatus } from '../enums/expense-status.enum';
import { ExpenseCategory } from '../enums/expense-category.enum';

export class PaginateExpenseDto extends BasePaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by branch ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter by expense status',
    enum: ExpenseStatus,
    example: ExpenseStatus.PAID,
  })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description: 'Filter by expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.SUPPLIES,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
