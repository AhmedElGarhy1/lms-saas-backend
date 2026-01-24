import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../enums/expense-category.enum';

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.SUPPLIES,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    description: 'Expense title',
    example: 'Office Supplies Purchase',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Expense description',
    example: 'Purchased office supplies for the month',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
