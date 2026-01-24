import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseRepository } from './repositories/expense.repository';
import { ExpenseService } from './services/expense.service';
import { ExpensesController } from './controllers/expenses.controller';
import { FinanceModule } from '../finance/finance.module';
import { CentersModule } from '../centers/centers.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    FinanceModule,
    CentersModule,
    AccessControlModule,
    SharedModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpenseRepository, ExpenseService],
  exports: [ExpenseService, ExpenseRepository],
})
export class ExpensesModule {}
