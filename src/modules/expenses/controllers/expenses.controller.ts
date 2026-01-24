import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { PaginateExpenseDto } from '../dto/paginate-expense.dto';
import { ExpenseResponseDto } from '../dto/expense-response.dto';
import { Expense } from '../entities/expense.entity';
import { Pagination } from '@/shared/common/types/pagination.types';
import { Transactional } from '@nestjs-cls/transactional';
import { SerializeOptions } from '@nestjs/common';

@Controller('expenses')
@ApiTags('Expenses')
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @ApiOperation({
    summary: 'Create expense',
    description:
      'Create a new expense and immediately create a CASH payment. The expense will be automatically paid from the branch cashbox.',
  })
  @ApiResponse({
    status: 201,
    description: 'Expense created and paid successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no center/branch access',
  })
  @Permissions(PERMISSIONS.EXPENSES.CREATE)
  @Transactional()
  @SerializeOptions({ type: ExpenseResponseDto })
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Expense>> {
    const expense = await this.expenseService.createExpense(dto, actor);
    return ControllerResponse.success(expense);
  }

  @Get()
  @ApiOperation({
    summary: 'List expenses',
    description:
      'Get paginated list of expenses with filtering by center, branch, status, category, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expenses retrieved successfully',
  })
  @Permissions(PERMISSIONS.EXPENSES.VIEW)
  @SerializeOptions({ type: ExpenseResponseDto })
  async listExpenses(
    @Query() query: PaginateExpenseDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<Expense>>> {
    const result = await this.expenseService.getExpensesPaginated(query, actor);
    return ControllerResponse.success(result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get expense details',
    description: 'Get detailed information about a specific expense.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense details retrieved successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Expense not found or not accessible',
  })
  @Permissions(PERMISSIONS.EXPENSES.VIEW)
  @SerializeOptions({ type: ExpenseResponseDto })
  async getExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Expense>> {
    const expense = await this.expenseService.getExpense(id, actor);
    return ControllerResponse.success(expense);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update expense',
    description:
      'Update expense (title, description, category). Cannot update amount or branchId after payment is created.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense updated successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or expense is refunded',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no center access',
  })
  @ApiResponse({
    status: 404,
    description: 'Expense not found',
  })
  @Permissions(PERMISSIONS.EXPENSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ExpenseResponseDto })
  async updateExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Expense>> {
    const expense = await this.expenseService.updateExpense(id, dto, actor);
    return ControllerResponse.success(expense);
  }

  @Post(':id/refund')
  @ApiOperation({
    summary: 'Refund expense',
    description:
      'Refund an expense payment. This reverses the cash transaction and credits the amount back to the branch cashbox.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense refunded successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Expense is already refunded or not paid',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or no center access',
  })
  @ApiResponse({
    status: 404,
    description: 'Expense not found',
  })
  @Permissions(PERMISSIONS.EXPENSES.REFUND)
  @Transactional()
  @SerializeOptions({ type: ExpenseResponseDto })
  async refundExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Expense>> {
    const expense = await this.expenseService.refundExpense(id, actor);
    return ControllerResponse.success(expense);
  }
}
