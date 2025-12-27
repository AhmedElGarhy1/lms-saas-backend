import { Module } from '@nestjs/common';
import { DatabaseSeeder } from './seeder';
import { DatabaseModule } from '@/shared/modules/database/database.module';
import { FinanceModule } from '@/modules/finance/finance.module';

@Module({
  imports: [DatabaseModule, FinanceModule],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
