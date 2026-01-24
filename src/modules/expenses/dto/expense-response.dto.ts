import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExpenseStatus } from '../enums/expense-status.enum';
import { ExpenseCategory } from '../enums/expense-category.enum';

class OptimizedEntityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class OptimizedBranchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  city: string;
}

class OptimizedUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class OptimizedCreatorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user: OptimizedUserDto;
}

class OptimizedUpdaterDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user: OptimizedUserDto;
}

export class ExpenseResponseDto {
  @ApiProperty({ description: 'Expense ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Center ID' })
  @Expose()
  centerId: string;

  @ApiProperty({ description: 'Branch ID' })
  @Expose()
  branchId: string;

  @ApiProperty({ description: 'Expense category', enum: ExpenseCategory })
  @Expose()
  category: ExpenseCategory;

  @ApiProperty({ description: 'Expense title' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Expense description', required: false })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Expense amount', example: '150.50' })
  @Expose()
  amount: string;

  @ApiProperty({ description: 'Expense status', enum: ExpenseStatus })
  @Expose()
  status: ExpenseStatus;

  @ApiProperty({ description: 'Payment ID' })
  @Expose()
  paymentId: string;

  @ApiProperty({ description: 'Paid at timestamp' })
  @Expose()
  @Type(() => Date)
  paidAt: Date;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user profile ID' })
  @Expose()
  createdByProfileId: string;

  @ApiProperty({ description: 'Updated by user profile ID', required: false })
  @Expose()
  updatedByProfileId?: string;

  @ApiProperty({
    description: 'Center entity (optimized)',
    type: OptimizedEntityDto,
    required: false,
  })
  @Expose()
  center?: OptimizedEntityDto;

  @ApiProperty({
    description: 'Branch entity (optimized)',
    type: OptimizedBranchDto,
  })
  @Expose()
  branch: OptimizedBranchDto;

  @ApiProperty({
    description: 'Creator (optimized)',
    type: OptimizedCreatorDto,
    required: false,
  })
  @Expose()
  creator?: OptimizedCreatorDto;

  @ApiProperty({
    description: 'Updater (optimized)',
    type: OptimizedUpdaterDto,
    required: false,
  })
  @Expose()
  updater?: OptimizedUpdaterDto;
}
