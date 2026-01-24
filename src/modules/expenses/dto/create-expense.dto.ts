import {
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../enums/expense-category.enum';
import { Exists } from '@/shared/common/decorators/exists.decorator';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { Center } from '@/modules/centers/entities/center.entity';

export class CreateExpenseDto {
  @ApiPropertyOptional({
    description: 'Center ID (optional, from context)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID(4)
  @Exists(Center)
  centerId?: string;

  @ApiProperty({
    description:
      'Branch ID (required - determines which cashbox to debit from)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID(4)
  @Exists(Branch)
  branchId: string;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.SUPPLIES,
  })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({
    description: 'Expense title',
    example: 'Office Supplies Purchase',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Expense description',
    example: 'Purchased office supplies for the month',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Expense amount',
    example: 150.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
